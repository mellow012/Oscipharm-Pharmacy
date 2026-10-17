-- Phase C1: import run tracking and unknown-expiry stock support.
-- This is intentionally a new migration file and was not applied in this session.

CREATE TYPE "ImportRunKind" AS ENUM ('STOCK', 'SALES');
CREATE TYPE "ImportRunStatus" AS ENUM ('PREVIEW', 'COMMITTING', 'COMMITTED', 'UNDONE');

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'UNKNOWN';

CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "kind" "ImportRunKind" NOT NULL,
    "branchId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "status" "ImportRunStatus" NOT NULL DEFAULT 'PREVIEW',
    "uploadedById" TEXT NOT NULL,
    "counts" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ImportRun_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImportRun_uploadedById_fkey"
        FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- This partial unique index is intentionally raw SQL.
-- Prisma schema syntax cannot express the "same branch + kind + fileSha256 while not UNDONE" rule
-- without a partial unique index, so we keep the database rule here to prevent duplicate imports.
CREATE UNIQUE INDEX "ImportRun_branchId_kind_fileSha256_non_undone_idx"
    ON "ImportRun" ("branchId", "kind", "fileSha256")
    WHERE "status" <> 'UNDONE';

ALTER TABLE "Batch"
    ADD COLUMN "importRunId" TEXT,
    ADD COLUMN "expiryDateKnown" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Sale"
    ADD COLUMN "importRunId" TEXT;

ALTER TABLE "Batch"
    ADD CONSTRAINT "Batch_importRunId_fkey"
    FOREIGN KEY ("importRunId") REFERENCES "ImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_importRunId_fkey"
    FOREIGN KEY ("importRunId") REFERENCES "ImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
