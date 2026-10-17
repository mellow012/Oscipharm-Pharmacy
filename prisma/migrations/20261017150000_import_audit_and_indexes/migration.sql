-- Partial unique indexes are raw SQL on purpose; Prisma schema cannot express their predicates.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IMPORT_COMMITTED';

CREATE UNIQUE INDEX "ImportRun_one_active_stock_per_branch_idx"
    ON "ImportRun" ("branchId")
    WHERE "kind" = 'STOCK' AND "status" IN ('COMMITTING', 'COMMITTED');

CREATE INDEX "ImportRun_branchId_kind_fileSha256_idx"
    ON "ImportRun" ("branchId", "kind", "fileSha256");

CREATE INDEX "ImportRun_branchId_createdAt_idx"
    ON "ImportRun" ("branchId", "createdAt");
