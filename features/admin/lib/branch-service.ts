import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.ts";
import { can } from "../../../lib/permissions.ts";
import { BRANCH_LIFECYCLE_AUDIT_ACTIONS, canArchiveBranch, canDeleteBranch, ensureBranchNameInAuditDetails } from "./branch-lifecycle-rules.ts";
import { validateBranchInput, type BranchInput } from "./branch-input.ts";

type BranchDb = PrismaClient | Prisma.TransactionClient;
type BranchSnapshot = { name: string; location: string; contactNumber: string | null; isActive: boolean };
type BranchResult<T = null> = { ok: true; message: string; branch?: T } | { ok: false; message: string };
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

async function requireAdmin(db: BranchDb, actorId: string) {
    const actor = await db.user.findUnique({ where: { id: actorId }, select: { id: true, name: true, role: true, isActive: true } });
    return actor?.isActive && actor.role === "ADMIN" && can(actor.role, "branches:manage") ? actor : null;
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

export async function createBranch(actorId: string, input: BranchInput): Promise<BranchResult<{ id: string; name: string; location: string; contactNumber: string | null; isActive: boolean }>> {
    const valid = validateBranchInput(input);
    if (!valid.ok) return valid;
    try {
        return await prisma.$transaction(async (tx) => {
            await lockBranchManagement(tx);
            if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to manage branches." };
            if (await nameExists(tx, valid.value.name)) return { ok: false, message: "A branch with that name already exists." };
            const branch = await tx.branch.create({ data: valid.value });
            await tx.auditLog.create({
                data: {
                    action: "BRANCH_CREATED",
                    branchId: branch.id,
                    userId: actorId,
                    details: { before: null, after: { name: branch.name, location: branch.location, contactNumber: branch.contactNumber, isActive: branch.isActive } },
                },
            });
            return { ok: true, message: "Branch created.", branch };
        }, TRANSACTION_OPTIONS);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { ok: false, message: "A branch with that name already exists." };
        }
        throw error;
    }
}

export async function updateBranch(actorId: string, branchId: string, input: BranchInput): Promise<BranchResult> {
    const valid = validateBranchInput(input);
    if (!valid.ok) return valid;
    try {
        return await prisma.$transaction(async (tx) => {
            await lockBranchManagement(tx);
            if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to manage branches." };
            const current = await tx.branch.findUnique({ where: { id: branchId } });
            if (!current) return { ok: false, message: "Branch not found." };
            if (await nameExists(tx, valid.value.name, branchId)) return { ok: false, message: "A branch with that name already exists." };
            const before: BranchSnapshot = { name: current.name, location: current.location, contactNumber: current.contactNumber, isActive: current.isActive };
            const branch = await tx.branch.update({ where: { id: branchId }, data: valid.value });
            const after: BranchSnapshot = { name: branch.name, location: branch.location, contactNumber: branch.contactNumber, isActive: branch.isActive };
            await tx.auditLog.create({
                data: { action: "BRANCH_UPDATED", branchId, userId: actorId, details: { before, after } },
            });
            return { ok: true, message: "Branch updated." };
        }, TRANSACTION_OPTIONS);
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
        const now = new Date();
        await tx.staffInvitation.updateMany({
            where: { branchId, status: "PENDING", expiresAt: { lte: now } },
            data: { status: "EXPIRED" },
        });
        const pendingInvitationCount = await tx.staffInvitation.count({
            where: { branchId, status: "PENDING", expiresAt: { gt: now } },
        });
        if (pendingInvitationCount > 0) {
            return {
                ok: false,
                message: `Cannot deactivate this branch while ${pendingInvitationCount} pending invitation${pendingInvitationCount === 1 ? " exists" : "s exist"}. Revoke them first.`,
            };
        }
        const activeBranchCount = await tx.branch.count({ where: { isActive: true } });
        if (activeBranchCount <= 1) return { ok: false, message: "At least one active branch must remain." };
        const before: BranchSnapshot = { name: branch.name, location: branch.location, contactNumber: branch.contactNumber, isActive: branch.isActive };
        const updated = await tx.branch.update({ where: { id: branchId }, data: { isActive: false } });
        const after: BranchSnapshot = { name: updated.name, location: updated.location, contactNumber: updated.contactNumber, isActive: updated.isActive };
        await tx.auditLog.create({ data: { action: "BRANCH_DEACTIVATED", branchId, userId: actorId, details: { before, after } } });
        return { ok: true, message: "Branch deactivated." };
    }, { timeout: 30_000, maxWait: 10_000 });
}

export async function reactivateBranch(actorId: string, branchId: string): Promise<BranchResult> {
    return prisma.$transaction(async (tx) => {
        await lockBranchManagement(tx);
        if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to manage branches." };
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch) return { ok: false, message: "Branch not found." };
        if (branch.archivedAt) return { ok: false, message: "Restore this branch before reactivating it." };
        if (branch.isActive) return { ok: true, message: "Branch is already active." };
        const before: BranchSnapshot = { name: branch.name, location: branch.location, contactNumber: branch.contactNumber, isActive: branch.isActive };
        const updated = await tx.branch.update({ where: { id: branchId }, data: { isActive: true } });
        const after: BranchSnapshot = { name: updated.name, location: updated.location, contactNumber: updated.contactNumber, isActive: updated.isActive };
        await tx.auditLog.create({ data: { action: "BRANCH_REACTIVATED", branchId, userId: actorId, details: { before, after } } });
        return { ok: true, message: "Branch reactivated." };
    }, { timeout: 30_000, maxWait: 10_000 });
}

const BRANCH_DELETE_RESTRICTED_MESSAGE = "This branch still has related records, so it can't be deleted. Deactivate it instead.";

export async function deleteBranch(actorId: string, branchId: string): Promise<BranchResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            await lockBranchManagement(tx);
            const actor = await requireAdmin(tx, actorId);
            if (!actor) return { ok: false, message: "You are not authorized to manage branches." };
            const branch = await tx.branch.findUnique({
                where: { id: branchId },
                select: {
                    id: true,
                    name: true,
                    location: true,
                    contactNumber: true,
                    isActive: true,
                    createdAt: true,
                    archivedAt: true,
                    _count: { select: { users: true, staffInvitations: true, batches: true, prices: true, sales: true, importRuns: true, auditLogs: true } },
                },
            });
            if (!branch) return { ok: false, message: "Branch not found." };
            const branchesCount = await tx.branch.count();
            const lifecycleAuditRows = await tx.auditLog.count({
                where: { branchId, action: { in: [...BRANCH_LIFECYCLE_AUDIT_ACTIONS] } },
            });
            const guard = canDeleteBranch({
                branches: branchesCount,
                users: branch._count.users,
                invitations: branch._count.staffInvitations,
                batches: branch._count.batches,
                prices: branch._count.prices,
                sales: branch._count.sales,
                importRuns: branch._count.importRuns,
                auditRows: branch._count.auditLogs,
                lifecycleAuditRows,
            });
            if (!guard.allowed) return { ok: false, message: guard.message };

            const lifecycleRows = await tx.auditLog.findMany({
                where: { branchId, action: { in: [...BRANCH_LIFECYCLE_AUDIT_ACTIONS] } },
                select: { id: true, details: true },
            });
            for (const row of lifecycleRows) {
                await tx.auditLog.update({
                    where: { id: row.id },
                    data: {
                        branchId: null,
                        details: ensureBranchNameInAuditDetails(row.details, branch.name) as Prisma.InputJsonValue,
                    },
                });
            }
            await tx.auditLog.create({
                data: {
                    action: "BRANCH_DELETED",
                    branchId: null,
                    userId: actor.id,
                    details: {
                        snapshot: {
                            id: branch.id,
                            name: branch.name,
                            location: branch.location,
                            contactNumber: branch.contactNumber,
                            isActive: branch.isActive,
                            createdAt: branch.createdAt.toISOString(),
                        },
                        actor: { id: actor.id, name: actor.name },
                    },
                },
            });
            await tx.branch.delete({ where: { id: branchId } });
            return { ok: true, message: "Branch deleted." };
        }, TRANSACTION_OPTIONS);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2003", "P2014"].includes(error.code)) {
            return { ok: false, message: BRANCH_DELETE_RESTRICTED_MESSAGE };
        }
        throw error;
    }
}

export async function archiveBranch(actorId: string, branchId: string): Promise<BranchResult> {
    return prisma.$transaction(async (tx) => {
        await lockBranchManagement(tx);
        const actor = await requireAdmin(tx, actorId);
        if (!actor) return { ok: false, message: "You are not authorized to manage branches." };
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch) return { ok: false, message: "Branch not found." };
        if (branch.archivedAt) return { ok: true, message: "Branch is already archived." };
        const remainingBranches = await tx.branch.count({ where: { archivedAt: null } });
        const guard = canArchiveBranch({ isActive: branch.isActive, remainingBranches });
        if (!guard.allowed) return { ok: false, message: guard.reason };
        const archivedAt = new Date();
        await tx.branch.update({ where: { id: branchId }, data: { archivedAt } });
        await tx.auditLog.create({
            data: {
                action: "BRANCH_UPDATED",
                branchId,
                userId: actor.id,
                details: { event: "BRANCH_ARCHIVED", branchName: branch.name, archivedAt: archivedAt.toISOString() },
            },
        });
        return { ok: true, message: "Branch archived." };
    }, TRANSACTION_OPTIONS);
}

export async function restoreBranch(actorId: string, branchId: string): Promise<BranchResult> {
    return prisma.$transaction(async (tx) => {
        await lockBranchManagement(tx);
        const actor = await requireAdmin(tx, actorId);
        if (!actor) return { ok: false, message: "You are not authorized to manage branches." };
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch) return { ok: false, message: "Branch not found." };
        if (!branch.archivedAt) return { ok: true, message: "Branch is not archived." };
        await tx.branch.update({ where: { id: branchId }, data: { archivedAt: null } });
        await tx.auditLog.create({
            data: {
                action: "BRANCH_UPDATED",
                branchId,
                userId: actor.id,
                details: { event: "BRANCH_RESTORED", branchName: branch.name },
            },
        });
        return { ok: true, message: "Branch restored. It remains deactivated." };
    }, TRANSACTION_OPTIONS);
}