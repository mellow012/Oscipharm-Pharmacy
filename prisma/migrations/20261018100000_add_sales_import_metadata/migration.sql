-- Partial indexes are raw SQL on purpose; Prisma schema cannot express their predicates.
ALTER TABLE "ImportRun"
    ADD COLUMN "asOf" TIMESTAMP(3);

ALTER TABLE "Sale"
    ADD COLUMN "sourceDocumentNumber" TEXT,
    ADD COLUMN "refDocumentNumber" TEXT,
    ADD COLUMN "isRefund" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "stockAffected" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "sourceCashier" TEXT;

CREATE UNIQUE INDEX "Sale_branchId_sourceDocumentNumber_idx"
    ON "Sale" ("branchId", "sourceDocumentNumber")
    WHERE "sourceDocumentNumber" IS NOT NULL;
