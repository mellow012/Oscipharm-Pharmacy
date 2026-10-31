ALTER TYPE "AuditAction" ADD VALUE 'STAFF_INVITATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_INVITATION_RESENT';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_INVITATION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_INVITATION_ACCEPTED';

CREATE TYPE "StaffInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

CREATE TABLE "StaffInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "branchId" TEXT,
    "invitedById" TEXT NOT NULL,
    "acceptedUserId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "StaffInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StaffInvitation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StaffInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StaffInvitation_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");
CREATE UNIQUE INDEX "StaffInvitation_acceptedUserId_key" ON "StaffInvitation"("acceptedUserId");
-- Partial unique index for one pending invitation per case-insensitive email is raw SQL and cannot be represented in schema.prisma.
CREATE UNIQUE INDEX "StaffInvitation_one_pending_email_key" ON "StaffInvitation"(LOWER("email")) WHERE "status" = 'PENDING';
CREATE INDEX "StaffInvitation_status_expiresAt_idx" ON "StaffInvitation"("status", "expiresAt");
CREATE INDEX "StaffInvitation_branchId_status_expiresAt_idx" ON "StaffInvitation"("branchId", "status", "expiresAt");
