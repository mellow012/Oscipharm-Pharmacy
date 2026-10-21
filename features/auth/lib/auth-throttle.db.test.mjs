import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import {
  AUTH_EMAIL_MAX_FAILED_ATTEMPTS,
  AUTH_THROTTLE_SCOPES,
  hashAuthThrottleSubject,
  isAuthSubjectLocked,
  recordAuthFailure,
  resetAuthEmailFailures,
} from "./auth-throttle.ts";

const databaseUrl = requireTestDatabaseUrl();
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const testSecret = "db-test-only-secret";

async function deleteThrottle(scope, subjectHash) {
  await prisma.$executeRaw`DELETE FROM "AuthThrottle" WHERE "scope" = ${scope}::"AuthThrottleScope" AND "subjectHash" = ${subjectHash}`;
}

test("AuthThrottle persists email lockout, resets after expiry, and caps concurrent failures", async () => {
  const emailHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, `test-${Date.now()}@example.test`, testSecret);
  const parallelHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, `parallel-${Date.now()}@example.test`, testSecret);
  try {
    for (let index = 0; index < AUTH_EMAIL_MAX_FAILED_ATTEMPTS; index += 1) {
      await recordAuthFailure(prisma, AUTH_THROTTLE_SCOPES.email, emailHash);
    }
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.email, emailHash), true);
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.email, emailHash), true, "the sixth attempt must be blocked before password verification");

    await prisma.$executeRaw`UPDATE "AuthThrottle" SET "lockedUntil" = NOW() - INTERVAL '1 second' WHERE "scope" = 'EMAIL'::"AuthThrottleScope" AND "subjectHash" = ${emailHash}`;
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.email, emailHash), false);
    await resetAuthEmailFailures(prisma, emailHash);
    const resetRows = await prisma.$queryRaw`SELECT COUNT(*)::bigint AS count FROM "AuthThrottle" WHERE "scope" = 'EMAIL'::"AuthThrottleScope" AND "subjectHash" = ${emailHash}`;
    assert.equal(Number(resetRows[0].count), 0);

    await Promise.all(Array.from({ length: 30 }, () => recordAuthFailure(prisma, AUTH_THROTTLE_SCOPES.email, parallelHash)));
    const rows = await prisma.$queryRaw`SELECT "failedAttempts", "lockedUntil" FROM "AuthThrottle" WHERE "scope" = 'EMAIL'::"AuthThrottleScope" AND "subjectHash" = ${parallelHash}`;
    assert.equal(rows[0].failedAttempts, AUTH_EMAIL_MAX_FAILED_ATTEMPTS);
    assert.ok(rows[0].lockedUntil);
  } finally {
    await deleteThrottle(AUTH_THROTTLE_SCOPES.email, emailHash);
    await deleteThrottle(AUTH_THROTTLE_SCOPES.email, parallelHash);
  }
});

test.after(async () => prisma.$disconnect());
