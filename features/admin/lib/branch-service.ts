import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.ts";
import { can } from "../../../lib/permissions.ts";

type BranchDb = PrismaClient | Prisma.TransactionClient;
type BranchSnapshot = { name: string; location: string | null; isActive: boolean };
type BranchResult<T = null> = { ok: true; message: string; branch?: T } | { ok: false; message: string };
type BranchInput = { name: unknown; location: unknown };

async function requireAdmin(db: BranchDb, actorId: string) {
    const actor = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, isActive: true } });
    return actor?.isActive && actor.role === "ADMIN" && can(actor.role, "branches:manage") ? actor : null;
}

function normalizeInput(input: BranchInput): { ok: true; name: string; location: string | null } | { ok: false; message: string } {
    if (typeof input.name !== "string" || !input.name.trim()) return { ok: false, message: "Branch name is required." };
    if (input.name.trim().length > 120) return { ok: false, message: "Branch name must be 120 characters or fewer." };
    if (input.location !== null && input.location !== undefined && typeof input.location !== "string") {
        return { ok: false, message: "Branch location must be text." };
    }
    const location = typeof input.location === "string" ? input.location.trim() || null : null;
    if (location && location.length > 240) return { ok: false, message: "Branch location must be 240 characters or fewer." };
    return { ok: true, name: input.name.trim(), location };
}

async function nameExists(db: BranchDb, name: string, exceptId?: string) {
    return Boolean(await db.branch.findFirst({
        where: {
            name: { equals: name, mode: "insensitive" },
            ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { id: true },
    }));
}

async function lockBranchManagement(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(74102, 2)`;
}

export async function createBranch(actorId: string, input: BranchInput): Promise<BranchResult<{ id: string; name: string; location: string | null; isActive: boolean }>> {
    const valid = normalizeInput(input);
    if (!valid.ok) return valid;
    try {
        return await prisma.$transaction(async (tx) => {
            await lockBranchManagement(tx);
            if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to manage branches." };
            if (await nameExists(tx, valid.name)) return { ok: false, message: "A branch with that name already exists." };
            const branch = await tx.branch.create({ data: { name: valid.name, location: valid.location } });
            await tx.auditLog.create({
                data: {
                    action: "BRANCH_CREATED",
                    branchId: branch.id,
                    userId: actorId,
                    details: { before: null, after: { name: branch.name, location: branch.location, isActive: branch.isActive } },
                },
            });
            return { ok: true, message: "Branch created.", branch };
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { ok: false, message: "A branch with that name already exists." };
        }
        throw error;
    }
}

export async function updateBranch(actorId: string, branchId: string, input: BranchInput): Promise<BranchResult> {
    const valid = normalizeInput(input);
    if (!valid.ok) return valid;
    try {
        return await prisma.$transaction(async (tx) => {
            await lockBranchManagement(tx);
            if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to manage branches." };
            const current = await tx.branch.findUnique({ where: { id: branchId } });
            if (!current) return { ok: false, message: "Branch not found." };
            if (await nameExists(tx, valid.name, branchId)) return { ok: false, message: "A branch with that name already exists." };
            const before: BranchSnapshot = { name: current.name, location: current.location, isActive: current.isActive };
            const branch = await tx.branch.update({ where: { id: branchId }, data: { name: valid.name, location: valid.location } });
            const after: BranchSnapshot = { name: branch.name, location: branch.location, isActive: branch.isActive };
            await tx.auditLog.create({
                data: { action: "BRANCH_UPDATED", branchId, userId: actorId, details: { before, after } },
            });
            return { ok: true, message: "Branch updated." };
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { ok: false, message: "A branch with that name already exists." };
        }
        throw error;
    }
}

export async function deactivateBranch(actorId: string, branchId: string): Promise<BranchResult> {
    return prisma.$transaction(async (tx) => {
        await lockBranchManagement(tx);
        if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to manage branches." };
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch) return { ok: false, message: "Branch not found." };
        if (!branch.isActive) return { ok: true, message: "Branch is already inactive." };
        const activeStaffCount = await tx.user.count({ where: { branchId, isActive: true } });
        if (activeStaffCount > 0) {
            return {
                ok: false,
                message: `Cannot deactivate this branch while ${activeStaffCount} active staff member${activeStaffCount === 1 ? " is" : "s are"} assigned.`,
            };
        }
        const activeBranchCount = await tx.branch.count({ where: { isActive: true } });
        if (activeBranchCount <= 1) return { ok: false, message: "At least one active branch must remain." };
        const before: BranchSnapshot = { name: branch.name, location: branch.location, isActive: branch.isActive };
        const updated = await tx.branch.update({ where: { id: branchId }, data: { isActive: false } });
        const after: BranchSnapshot = { name: updated.name, location: updated.location, isActive: updated.isActive };
        await tx.auditLog.create({ data: { action: "BRANCH_DEACTIVATED", branchId, userId: actorId, details: { before, after } } });
        return { ok: true, message: "Branch deactivated." };
    });
}

export async function reactivateBranch(actorId: string, branchId: string): Promise<BranchResult> {
    return prisma.$transaction(async (tx) => {
        await lockBranchManagement(tx);
        if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to manage branches." };
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch) return { ok: false, message: "Branch not found." };
        if (branch.isActive) return { ok: true, message: "Branch is already active." };
        const before: BranchSnapshot = { name: branch.name, location: branch.location, isActive: branch.isActive };
        const updated = await tx.branch.update({ where: { id: branchId }, data: { isActive: true } });
        const after: BranchSnapshot = { name: updated.name, location: updated.location, isActive: updated.isActive };
        await tx.auditLog.create({ data: { action: "BRANCH_REACTIVATED", branchId, userId: actorId, details: { before, after } } });
        return { ok: true, message: "Branch reactivated." };
    });
}