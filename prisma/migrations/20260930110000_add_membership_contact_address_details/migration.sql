ALTER TABLE "MembershipApplication"
    RENAME COLUMN "interests" TO "healthConditions";

ALTER TABLE "MembershipApplication"
    ADD COLUMN "workPlace" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "currentAddress" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "village" TEXT NOT NULL DEFAULT '';

ALTER TABLE "MembershipApplication"
    ALTER COLUMN "workPlace" DROP DEFAULT,
    ALTER COLUMN "currentAddress" DROP DEFAULT,
    ALTER COLUMN "village" DROP DEFAULT;
