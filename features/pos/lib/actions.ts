"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkoutInTransaction } from "@/features/pos/lib/checkout-core";
import type { CartLine, CheckoutState } from "@/features/pos/types";

function decimal(value: unknown) {
    try { return new Prisma.Decimal(String(value)); } catch { return null; }
}

function receiptFromExisting(existing: any): CheckoutState {
    return { receipt: { saleId: existing.id, totalAmount: existing.totalAmount.toString(), paymentMethod: existing.paymentMethod, items: existing.items.map((item: any) => ({ label: `${item.variant.ingredient.name} · ${item.variant.brandName}`, quantity: item.quantityUnits, mode: item.saleMode ?? "UNIT", subtotal: item.subtotal.toString() })) } };
}

export async function completeSale(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "pos:checkout")) return { error: "You are not allowed to complete sales." };
    if (!session.user.branchId) return { error: "Checkout is for branch staff." };
    const requestId = String(formData.get("checkoutRequestId") ?? "").trim();
    if (!requestId) return { error: "A checkout request key is required." };
    const paymentMethod = String(formData.get("paymentMethod") ?? "");
    if (paymentMethod !== "CASH" && paymentMethod !== "MOBILE_MONEY") return { error: "Choose a valid payment method." };
    let lines: CartLine[];
    try { lines = JSON.parse(String(formData.get("cart") ?? "[]")); } catch { return { error: "Cart data was invalid." }; }
    const expectedTotal = decimal(formData.get("expectedTotal"));
    if (!Array.isArray(lines) || !lines.length || !expectedTotal || expectedTotal.isNegative()) return { error: "Add an item before checkout." };
    const startedAt = performance.now();
    try {
        const result = await prisma.$transaction((tx) => checkoutInTransaction(tx, { branchId: session.user.branchId!, soldById: session.user.id, requestId, paymentMethod: paymentMethod as "CASH" | "MOBILE_MONEY", lines, expectedTotal }), { maxWait: 15000, timeout: 15000 });
        console.info(`[pos] checkout transaction ${(performance.now() - startedAt).toFixed(1)}ms`);
        if ("existing" in result) return receiptFromExisting(result.existing);
        revalidatePath("/pos");
        return { receipt: { saleId: result.sale.id, totalAmount: result.sale.totalAmount.toString(), paymentMethod: result.sale.paymentMethod, items: result.saleItems.map((item) => ({ label: result.labels.get(item.variantId) ?? item.variantId, quantity: item.quantityUnits, mode: item.saleMode, subtotal: item.subtotal.toString() })) } };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const existing = await prisma.sale.findUnique({ where: { soldById_checkoutRequestId: { soldById: session.user.id, checkoutRequestId: requestId } }, include: { items: { include: { variant: { include: { ingredient: true } } } } } });
            if (existing) return receiptFromExisting(existing);
        }
        return { error: error instanceof Error ? error.message : "Checkout could not be completed." };
    }
}
