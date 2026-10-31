import bcrypt from "bcryptjs";
import { Prisma, type PrismaClient, type Role, type StaffInvitation } from "@prisma/client";
import { prisma } from "../../../lib/prisma.ts";
import { can } from "../../../lib/permissions.ts";
import { sendMail, type MailResult } from "../../../lib/mail.ts";
import { BCRYPT_PASSWORD_COST, isValidNewPassword } from "../../../lib/password.ts";
import { generateToken, hashToken } from "../../../lib/tokens.ts";
import { validateRoleBranch } from "./staff-rules.ts";
import { buildStaffInvitationUrl, getStaffInvitationExpiry, invitationSnapshot, isStaffInvitationPending, normalizeInvitationEmail } from "./staff-invitation-policy.ts";

export const INVALID_STAFF_INVITATION_MESSAGE = "This invitation link is invalid or expired. Request a new invitation from your administrator.";
export const STAFF_INVITATION_EMAIL_FAILURE = "The invitation was created but the email could not be sent. Resend the invitation to issue a new link.";

type SenderInput = { to: string; token: string; role: Role; branchName: string | null; expiresAt: Date };
export type InvitationSender = (input: SenderInput) => Promise<MailResult>;
type Db = PrismaClient | Prisma.TransactionClient;
type OperationResult<T = undefined> = { ok: true; message: string } & (T extends undefined ? {} : T extends unknown[] ? { invitations: T } : { invitation: T }) | { ok: false; message: string };
type CreateInvitationInput = { email: unknown; role: unknown; branchId: string | null };
type PublicAcceptResult = { ok: true; userId: string } | { ok: false; message: string };
type PublicInvitation = Omit<StaffInvitation, "tokenHash"> & { branch: { name: string } | null };

async function requireAdmin(db: Db, actorId: string) {
    const actor = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, isActive: true } });
    return actor?.isActive && actor.role === "ADMIN" && can(actor.role, "users:manage") ? actor : null;
}

async function lockEmail(tx: Prisma.TransactionClient, email: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`staff-invitation:${email}`}, 0))`;
}

async function lockBranchManagement(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(74102, 2)`;
}

async function expirePendingForEmail(tx: Prisma.TransactionClient, email: string, now: Date) {
    await tx.staffInvitation.updateMany({
        where: { email: { equals: email, mode: "insensitive" }, status: "PENDING", expiresAt: { lte: now } },
        data: { status: "EXPIRED" },
    });
}

async function validateBranch(tx: Prisma.TransactionClient, role: unknown, branchId: string | null) {
    const valid = validateRoleBranch({ role, branchId });
    if (!valid.ok) return valid;
    if (branchId) {
        const branch = await tx.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true, isActive: true } });
        if (!branch) return { ok: false as const, message: "The selected branch does not exist." };
        if (!branch.isActive) return { ok: false as const, message: "Cannot invite staff to an inactive branch." };
    }
    return { ok: true as const };
}

function normalizeInvitationInput(input: CreateInvitationInput): { ok: true; email: string; role: Role; branchId: string | null } | { ok: false; message: string } {
    if (typeof input.email !== "string") return { ok: false, message: "Enter a valid email address." };
    const email = normalizeInvitationEmail(input.email);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
    if (typeof input.role !== "string") return { ok: false, message: "Choose a valid staff role." };
    return { ok: true, email, role: input.role as Role, branchId: input.branchId };
}

export async function sendStaffInvitationEmail(input: SenderInput): Promise<MailResult> {
    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error("APP_URL must be configured to create staff invitation links.");
    const link = buildStaffInvitationUrl(appUrl, input.token);
    const roleLabel = input.role === "ADMIN" ? "Admin" : input.role === "BRANCH_MANAGER" ? "Branch manager" : "Sales";
    const branchText = input.branchName ? `\nBranch: ${input.branchName}` : "";
    return sendMail({
        to: input.to,
        subject: "Your OsciPharm staff invitation",
        text: `You have been invited to join OsciPharm as ${roleLabel}.${branchText}\n\nAccept this invitation within 7 days:\n\n${link}\n\nIf you were not expecting this invitation, you can ignore this email. Expires: ${input.expiresAt.toISOString()}.`,
    });
}

function publicInvitation(invitation: StaffInvitation, branch: { name: string } | null): PublicInvitation {
    const { tokenHash: _tokenHash, ...safe } = invitation;
    return { ...safe, branch };
}

async function deliverInvitation(db: Db, invitation: StaffInvitation, branchName: string | null, token: string, sender: InvitationSender) {
    let delivery: MailResult;
    try {
        delivery = await sender({ to: invitation.email, token, role: invitation.role, branchName, expiresAt: invitation.expiresAt });
    } catch (error) {
        const details = error as { name?: unknown; code?: unknown };
        console.error("Staff invitation email failed.", { name: details?.name, code: details?.code });
        return { ok: false as const, message: STAFF_INVITATION_EMAIL_FAILURE };
    }
    if (!delivery.sent) return { ok: false as const, message: STAFF_INVITATION_EMAIL_FAILURE };
    const emailSentAt = new Date();
    const updated = await db.staffInvitation.updateMany({
        where: { id: invitation.id, tokenHash: invitation.tokenHash, status: "PENDING", expiresAt: { gt: emailSentAt } },
        data: { emailSentAt },
    });
    if (updated.count !== 1) return { ok: false as const, message: INVALID_STAFF_INVITATION_MESSAGE };
    return { ok: true as const };
}

export function createStaffInvitationService(db: PrismaClient = prisma, sender: InvitationSender = sendStaffInvitationEmail as InvitationSender) {
    async function sendAndRecord(invitation: StaffInvitation, token: string) {
        const branch = invitation.branchId ? await db.branch.findUnique({ where: { id: invitation.branchId }, select: { name: true } }) : null;
        return deliverInvitation(db, invitation, branch?.name ?? null, token, sender);
    }

    async function createInvitation(actorId: string, rawInput: CreateInvitationInput): Promise<OperationResult<PublicInvitation>> {
        const input = normalizeInvitationInput(rawInput);
        if (!input.ok) return input;
        const token = generateToken();
        const tokenHash = hashToken(token);
        const now = new Date();
        let created: StaffInvitation | null = null;
        const validation = await db.$transaction(async (tx) => {
            await lockEmail(tx, input.email);
            await lockBranchManagement(tx);
            if (!(await requireAdmin(tx, actorId))) return { ok: false as const, message: "You are not authorized to invite staff." };
            await expirePendingForEmail(tx, input.email, now);
            const branchValid = await validateBranch(tx, input.role, input.branchId);
            if (!branchValid.ok) return branchValid;
            const existingUser = await tx.user.findFirst({ where: { email: { equals: input.email, mode: "insensitive" } }, select: { isActive: true } });
            if (existingUser) return { ok: false as const, message: existingUser.isActive ? "This email already has an account." : "This email belongs to a deactivated account. Reactivate it through staff management." };
            const existingInvitation = await tx.staffInvitation.findFirst({ where: { email: { equals: input.email, mode: "insensitive" }, status: "PENDING", expiresAt: { gt: now } } });
            if (existingInvitation) return { ok: false as const, message: "A pending invitation already exists. Resend it instead." };
            created = await tx.staffInvitation.create({
                data: { email: input.email, role: input.role, branchId: input.branchId, invitedById: actorId, tokenHash, expiresAt: getStaffInvitationExpiry(now) },
            });
            await tx.auditLog.create({
                data: { action: "STAFF_INVITATION_CREATED", branchId: created.branchId, userId: actorId, details: { before: null, after: invitationSnapshot(created) } },
            });
            return { ok: true as const };
        }, { timeout: 30_000, maxWait: 10_000 });
        if (!validation.ok) return validation;
        const invitation = created!;
        const delivery = await sendAndRecord(invitation, token);
        if (!delivery.ok) return delivery;
        const safeInvitation = await db.staffInvitation.findUnique({ where: { id: invitation.id }, include: { branch: { select: { name: true } } } });
        return { ok: true, message: "Invitation sent.", invitation: publicInvitation(safeInvitation!, safeInvitation!.branch) };
    }

    async function resendInvitation(actorId: string, invitationId: string): Promise<OperationResult<PublicInvitation>> {
        const token = generateToken();
        const tokenHash = hashToken(token);
        const now = new Date();
        const rotated = await db.$transaction(async (tx) => {
            if (!(await requireAdmin(tx, actorId))) return { ok: false as const, message: "You are not authorized to invite staff." };
            const current = await tx.staffInvitation.findUnique({ where: { id: invitationId } });
            if (!current) return { ok: false as const, message: "Invitation not found." };
            await lockEmail(tx, current.email);
            if (current.branchId) await lockBranchManagement(tx);
            const invitation = await tx.staffInvitation.findUnique({ where: { id: invitationId } });
            if (!invitation) return { ok: false as const, message: "Invitation not found." };
            if (invitation.status !== "PENDING") return { ok: false as const, message: "Only pending invitations can be resent." };
            if (invitation.expiresAt <= now) {
                await tx.staffInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
                return { ok: false as const, message: "This invitation expired. Create a new invitation." };
            }
            const branchValid = await validateBranch(tx, invitation.role, invitation.branchId);
            if (!branchValid.ok) return branchValid;
            const before = invitationSnapshot(invitation);
            const updated = await tx.staffInvitation.update({
                where: { id: invitation.id },
                data: { tokenHash, expiresAt: getStaffInvitationExpiry(now), emailSentAt: null },
            });
            await tx.auditLog.create({ data: { action: "STAFF_INVITATION_RESENT", branchId: invitation.branchId, userId: actorId, details: { before, after: invitationSnapshot(updated) } } });
            const branch = invitation.branchId ? await tx.branch.findUnique({ where: { id: invitation.branchId }, select: { name: true } }) : null;
            return { ok: true as const, invitation: updated, branchName: branch?.name ?? null };
        }, { timeout: 30_000, maxWait: 10_000 });
        if (!rotated.ok) return rotated;
        const delivery = await deliverInvitation(db, rotated.invitation, rotated.branchName, token, sender);
        if (!delivery.ok) return delivery;
        const safeInvitation = await db.staffInvitation.findUnique({ where: { id: rotated.invitation.id }, include: { branch: { select: { name: true } } } });
        return { ok: true, message: "Invitation resent.", invitation: publicInvitation(safeInvitation!, safeInvitation!.branch) };
    }

    async function revokeInvitation(actorId: string, invitationId: string): Promise<OperationResult> {
        return db.$transaction(async (tx) => {
            if (!(await requireAdmin(tx, actorId))) return { ok: false, message: "You are not authorized to invite staff." };
            const current = await tx.staffInvitation.findUnique({ where: { id: invitationId } });
            if (!current) return { ok: false, message: "Invitation not found." };
            await lockEmail(tx, current.email);
            if (current.branchId) await lockBranchManagement(tx);
            const invitation = await tx.staffInvitation.findUnique({ where: { id: invitationId } });
            if (!invitation) return { ok: false, message: "Invitation not found." };
            const now = new Date();
            if (invitation.status === "PENDING" && invitation.expiresAt <= now) {
                await tx.staffInvitation.update({ where: { id: invitationId }, data: { status: "EXPIRED" } });
                return { ok: false, message: "This invitation has expired." };
            }
            if (invitation.status !== "PENDING") return { ok: false, message: "Only pending invitations can be revoked." };
            const before = invitationSnapshot(invitation);
            const updated = await tx.staffInvitation.update({ where: { id: invitationId }, data: { status: "REVOKED", revokedAt: now } });
            await tx.auditLog.create({ data: { action: "STAFF_INVITATION_REVOKED", branchId: invitation.branchId, userId: actorId, details: { before, after: invitationSnapshot(updated) } } });
            return { ok: true, message: "Invitation revoked." };
        }, { timeout: 30_000, maxWait: 10_000 });
    }

    async function listPendingInvitations(actorId: string): Promise<OperationResult<PublicInvitation[]>> {
        if (!(await requireAdmin(db, actorId))) return { ok: false, message: "You are not authorized to manage invitations." };
        const now = new Date();
        await db.staffInvitation.updateMany({ where: { status: "PENDING", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
        const invitations = await db.staffInvitation.findMany({
            where: { status: "PENDING", expiresAt: { gt: now } },
            orderBy: [{ createdAt: "desc" }],
            include: { branch: { select: { name: true } } },
        });
        return { ok: true, message: "Pending invitations loaded.", invitations: invitations.map((invitation) => publicInvitation(invitation, invitation.branch)) };
    }

    async function acceptInvitation(token: string, input: { name: unknown; password: unknown }): Promise<PublicAcceptResult> {
        const invalid = { ok: false as const, message: INVALID_STAFF_INVITATION_MESSAGE };
        if (typeof token !== "string" || typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 120 || typeof input.password !== "string" || !isValidNewPassword(input.password)) return invalid;
        const tokenHash = hashToken(token);
        const candidate = await db.staffInvitation.findUnique({ where: { tokenHash }, select: { id: true, email: true, branchId: true, status: true, expiresAt: true } });
        const checkedAt = new Date();
        if (!candidate || !isStaffInvitationPending(candidate, checkedAt)) {
            if (candidate?.status === "PENDING" && candidate.expiresAt <= checkedAt) {
                await db.staffInvitation.updateMany({ where: { id: candidate.id, status: "PENDING", expiresAt: { lte: checkedAt } }, data: { status: "EXPIRED" } });
            }
            return invalid;
        }
        const passwordHash = await bcrypt.hash(input.password as string, BCRYPT_PASSWORD_COST);
        try {
            return await db.$transaction(async (tx): Promise<PublicAcceptResult> => {
            await lockEmail(tx, normalizeInvitationEmail(candidate.email));
            if (candidate.branchId) await lockBranchManagement(tx);
            const invitation = await tx.staffInvitation.findUnique({ where: { tokenHash } });
            const now = new Date();
            if (!invitation || !isStaffInvitationPending(invitation, now)) {
                if (invitation?.status === "PENDING" && invitation.expiresAt <= now) {
                    await tx.staffInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
                }
                return invalid;
            }
            const branchValid = await validateBranch(tx, invitation.role, invitation.branchId);
            if (!branchValid.ok) return invalid;
            if (await tx.user.findFirst({ where: { email: { equals: invitation.email, mode: "insensitive" } }, select: { id: true } })) return invalid;

            const user = await tx.user.create({
                data: {
                    name: (input.name as string).trim(),
                    email: invitation.email,
                    passwordHash,
                    role: invitation.role,
                    branchId: invitation.branchId,
                    isActive: true,
                },
            });
            const updated = await tx.staffInvitation.update({
                where: { id: invitation.id },
                data: { status: "ACCEPTED", acceptedAt: now, acceptedUserId: user.id },
            });
            await tx.auditLog.create({
                data: { action: "STAFF_INVITATION_ACCEPTED", branchId: invitation.branchId, userId: user.id, details: { before: invitationSnapshot(invitation), after: invitationSnapshot(updated) } },
            });
            return { ok: true, userId: user.id };
            }, { timeout: 30_000, maxWait: 10_000 });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return invalid;
            throw error;
        }
    }

    return { createInvitation, resendInvitation, revokeInvitation, listPendingInvitations, acceptInvitation };
}

const defaultService = createStaffInvitationService();
export const createInvitation = defaultService.createInvitation;
export const resendInvitation = defaultService.resendInvitation;
export const revokeInvitation = defaultService.revokeInvitation;
export const listPendingInvitations = defaultService.listPendingInvitations;
export const acceptInvitation = defaultService.acceptInvitation;