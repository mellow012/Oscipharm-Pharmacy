"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isExpiredInMalawi } from "@/lib/timezone";
import type { ActionState } from "@/features/inventory/types";

function getText(formData: FormData, field: string) {
    return String(formData.get(field) ?? "").trim();
}

function resolveExpiry(value: string) {
    const expiryDate = new Date(`${value}T00:00:00`);
    return Number.isNaN(expiryDate.getTime()) ? null : expiryDate;
}

async function resolveBranch(formData: FormData, role: string, sessionBranchId: string | null) {
    const branchId = role === "ADMIN" ? getText(formData, "branchId") : sessionBranchId;
    if (!branchId) return null;
    return prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
}

export async function receiveBatch(_previousState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "stock:receive")) return { error: "You are not allowed to receive stock." };

    const branch = await resolveBranch(formData, session.user.role, session.user.branchId);
    if (!branch) return { error: "Choose a valid branch." };

    const variantId = getText(formData, "variantId");
    const quantityText = getText(formData, "quantityReceived");
    const expiryText = getText(formData, "expiryDate");
    const batchNumber = getText(formData, "batchNumber") || null;
    if (!/^\d+$/.test(quantityText) || Number(quantityText) < 1) return { error: "Quantity received must be a positive whole number." };

    const quantityReceived = Number(quantityText);
    const expiryDate = resolveExpiry(expiryText);
    if (!expiryDate || isExpiredInMalawi(expiryDate)) return { error: "Expiry date must be today or later." };

    const variant = await prisma.variant.findUnique({
        where: { id: variantId },
        select: { id: true, packSize: true, brandName: true, strength: true },
    });
    if (!variant) return { error: "Choose a valid product variant." };

    const quantityRemaining = quantityReceived * variant.packSize;
    await prisma.$transaction(async (tx) => {
        const batch = await tx.batch.create({
            data: { variantId, branchId: branch.id, batchNumber, quantityReceived, quantityRemaining, expiryDate, receivedById: session.user.id },
        });
        await tx.auditLog.create({
            data: {
                action: "STOCK_RECEIVED",
                branchId: branch.id,
                userId: session.user.id,
                details: { batchId: batch.id, variantId, batchNumber, quantityReceivedPacks: quantityReceived, quantityRemainingUnits: quantityRemaining, packSize: variant.packSize, expiryDate: expiryText },
            },
        });
    });

    revalidatePath("/inventory");
    return { success: `Received ${quantityReceived} pack${quantityReceived === 1 ? "" : "s"} of ${variant.brandName}.` };
}

export async function updateBranchPrice(_previousState: ActionState, formData: FormData): Promise<ActionState> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "price:set")) return { error: "You are not allowed to update pricing." };

    const branch = await resolveBranch(formData, session.user.role, session.user.branchId);
    if (!branch) return { error: "Choose a valid branch." };

    const variantId = getText(formData, "variantId");
    const packText = getText(formData, "pricePerPack");
    const unitText = getText(formData, "pricePerUnit");
    const thresholdText = getText(formData, "reorderThreshold");
    if (!/^\d+(\.\d{1,2})?$/.test(packText) || !/^\d+(\.\d{1,2})?$/.test(unitText)) return { error: "Prices must be valid non-negative amounts." };
    if (thresholdText && (!/^\d+$/.test(thresholdText) || Number(thresholdText) < 0)) return { error: "Reorder threshold must be a non-negative whole number." };

    const variant = await prisma.variant.findUnique({ where: { id: variantId }, select: { id: true, allowsLooseSale: true } });
    if (!variant) return { error: "Choose a valid product variant." };
    const pricePerPack = new Prisma.Decimal(packText);
    const pricePerUnit = variant.allowsLooseSale ? new Prisma.Decimal(unitText) : new Prisma.Decimal(0);
    const reorderThreshold = thresholdText ? Number(thresholdText) : null;
    const existing = await prisma.branchPrice.findUnique({ where: { variantId_branchId: { variantId, branchId: branch.id } } });
    const unchanged = existing
        && existing.pricePerPack.equals(pricePerPack)
        && existing.pricePerUnit.equals(pricePerUnit)
        && existing.reorderThreshold === reorderThreshold;
    if (unchanged) return { success: "No pricing changes were needed." };

    await prisma.$transaction(async (tx) => {
        await tx.branchPrice.upsert({
            where: { variantId_branchId: { variantId, branchId: branch.id } },
            create: { variantId, branchId: branch.id, pricePerPack, pricePerUnit, reorderThreshold, updatedById: session.user.id },
            update: { pricePerPack, pricePerUnit, reorderThreshold, updatedById: session.user.id },
        });
        await tx.auditLog.create({
            data: {
                action: "PRICE_CHANGED",
                branchId: branch.id,
                userId: session.user.id,
                details: { variantId, oldPricePerPack: existing?.pricePerPack.toString() ?? null, newPricePerPack: pricePerPack.toString(), oldPricePerUnit: existing?.pricePerUnit.toString() ?? null, newPricePerUnit: pricePerUnit.toString(), oldReorderThreshold: existing?.reorderThreshold ?? null, newReorderThreshold: reorderThreshold },
            },
        });
    });

    revalidatePath("/inventory");
    return { success: "Pricing updated." };
}