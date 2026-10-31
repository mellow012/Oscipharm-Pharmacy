export const STAFF_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getStaffInvitationExpiry(now: Date) {
    return new Date(now.getTime() + STAFF_INVITATION_TTL_MS);
}

export function isStaffInvitationPending(
    invitation: { status: string; expiresAt: Date },
    now: Date,
) {
    return invitation.status === "PENDING" && invitation.expiresAt.getTime() > now.getTime();
}

export function normalizeInvitationEmail(email: string) {
    return email.trim().toLowerCase();
}

export function buildStaffInvitationUrl(appUrl: string, token: string) {
    return `${appUrl.replace(/\/+$/, "")}/accept-invitation/${encodeURIComponent(token)}`;
}

export function invitationSnapshot(invitation: {
    email: string;
    role: string;
    branchId: string | null;
    status: string;
    expiresAt: Date;
    emailSentAt: Date | null;
    acceptedAt: Date | null;
    revokedAt: Date | null;
}) {
    return {
        email: invitation.email,
        role: invitation.role,
        branchId: invitation.branchId,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        emailSentAt: invitation.emailSentAt?.toISOString() ?? null,
        acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
        revokedAt: invitation.revokedAt?.toISOString() ?? null,
    };
}