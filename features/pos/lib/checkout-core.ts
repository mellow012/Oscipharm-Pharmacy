import { Prisma } from "@prisma/client";
import type { CartLine } from "@/features/pos/types";

type Transaction = Prisma.TransactionClient;

export type CheckoutInput = {
    branchId: string;
    soldById: string;
    requestId: string;
    paymentMethod: "CASH" | "MOBILE_MONEY";
    lines: CartLine[];
    expectedTotal: Prisma.Decimal;
};

export type CheckoutResult = {
    sale: { id: string; totalAmount: Prisma.Decimal; paymentMethod: "CASH" | "MOBILE_MONEY" };
    saleItems: Array<{ variantId: string; batchId: string; saleMode: "PACK" | "UNIT"; quantityUnits: number; subtotal: Prisma.Decimal }>;
    labels: Map<string, string>;
};

function sameDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
    return left.toDecimalPlaces(2).equals(right.toDecimalPlaces(2));
}

export async function checkoutInTransaction(tx: Transaction, input: CheckoutInput): Promise<CheckoutResult | { existing: any }> {
    const existing = await tx.sale.findUnique({ where: { soldById_checkoutRequestId: { soldById: input.soldById, checkoutRequestId: input.requestId } }, include: { items: { include: { variant: { include: { ingredient: true } } } } } });
    if (existing) return { existing };

    const variantIds = Array.from(new Set(input.lines.map((line) => line.variantId)));
    const variants = await tx.variant.findMany({ where: { id: { in: variantIds } }, select: { id: true, packSize: true, allowsLooseSale: true, brandName: true, strength: true, ingredient: { select: { name: true } }, branchPrices: { where: { branchId: input.branchId }, select: { pricePerPack: true, pricePerUnit: true } } } });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    for (const line of input.lines) {
        const variant = byId.get(line.variantId);
        if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Cart quantity was invalid.");
        if (line.mode !== "PACK" && line.mode !== "UNIT") throw new Error("Cart mode was invalid.");
        if (!variant || !variant.branchPrices[0] || (line.mode === "UNIT" && !variant.allowsLooseSale)) throw new Error("One or more products are unavailable.");
    }

    const lineTotals = input.lines.map((line) => { const price = byId.get(line.variantId)!.branchPrices[0]!; return line.mode === "PACK" ? new Prisma.Decimal(line.quantity).times(price.pricePerPack) : new Prisma.Decimal(line.quantity).times(price.pricePerUnit); });
    const total = lineTotals.reduce((sum, lineTotal) => sum.plus(lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2);
    if (!sameDecimal(total, input.expectedTotal)) throw new Error("Prices changed, review cart");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lockedBatches = await tx.$queryRaw<Array<{ id: string; variantId: string; quantityRemaining: number }>>(Prisma.sql`SELECT "id", "variantId", "quantityRemaining" FROM "Batch" WHERE "branchId" = ${input.branchId} AND "variantId" IN (${Prisma.join(variantIds)}) AND "quantityRemaining" > 0 AND "expiryDate" >= ${today} ORDER BY "variantId" ASC, "expiryDate" ASC, "id" ASC FOR UPDATE`);
    const committedDuringLock = await tx.sale.findUnique({ where: { soldById_checkoutRequestId: { soldById: input.soldById, checkoutRequestId: input.requestId } }, include: { items: { include: { variant: { include: { ingredient: true } } } } } });
    if (committedDuringLock) return { existing: committedDuringLock };

    const demand = new Map<string, number>();
    for (const line of input.lines) demand.set(line.variantId, (demand.get(line.variantId) ?? 0) + (line.mode === "PACK" ? line.quantity * byId.get(line.variantId)!.packSize : line.quantity));
    const allocations = new Map<string, Array<{ batchId: string; units: number }>>();
    for (const variantId of variantIds) {
        let remaining = demand.get(variantId) ?? 0;
        for (const batch of lockedBatches.filter((item) => item.variantId === variantId)) { if (!remaining) break; const units = Math.min(remaining, batch.quantityRemaining); allocations.set(variantId, [...(allocations.get(variantId) ?? []), { batchId: batch.id, units }]); remaining -= units; }
        if (remaining) throw new Error("Insufficient non-expired stock.");
    }
    const deductionRows = Array.from(allocations.values()).flat();
    const updatedBatchCount = await tx.$executeRaw(Prisma.sql`UPDATE "Batch" AS batch SET "quantityRemaining" = batch."quantityRemaining" - changes.units FROM (VALUES ${Prisma.join(deductionRows.map((row) => Prisma.sql`(${row.batchId}, ${row.units})`))}) AS changes(id, units) WHERE batch."id" = changes.id AND batch."quantityRemaining" >= changes.units`);
    if (updatedBatchCount !== deductionRows.length) throw new Error("Insufficient non-expired stock.");

    const saleItems: CheckoutResult["saleItems"] = [];
    const labels = new Map<string, string>();
    const allocationCursor = new Map<string, number>();
    input.lines.forEach((line, lineIndex) => {
        const variant = byId.get(line.variantId)!;
        labels.set(line.variantId, `${variant.ingredient.name} · ${variant.brandName}${variant.strength ? ` ${variant.strength}` : ""}`);
        let lineRemaining = line.mode === "PACK" ? line.quantity * variant.packSize : line.quantity;
        let lineSubtotal = new Prisma.Decimal(0);
        const lineTotal = lineTotals[lineIndex];
        const unitPrice = lineTotal.div(lineRemaining).toDecimalPlaces(2);
        const chunks = allocations.get(line.variantId) ?? [];
        let cursor = allocationCursor.get(line.variantId) ?? 0;
        while (lineRemaining > 0 && cursor < chunks.length) { const chunk = chunks[cursor]; const units = Math.min(lineRemaining, chunk.units); const subtotal = units === lineRemaining ? lineTotal.minus(lineSubtotal) : unitPrice.times(units).toDecimalPlaces(2); saleItems.push({ variantId: line.variantId, batchId: chunk.batchId, saleMode: line.mode, quantityUnits: units, subtotal }); lineSubtotal = lineSubtotal.plus(subtotal); lineRemaining -= units; chunk.units -= units; if (!chunk.units) cursor += 1; }
        allocationCursor.set(line.variantId, cursor);
    });
    const sale = await tx.sale.create({
        data: {
            branchId: input.branchId,
            soldById: input.soldById,
            checkoutRequestId: input.requestId,
            paymentMethod: input.paymentMethod,
            totalAmount: total,
            items: { createMany: { data: saleItems.map((item) => ({ variantId: item.variantId, batchId: item.batchId, saleMode: item.saleMode, quantityUnits: item.quantityUnits, unitPriceAtSale: item.subtotal.div(item.quantityUnits), subtotal: item.subtotal })) } },
            auditLogs: { create: { action: "SALE_COMPLETED", branchId: input.branchId, userId: input.soldById, details: { paymentMethod: input.paymentMethod, totalAmount: total.toString(), itemCount: saleItems.length } } },
        },
    });
    return { sale, saleItems, labels };
}