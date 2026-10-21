export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export function getPasswordResetExpiry(now: Date) {
    return new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
}

export function isPasswordResetTokenValid(
    token: { expiresAt: Date; usedAt: Date | null },
    now: Date,
) {
    return token.usedAt === null && token.expiresAt.getTime() > now.getTime();
}

export function buildPasswordResetUrl(appUrl: string, token: string) {
    return `${appUrl.replace(/\/+$/, "")}/reset-password/${encodeURIComponent(token)}`;
}