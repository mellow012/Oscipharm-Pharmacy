import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma.ts";
import { sendMail } from "../../../lib/mail.ts";
import { BCRYPT_PASSWORD_COST } from "../../../lib/password.ts";
import { generateToken, hashToken } from "../../../lib/tokens.ts";
import { getAuthThrottleSecret, hashAuthThrottleSubject, AUTH_THROTTLE_SCOPES } from "./auth-throttle.ts";
import { buildPasswordResetUrl, getPasswordResetExpiry, isPasswordResetTokenValid } from "./password-reset-policy.ts";

export { buildPasswordResetUrl, getPasswordResetExpiry, isPasswordResetTokenValid } from "./password-reset-policy.ts";

export async function createPasswordResetTokenForUser(userId: string) {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const createdAt = new Date();
    const expiresAt = getPasswordResetExpiry(createdAt);

    await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        await tx.passwordResetToken.deleteMany({ where: { userId } });
        await tx.passwordResetToken.create({ data: { userId, tokenHash, createdAt, expiresAt } });
    });

    return { token, expiresAt };
}

export async function sendPasswordResetEmail(to: string, token: string) {
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
        throw new Error("APP_URL must be configured to create password reset links.");
    }

    const link = buildPasswordResetUrl(appUrl, token);
    await sendMail({
        to,
        subject: "Reset your OsciPharm password",
        text: `We received a request to reset your password. Use this link within 30 minutes:\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
    });
}

export async function getValidPasswordResetToken(token: string, now = new Date()) {
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!resetToken || !isPasswordResetTokenValid(resetToken, now)) return null;
    return resetToken;
}

export async function redeemPasswordResetToken(token: string, newPassword: string) {
    const now = new Date();
    const tokenHash = hashToken(token);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_PASSWORD_COST);

    return prisma.$transaction(async (tx) => {
        const claimed = await tx.$queryRaw<Array<{ userId: string }>>`
            UPDATE "PasswordResetToken"
            SET "usedAt" = ${now}
            WHERE "tokenHash" = ${tokenHash}
              AND "usedAt" IS NULL
              AND "expiresAt" > ${now}
            RETURNING "userId"
        `;
        const userId = claimed[0]?.userId;
        if (!userId) return null;

        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, branchId: true },
        });
        if (!user) return null;

        await tx.user.update({
            where: { id: userId },
            data: { passwordHash, passwordChangedAt: now },
        });
        await tx.passwordResetToken.deleteMany({ where: { userId, tokenHash: { not: tokenHash } } });

        const branchId = user.branchId ?? (await tx.branch.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } }))?.id;
        if (!branchId) throw new Error("Cannot audit password reset without a branch.");

        await tx.auditLog.create({
            data: {
                action: "PASSWORD_RESET_COMPLETED",
                branchId,
                userId,
                details: { event: "password_reset_completed" },
                createdAt: now,
            },
        });

        const emailHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, user.email, getAuthThrottleSecret());
        await tx.$executeRaw`
            DELETE FROM "AuthThrottle"
            WHERE "scope" = 'EMAIL'::"AuthThrottleScope" AND "subjectHash" = ${emailHash}
        `;

        return user;
    });
}