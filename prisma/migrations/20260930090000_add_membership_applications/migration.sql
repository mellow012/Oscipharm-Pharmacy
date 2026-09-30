CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
CREATE TYPE "MembershipContactPreference" AS ENUM ('PHONE', 'EMAIL');
CREATE TYPE "MembershipTier" AS ENUM ('CHRONIC_ILLNESS', 'GENERAL_SICKNESS');

CREATE TABLE "MembershipApplication" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "interests" TEXT[] NOT NULL,
    "contactPreference" "MembershipContactPreference" NOT NULL,
    "updatesConsentAt" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "discountTier" "MembershipTier",
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipApplication_status_createdAt_idx" ON "MembershipApplication"("status", "createdAt");
CREATE UNIQUE INDEX "MembershipApplication_phone_key" ON "MembershipApplication"("phone");

ALTER TABLE "Sale"
    ADD COLUMN "subtotalAmount" DECIMAL(10,2),
    ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "membershipDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN "membershipApplicationId" TEXT;

UPDATE "Sale" SET "subtotalAmount" = "totalAmount" WHERE "subtotalAmount" IS NULL;
ALTER TABLE "Sale" ALTER COLUMN "subtotalAmount" SET NOT NULL;

CREATE INDEX "Sale_membershipApplicationId_idx" ON "Sale"("membershipApplicationId");
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_membershipApplicationId_fkey"
    FOREIGN KEY ("membershipApplicationId") REFERENCES "MembershipApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
