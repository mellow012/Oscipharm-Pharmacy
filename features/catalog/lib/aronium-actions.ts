"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateAroniumProductLink } from "@/features/catalog/lib/aronium-link-validation";
import type { AroniumLinkActionState } from "@/features/catalog/types";

export type StaffSession = {
    user: { id: string; role: "ADMIN" | "BRANCH_MANAGER" | "POS"; branchId: string | null };
};

function getText(formData: FormData, field: string) {
    return String(formData.get(field) ?? "");
}

export async function getAuthorizedBranchId(formData: FormData, session: StaffSession) {
    const branchId = session.user.role === "ADMIN" ? getText(formData, "branchId").trim() : session.user.branchId;
    if (!branchId) return null;
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    return branch?.id ?? null;
}

function uniqueConstraintMessage(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" ") : String(error.meta?.target ?? "");
    return target.includes("aroniumCode")
        ? "That Aronium product code is already linked."
        : "This variant already has an Aronium link for that mode.";
}

export async function createAroniumProductLink(
    _previousState: AroniumLinkActionState,
    formData: FormData,
): Promise<AroniumLinkActionState> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "catalog:manage")) return { error: "You are not allowed to manage Aronium product codes." };

    const branchId = await getAuthorizedBranchId(formData, session);
    if (!branchId) return { error: "Choose a valid branch for this catalog change." };

    const input = {
        aroniumCode: getText(formData, "aroniumCode"),
        variantId: getText(formData, "variantId").trim(),
        mode: getText(formData, "mode"),
    };
    const baseValidation = validateAroniumProductLink(input, true);
    if ("error" in baseValidation) return { error: baseValidation.error };

    const variant = await prisma.variant.findUnique({
        where: { id: baseValidation.data.variantId },
        select: { id: true, allowsLooseSale: true },
    });
    if (!variant) return { error: "Choose a valid product variant." };

    const [codeExists, variantModeExists] = await Promise.all([
        prisma.aroniumProductLink.findUnique({ where: { aroniumCode: baseValidation.data.aroniumCode }, select: { id: true } }),
        prisma.aroniumProductLink.findUnique({ where: { variantId_mode: { variantId: variant.id, mode: baseValidation.data.mode } }, select: { id: true } }),
    ]);
    const validation = validateAroniumProductLink(input, variant.allowsLooseSale, {
        aroniumCodeExists: Boolean(codeExists),
        variantModeExists: Boolean(variantModeExists),
    });
    if ("error" in validation) return { error: validation.error };

    try {
        await prisma.$transaction(async (tx) => {
            const link = await tx.aroniumProductLink.create({
                data: {
                    aroniumCode: validation.data.aroniumCode,
                    variantId: validation.data.variantId,
                    mode: validation.data.mode,
                    createdById: session.user.id,
                },
            });
            await tx.auditLog.create({
                data: {
                    action: "ARONIUM_LINK_CREATED",
                    branchId,
                    userId: session.user.id,
                    details: { linkId: link.id, variantId: link.variantId, aroniumCode: link.aroniumCode, mode: link.mode },
                },
            });
        });
    } catch (error) {
        const message = uniqueConstraintMessage(error);
        if (message) return { error: message };
        throw error;
    }

    revalidatePath("/staff/catalog");
    return { success: "Aronium product code linked." };
}

export async function deleteAroniumProductLink(
    _previousState: AroniumLinkActionState,
    formData: FormData,
): Promise<AroniumLinkActionState> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "catalog:manage")) return { error: "You are not allowed to manage Aronium product codes." };

    const branchId = await getAuthorizedBranchId(formData, session);
    if (!branchId) return { error: "Choose a valid branch for this catalog change." };

    const linkId = getText(formData, "linkId").trim();
    if (!linkId) return { error: "Choose an Aronium link to remove." };
    const link = await prisma.aroniumProductLink.findUnique({ where: { id: linkId } });
    if (!link) return { error: "This Aronium link no longer exists." };

    try {
        await prisma.$transaction(async (tx) => {
            await tx.aroniumProductLink.delete({ where: { id: link.id } });
            await tx.auditLog.create({
                data: {
                    action: "ARONIUM_LINK_DELETED",
                    branchId,
                    userId: session.user.id,
                    details: { linkId: link.id, variantId: link.variantId, aroniumCode: link.aroniumCode, mode: link.mode },
                },
            });
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return { error: "This Aronium link no longer exists." };
        }
        throw error;
    }

    revalidatePath("/staff/catalog");
    return { success: "Aronium product code removed." };
}