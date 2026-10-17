import { Prisma } from "@prisma/client";
import { getMalawiDateKey } from "../../../lib/timezone.ts";
import { membershipDiscountPercent } from "../../membership/lib/policy.ts";

type Transaction = Prisma.TransactionClient;

export type CheckoutLine = {
    variantId: string;
    mode: "PACK" | "UNIT";
    quantity: number;
};

export type CheckoutInput = {
    branchId: string;
    soldById: string;
    requestId?: string;
    paymentMethod: "CASH" | "MOBILE_MONEY";
    lines: CheckoutLine[];
    expectedTotal: Prisma.Decimal;
    membershipApplicationId: string | null;
};

export type CheckoutResult = {
    sale: { id: string; subtotalAmount: Prisma.Decimal; discountAmount: Prisma.Decimal; membershipDiscountPercent: Prisma.Decimal; totalAmount: Prisma.Decimal; paymentMethod: "CASH" | "MOBILE_MONEY" };
    saleItems: Array<{ variantId: string; batchId: string | null; unallocatedUnits: number; saleMode: "PACK" | "UNIT"; quantityUnits: number; subtotal: Prisma.Decimal }>;
    labels: Map<string, string>;
};

function sameDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
    return left.toDecimalPlaces(2).equals(right.toDecimalPlaces(2));
}

export async function checkoutInTransaction(tx: Transaction, input: CheckoutInput): Promise<CheckoutResult> {
    const variantIds = Array.from(new Set(input.lines.map((line) => line.variantId)));
    const variants = await tx.variant.findMany({
        where: { id: { in: variantIds } },
        select: {
            id: true,
            packSize: true,
            allowsLooseSale: true,
            brandName: true,
            strength: true,
            ingredient: { select: { name: true } },
            branchPrices: { where: { branchId: input.branchId }, select: { pricePerPack: true, pricePerUnit: true } },
        },
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));

    for (const line of input.lines) {
        const variant = byId.get(line.variantId);
        if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Cart quantity was invalid.");
        if (line.mode !== "PACK" && line.mode !== "UNIT") throw new Error("Cart mode was invalid.");
        if (!variant || !variant.branchPrices[0] || (line.mode === "UNIT" && !variant.allowsLooseSale)) throw new Error("One or more products are unavailable.");
    }

    const lineTotals = input.lines.map((line) => {
        const price = byId.get(line.variantId)!.branchPrices[0]!;
        return line.mode === "PACK"
            ? new Prisma.Decimal(line.quantity).times(price.pricePerPack)
            : new Prisma.Decimal(line.quantity).times(price.pricePerUnit);
    });
    const subtotal = lineTotals.reduce((sum, lineTotal) => sum.plus(lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2);
    if (!sameDecimal(subtotal, input.expectedTotal)) throw new Error("Prices changed, review cart");

    const membership = input.membershipApplicationId
        ? await tx.membershipApplication.findFirst({
            where: { id: input.membershipApplicationId, status: "ACTIVE", discountTier: { not: null } },
            select: { id: true, discountTier: true },
        })
        : null;
    if (input.membershipApplicationId && !membership) throw new Error("This membership is no longer active. Look it up again.");
    const discountPercent = membership?.discountTier ? membershipDiscountPercent[membership.discountTier] : 0;
    const membershipPercent = new Prisma.Decimal(discountPercent);
    const discountAmount = subtotal.times(membershipPercent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const total = subtotal.minus(discountAmount).toDecimalPlaces(2);

    const todayKey = getMalawiDateKey(new Date());
    const lockedBatches = await tx.$queryRaw<Array<{ id: string; variantId: string; quantityRemaining: number; expiryDate: Date }>>(
        Prisma.sql`SELECT "id", "variantId", "quantityRemaining", "expiryDate" FROM "Batch" WHERE "branchId" = ${input.branchId} AND "variantId" IN (${Prisma.join(variantIds)}) AND "quantityRemaining" > 0 ORDER BY "variantId" ASC, "expiryDate" ASC, "id" ASC FOR UPDATE`
    );
    const sellableBatches = lockedBatches.filter((batch) => getMalawiDateKey(new Date(batch.expiryDate)) >= todayKey);
    const demand = new Map<string, number>();
    for (const line of input.lines) {
        const unitsRequired = line.mode === "PACK" ? line.quantity * byId.get(line.variantId)!.packSize : line.quantity;
        demand.set(line.variantId, (demand.get(line.variantId) ?? 0) + unitsRequired);
    }

    const allocations = new Map<string, Array<{ batchId: string | null; units: number }>>();
    for (const variantId of variantIds) {
        let remaining = demand.get(variantId) ?? 0;
        for (const batch of sellableBatches.filter((item) => item.variantId === variantId)) {
            if (!remaining) break;
            const units = Math.min(remaining, batch.quantityRemaining);
            allocations.set(variantId, [...(allocations.get(variantId) ?? []), { batchId: batch.id, units }]);
            remaining -= units;
        }
        if (remaining) allocations.set(variantId, [...(allocations.get(variantId) ?? []), { batchId: null, units: remaining }]);
    }

    for (const chunks of Array.from(allocations.values())) {
        for (const chunk of chunks) {
            if (!chunk.batchId) continue;
            const updatedBatchCount = await tx.$executeRaw(
                Prisma.sql`UPDATE "Batch" SET "quantityRemaining" = "quantityRemaining" - ${chunk.units} WHERE "id" = ${chunk.batchId} AND "quantityRemaining" >= ${chunk.units}`
            );
            if (updatedBatchCount !== 1) {
                chunk.batchId = null;
            }
        }
    }

    const saleItems: CheckoutResult["saleItems"] = [];
    const labels = new Map<string, string>();
    const allocationCursor = new Map<string, number>();

    input.lines.forEach((line, lineIndex) => {
        const variant = byId.get(line.variantId)!;
        labels.set(line.variantId, `${variant.ingredient?.name ? `${variant.ingredient.name} · ` : ""}${variant.brandName}${variant.strength ? ` ${variant.strength}` : ""}`);

        let lineRemaining = line.mode === "PACK" ? line.quantity * variant.packSize : line.quantity;
        let lineSubtotal = new Prisma.Decimal(0);
        const lineTotal = lineTotals[lineIndex];
        const chunks = allocations.get(line.variantId) ?? [];
        let cursor = allocationCursor.get(line.variantId) ?? 0;

        while (lineRemaining > 0 && cursor < chunks.length) {
            const chunk = chunks[cursor];
            const units = Math.min(lineRemaining, chunk.units);
            const subtotal = units === lineRemaining ? lineTotal.minus(lineSubtotal) : lineTotal.div(lineRemaining).times(units).toDecimalPlaces(2);
            saleItems.push({ variantId: line.variantId, batchId: chunk.batchId, unallocatedUnits: chunk.batchId ? 0 : units, saleMode: line.mode, quantityUnits: units, subtotal });
            lineSubtotal = lineSubtotal.plus(subtotal);
            lineRemaining -= units;
            chunk.units -= units;
            if (chunk.units === 0) cursor += 1;
        }

        allocationCursor.set(line.variantId, cursor);
        if (lineRemaining > 0) {
            saleItems.push({
                variantId: line.variantId,
                batchId: null,
                unallocatedUnits: lineRemaining,
                saleMode: line.mode,
                quantityUnits: lineRemaining,
                subtotal: lineTotal.minus(lineSubtotal),
            });
        }
    });

    const sale = await tx.sale.create({
        data: {
            branchId: input.branchId,
            soldById: input.soldById,
            checkoutRequestId: input.requestId,
            paymentMethod: input.paymentMethod,
            subtotalAmount: subtotal,
            discountAmount,
            membershipDiscountPercent: membershipPercent,
            totalAmount: total,
            membershipApplicationId: membership?.id,
            items: {
                createMany: {
                    data: saleItems.map((item) => ({
                        variantId: item.variantId,
                        batchId: item.batchId,
                        unallocatedUnits: item.unallocatedUnits,
                        saleMode: item.saleMode,
                        quantityUnits: item.quantityUnits,
                        unitPriceAtSale: item.subtotal.div(item.quantityUnits),
                        subtotal: item.subtotal,
                    })),
                },
            },
            auditLogs: {
                create: {
                    action: "SALE_COMPLETED",
                    branchId: input.branchId,
                    userId: input.soldById,
                    details: {
                        paymentMethod: input.paymentMethod,
                        subtotalAmount: subtotal.toString(),
                        discountAmount: discountAmount.toString(),
                        membershipDiscountPercent: membershipPercent.toString(),
                        totalAmount: total.toString(),
                        membershipApplicationId: membership?.id ?? null,
                        itemCount: saleItems.length,
                    },
                },
            },
        },
    });

    return { sale, saleItems, labels };
}
