import type { Prisma, PrismaClient, Role } from "@prisma/client";
import { prisma } from "../../../lib/prisma.ts";
import { can } from "../../../lib/permissions.ts";
import { createPasswordResetTokenForUser, sendPasswordResetEmail } from "../../auth/lib/password-reset.ts";
import { decideSelfAction, validateRoleBranch, wouldRemoveLastActiveAdmin } from "./staff-rules.ts";
import type { StaffActionResult, StaffBranchesResult, StaffListResult, StaffSummary } from "./staff-types.ts";

type Actor = { id: string; role: Role; branchId: string | null; isActive: boolean };

async function readActor(db: PrismaClient | Prisma.TransactionClient, actorId: string): Promise<Actor | null> {
    return db.user.findUnique({
        where: { id: actorId },
        select: { id: true, role: true, branchId: true, isActive: true },
    });
}

async function requireAdmin(db: PrismaClient | Prisma.TransactionClient, actorId: string): Promise<Actor | null> {
    const actor = await readActor(db, actorId);
    if (!actor || !actor.isActive || actor.role !== "ADMIN" || !can(actor.role, "users:manage")) return null;
    return actor;
}

function requireManager(actor: Actor | null): actor is Actor & { role: "BRANCH_MANAGER" } {
    return Boolean(actor && actor.isActive && actor.role === "BRANCH_MANAGER");
}

const STAFF_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    branchId: true,
    createdAt: true,
    branch: { select: { name: true } },
} satisfies Prisma.UserSelect;

export async function listStaffForAdmin(actorId: string): Promise<StaffListResult> {
    const actor = await requireAdmin(prisma, actorId);
    if (!actor) return { ok: false, message: "You are not authorized to manage staff." };
    const users = await prisma.user.findMany({
        orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
        select: STAFF_SELECT,
    });
    return { ok: true, users: users as StaffSummary[] };
}

export async function listStaffBranchesForAdmin(actorId: string): Promise<StaffBranchesResult> {
    const actor = await requireAdmin(prisma, actorId);
    if (!actor) return { ok: false, message: "You are not authorized to manage staff." };
    const branches = await prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
    return { ok: true, branches };
}

export async function listTeamForManager(actorId: string): Promise<StaffListResult> {
    const actor = await readActor(prisma, actorId);
    if (!requireManager(actor)) return { ok: false, message: "You are not authorized to view this team." };
    if (!actor.branchId) return { ok: false, message: "Your account has no branch assigned. Ask an admin." };

    const users = await prisma.user.findMany({
        where: { branchId: actor.branchId, role: { not: "ADMIN" } },
        orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
        select: STAFF_SELECT,
    });
    return { ok: true, users: users as StaffSummary[] };
}

export async function changeStaffRoleAndBranch(actorId: string, input: {
    userId: string;
    role: unknown;
    branchId: string | null;
}): Promise<StaffActionResult> {
    const actor = await requireAdmin(prisma, actorId);
    if (!actor) return { ok: false, message: "You are not authorized to manage staff." };
    const valid = validateRoleBranch(input);
    if (!valid.ok) return valid;
    const branchId = input.branchId;
    if (branchId && !(await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } }))) {
        return { ok: false, message: "The selected branch does not exist." };
    }

    const role = input.role as Role;
    const result = await prisma.$transaction(async (tx): Promise<StaffActionResult> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(74102, 2)`;
        const currentActor = await requireAdmin(tx, actorId);
        if (!currentActor) return { ok: false, message: "You are not authorized to manage staff." };
        if (branchId) {
            const targetBranch = await tx.branch.findUnique({ where: { id: branchId }, select: { id: true, isActive: true } });
            if (!targetBranch) return { ok: false, message: "The selected branch does not exist." };
            if (!targetBranch.isActive) return { ok: false, message: "Cannot assign staff to an inactive branch." };
        }
        const target = await tx.user.findUnique({
            where: { id: input.userId },
            select: { id: true, role: true, branchId: true, isActive: true },
        });
        if (!target) return { ok: false, message: "Staff account not found." };

        const roleChanged = target.role !== role;
        const branchChanged = target.branchId !== branchId;
        if (!roleChanged && !branchChanged) return { ok: true, message: "No staff changes were needed." };
        if (roleChanged && target.isActive && target.role === "ADMIN" && role !== "ADMIN") {
            const activeAdminCount = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
            if (wouldRemoveLastActiveAdmin({ targetIsActiveAdmin: true, activeAdminCount })) {
                return { ok: false, message: "At least one active admin is required." };
            }
        }
        if (roleChanged) {
            const selfAction = decideSelfAction({ actorId, targetId: target.id, action: "change_role" });
            if (!selfAction.ok) return selfAction;
        } else if (branchChanged) {
            const selfAction = decideSelfAction({ actorId, targetId: target.id, action: "change_branch" });
            if (!selfAction.ok) return selfAction;
        }

        await tx.user.update({ where: { id: target.id }, data: { role, branchId } });
        const auditEntries: Prisma.AuditLogCreateManyInput[] = [];
        if (roleChanged) auditEntries.push({
            action: "STAFF_ROLE_CHANGED",
            branchId: currentActor.branchId,
            userId: currentActor.id,
            details: { targetUserId: target.id, previousRole: target.role, newRole: role },
        });
        if (branchChanged) auditEntries.push({
            action: "STAFF_BRANCH_CHANGED",
            branchId: currentActor.branchId,
            userId: currentActor.id,
            details: { targetUserId: target.id, previousBranchId: target.branchId, newBranchId: branchId },
        });
        await tx.auditLog.createMany({ data: auditEntries });
        return { ok: true, message: "Staff account updated." };
    });
    return result;
}

export async function deactivateStaff(actorId: string, userId: string): Promise<StaffActionResult> {
    const actor = await requireAdmin(prisma, actorId);
    if (!actor) return { ok: false, message: "You are not authorized to manage staff." };

    return prisma.$transaction(async (tx): Promise<StaffActionResult> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(74102, 1)`;
        const currentActor = await requireAdmin(tx, actorId);
        if (!currentActor) return { ok: false, message: "You are not authorized to manage staff." };
        const target = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, branchId: true, isActive: true },
        });
        if (!target) return { ok: false, message: "Staff account not found." };
        if (!target.isActive) return { ok: true, message: "Staff account is already inactive." };

        if (target.role === "ADMIN") {
            const activeAdminCount = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
            if (wouldRemoveLastActiveAdmin({ targetIsActiveAdmin: true, activeAdminCount })) {
                return { ok: false, message: "At least one active admin is required." };
            }
        }
        const selfAction = decideSelfAction({ actorId, targetId: userId, action: "deactivate" });
        if (!selfAction.ok) return selfAction;

        await tx.user.update({ where: { id: userId }, data: { isActive: false } });
        await tx.auditLog.create({
            data: {
                action: "STAFF_DEACTIVATED",
                branchId: currentActor.branchId,
                userId: currentActor.id,
                details: { targetUserId: userId },
            },
        });
        return { ok: true, message: "Staff account deactivated." };
    });
}

export async function reactivateStaff(actorId: string, userId: string): Promise<StaffActionResult> {
    const actor = await requireAdmin(prisma, actorId);
    if (!actor) return { ok: false, message: "You are not authorized to manage staff." };

    return prisma.$transaction(async (tx): Promise<StaffActionResult> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(74102, 2)`;
        const currentActor = await requireAdmin(tx, actorId);
        if (!currentActor) return { ok: false, message: "You are not authorized to manage staff." };
        const target = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, branchId: true, isActive: true },
        });
        if (!target) return { ok: false, message: "Staff account not found." };
        const valid = validateRoleBranch({ role: target.role, branchId: target.branchId });
        if (!valid.ok) return valid;
        if (target.isActive) return { ok: true, message: "Staff account is already active." };
        if (target.branchId) {
            const branch = await tx.branch.findUnique({ where: { id: target.branchId }, select: { isActive: true } });
            if (!branch?.isActive) return { ok: false, message: "Cannot reactivate staff assigned to an inactive branch." };
        }

        await tx.user.update({ where: { id: userId }, data: { isActive: true } });
        await tx.auditLog.create({
            data: {
                action: "STAFF_REACTIVATED",
                branchId: currentActor.branchId,
                userId: currentActor.id,
                details: { targetUserId: userId },
            },
        });
        return { ok: true, message: "Staff account reactivated." };
    });
}

export async function sendStaffResetLink(actorId: string, userId: string): Promise<StaffActionResult> {
    const actor = await requireAdmin(prisma, actorId);
    if (!actor) return { ok: false, message: "You are not authorized to manage staff." };
    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true },
    });
    if (!target) return { ok: false, message: "Staff account not found." };
    if (!target.isActive) return { ok: false, message: "Reactivate this account before sending a reset link." };

    let delivery;
    try {
        const reset = await createPasswordResetTokenForUser(target.id);
        if (!reset) return { ok: false, message: "Reactivate this account before sending a reset link." };
        const { token } = reset;
        delivery = await sendPasswordResetEmail(target.email, token);
    } catch (error) {
        const details = error as { name?: unknown; code?: unknown };
        console.error("Staff password reset email failed.", {
            name: details?.name,
            code: details?.code,
        });
        return { ok: false, message: "Email could not be sent. The previous reset link no longer works; try again." };
    }
    if (!delivery.sent) return { ok: false, message: "Email could not be sent. The previous reset link no longer works; try again." };

    await prisma.auditLog.create({
        data: {
            action: "STAFF_RESET_LINK_SENT",
            branchId: actor.branchId,
            userId: actor.id,
            details: { targetUserId: target.id },
        },
    });
    return { ok: true, message: "Password reset link sent." };
}