CREATE TYPE "AuthThrottleScope" AS ENUM ('EMAIL', 'IP');

CREATE TABLE "AuthThrottle" (
    "id" TEXT NOT NULL,
    "scope" "AuthThrottleScope" NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthThrottle_scope_subjectHash_key"
    ON "AuthThrottle" ("scope", "subjectHash");

CREATE INDEX "AuthThrottle_lockedUntil_idx"
    ON "AuthThrottle" ("lockedUntil");
