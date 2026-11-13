-- CHECK constraints and the LOWER(name) functional unique index are not representable in schema.prisma; preserve them in migration history.

ALTER TABLE "Branch" ADD COLUMN "contactNumber" TEXT;

ALTER TABLE "Branch" ALTER COLUMN "location" SET NOT NULL;

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_location_not_blank_check" CHECK (BTRIM("location") <> '');

ALTER TABLE "User" ADD CONSTRAINT "User_admin_or_branch_check" CHECK ("role" = 'ADMIN' OR "branchId" IS NOT NULL);

ALTER TABLE "User" DROP CONSTRAINT "User_branchId_fkey", ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Branch_name_lower_key" ON "Branch" (LOWER("name"));

DROP INDEX "Branch_name_key";