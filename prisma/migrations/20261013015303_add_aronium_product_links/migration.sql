-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ARONIUM_LINK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ARONIUM_LINK_DELETED';

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AroniumProductLink" (
    "id" TEXT NOT NULL,
    "aroniumCode" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "mode" "SaleMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "AroniumProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AroniumProductLink_aroniumCode_key" ON "AroniumProductLink"("aroniumCode");

-- CreateIndex
CREATE UNIQUE INDEX "AroniumProductLink_variantId_mode_key" ON "AroniumProductLink"("variantId", "mode");

-- AddForeignKey
ALTER TABLE "AroniumProductLink" ADD CONSTRAINT "AroniumProductLink_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AroniumProductLink" ADD CONSTRAINT "AroniumProductLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
