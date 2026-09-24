"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { CartLine, CheckoutState } from "@/features/pos/types";

type ValidLine = CartLine & { pricePerPack: Prisma.Decimal; pricePerUnit: Prisma.Decimal; packSize: number; label: string };

function decimal(value: unknown) {
    return new Prisma.Decimal(String(value));
}

function sameDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
    return left.toDecimalPlaces(2).equals(right.toDecimalPlaces(2));
}

export async function completeSale(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "pos:checkout")) return { error: "You are not allowed to complete sales." };
    if (!session.user.branchId) return { error: "Checkout is for branch staff." };
    const branchId = session.user.branchId;

    const requestId = String(formData.get("checkoutRequestId") ?? "").trim();
    if (!requestId) return { error: "A checkout request key is required." };
    const paymentMethod = String(formData.get("paymentMethod") ?? "");
    if (paymentMethod !== "CASH" && paymentMethod !== "MOBILE_MONEY") return { error: "Choose a valid payment method." };

    let submittedLines: CartLine[];
    try { submittedLines = JSON.parse(String(formData.get("cart") ?? "[]")); } catch { return { error: "Cart data was invalid." }; }
    const expectedTotal = decimal(formData.get("expectedTotal"));
    if (!Array.isArray(submittedLines) || !submittedLines.length || !expectedTotal.greaterThanOrEqualTo(0)) return { error: "Add an item before checkout." };

    try {
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.sale.findUnique({ where: { soldById_checkoutRequestId: { soldById: session.user.id, checkoutRequestId: requestId } }, include: { items: { include: { variant: { include: { ingredient: true } } } } } });
            if (existing) return { kind: "existing" as const, existing };

            const variantIds = Array.from(new Set(submittedLines.map((line) => line.variantId)));
            const variants = await tx.variant.findMany({ where: { id: { in: variantIds } }, select: { id: true, packSize: true, allowsLooseSale: true, brandName: true, strength: true, ingredient: { select: { name: true } }, branchPrices: { where: { branchId }, select: { pricePerPack: true, pricePerUnit: true } } } });
            const byId = new Map(variants.map((variant) => [variant.id, variant]));
            for (const line of submittedLines) {
                if (!Number.isInteger(line.quantity) || line.quantity < 1 || (line.mode !== "PACK" && line.mode !== "UNIT")) throw new Error("Cart quantity was invalid.");
                const variant = byId.get(line.variantId);
                if (!variant || !variant.branchPrices[0] || (line.mode === "UNIT" && !variant.allowsLooseSale)) throw new Error("One or more products are unavailable.");
            }
            const validLines: ValidLine[] = submittedLines.map((line) => { const variant = byId.get(line.variantId)!; const price = variant.branchPrices[0]!; return { ...line, pricePerPack: price.pricePerPack, pricePerUnit: price.pricePerUnit, packSize: variant.packSize, label: `${variant.ingredient.name} · ${variant.brandName}${variant.strength ? ` ${variant.strength}` : ""}` }; });
            const lineTotals = validLines.map((line) => line.mode === "PACK" ? decimal(line.quantity).times(line.pricePerPack) : decimal(line.quantity).times(line.pricePerUnit));
            const total = lineTotals.reduce((sum, lineTotal) => sum.plus(lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2);
            if (!sameDecimal(total, expectedTotal)) throw new Error("Prices changed, review cart");

            const lockedBatches = await tx.$queryRaw<Array<{ id: string; variantId: string; quantityRemaining: number; expiryDate: Date }>>(Prisma.sql`SELECT "id", "variantId", "quantityRemaining", "expiryDate" FROM "Batch" WHERE "branchId" = ${branchId} AND "variantId" IN (${Prisma.join(variantIds)}) AND "quantityRemaining" > 0 AND "expiryDate" >= CURRENT_DATE ORDER BY "variantId" ASC, "expiryDate" ASC, "id" ASC FOR UPDATE`);
            const committedDuringLock = await tx.sale.findUnique({ where: { soldById_checkoutRequestId: { soldById: session.user.id, checkoutRequestId: requestId } }, include: { items: { include: { variant: { include: { ingredient: true } } } } } });
            if (committedDuringLock) return { kind: "existing" as const, existing: committedDuringLock };
            const demand = new Map<string, number>();
            for (const line of validLines) demand.set(line.variantId, (demand.get(line.variantId) ?? 0) + (line.mode === "PACK" ? line.quantity * line.packSize : line.quantity));
            const allocations = new Map<string, Array<{ batchId: string; units: number }>>();
            for (const variantId of variantIds) {
                let remaining = demand.get(variantId) ?? 0;
                for (const batch of lockedBatches.filter((item) => item.variantId === variantId)) { if (!remaining) break; const units = Math.min(remaining, batch.quantityRemaining); allocations.set(variantId, [...(allocations.get(variantId) ?? []), { batchId: batch.id, units }]); remaining -= units; await tx.batch.update({ where: { id: batch.id }, data: { quantityRemaining: { decrement: units } } }); }
                if (remaining) throw new Error("Insufficient non-expired stock.");
            }

            const sale = await tx.sale.create({ data: { branchId, soldById: session.user.id, checkoutRequestId: requestId, paymentMethod: paymentMethod as "CASH" | "MOBILE_MONEY", totalAmount: total } });
            const saleItems: Array<{ variantId: string; batchId: string; saleMode: "PACK" | "UNIT"; quantityUnits: number; unitPriceAtSale: Prisma.Decimal; subtotal: Prisma.Decimal }> = [];
            const allocationCursor = new Map<string, number>();
            validLines.forEach((line, lineIndex) => {
                let lineRemaining = line.mode === "PACK" ? line.quantity * line.packSize : line.quantity;
                let lineSubtotal = new Prisma.Decimal(0);
                const lineTotal = lineTotals[lineIndex];
                const unitPrice = lineTotal.div(lineRemaining);
                const chunks = allocations.get(line.variantId) ?? [];
                let cursor = allocationCursor.get(line.variantId) ?? 0;
                while (lineRemaining > 0 && cursor < chunks.length) {
                    const chunk = chunks[cursor];
                    const units = Math.min(lineRemaining, chunk.units);
                    const isLast = units === lineRemaining;
                    const subtotal = isLast ? lineTotal.minus(lineSubtotal) : unitPrice.times(units).toDecimalPlaces(2);
                    saleItems.push({ variantId: line.variantId, batchId: chunk.batchId, saleMode: line.mode, quantityUnits: units, unitPriceAtSale: unitPrice, subtotal });
                    lineSubtotal = lineSubtotal.plus(subtotal);
                    lineRemaining -= units;
                    chunk.units -= units;
                    if (chunk.units === 0) cursor += 1;
                }
                allocationCursor.set(line.variantId, cursor);
                if (lineRemaining > 0) throw new Error("Insufficient non-expired stock.");
            });
            await tx.saleItem.createMany({ data: saleItems.map((item) => ({ ...item, saleId: sale.id })) });
            await tx.auditLog.create({ data: { action: "SALE_COMPLETED", branchId, userId: session.user.id, saleId: sale.id, details: { paymentMethod, totalAmount: total.toString(), itemCount: saleItems.length } } });
            return { sale, saleItems, validLines, lineTotals };
        }, { timeout: 15000 });
        if ("kind" in result && result.kind === "existing") return { receipt: { saleId: result.existing.id, totalAmount: result.existing.totalAmount.toString(), paymentMethod: result.existing.paymentMethod, items: result.existing.items.map((item) => ({ label: `${item.variant.ingredient.name} · ${item.variant.brandName}`, quantity: item.quantityUnits, mode: item.saleMode ?? "UNIT", subtotal: item.subtotal.toString() })) } };
        revalidatePath("/pos");
        return { receipt: { saleId: result.sale.id, totalAmount: result.sale.totalAmount.toString(), paymentMethod: result.sale.paymentMethod, items: result.saleItems.map((item) => ({ label: result.validLines.find((line) => line.variantId === item.variantId)?.label ?? item.variantId, quantity: item.quantityUnits, mode: item.saleMode, subtotal: item.subtotal.toString() })) } };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { const existing = await prisma.sale.findUnique({ where: { soldById_checkoutRequestId: { soldById: session.user.id, checkoutRequestId: requestId } }, include: { items: { include: { variant: { include: { ingredient: true } } } } } }); if (existing) return { receipt: { saleId: existing.id, totalAmount: existing.totalAmount.toString(), paymentMethod: existing.paymentMethod, items: existing.items.map((item) => ({ label: `${item.variant.ingredient.name} · ${item.variant.brandName}`, quantity: item.quantityUnits, mode: item.saleMode ?? "UNIT", subtotal: item.subtotal.toString() })) } }; }
        return { error: error instanceof Error ? error.message : "Checkout could not be completed." };
    }
}