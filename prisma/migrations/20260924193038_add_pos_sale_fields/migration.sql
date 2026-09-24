/*
  Warnings:

  - A unique constraint covering the columns `[soldById,checkoutRequestId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SaleMode" AS ENUM ('PACK', 'UNIT');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "checkoutRequestId" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "saleMode" "SaleMode";

-- CreateIndex
CREATE UNIQUE INDEX "Sale_soldById_checkoutRequestId_key" ON "Sale"("soldById", "checkoutRequestId");
