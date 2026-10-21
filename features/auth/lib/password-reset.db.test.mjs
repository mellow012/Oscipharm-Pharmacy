import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { databaseTarget, requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { hashToken } from "../../../lib/tokens.ts";
import { AUTH_EMAIL_MAX_FAILED_ATTEMPTS, AUTH_THROTTLE_SCOPES, getAuthThrottleSecret, hashAuthThrottleSubject, isAuthSubjectLocked, recordAuthFailure, recordPasswordResetRequestThrottle } from "./auth-throttle.ts";
import { createPasswordResetTokenForUser, redeemPasswordResetToken } from "./password-reset.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
assert.ok(process.env.DATABASE_URL, "DB test must run via npm run test:db");
assert.equal(databaseTarget(process.env.DATABASE_URL), databaseTarget(testDatabaseUrl), "DB test must run via npm run test:db");
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
const secret = "password-reset-db-test-secret";

async function createUser(suffix) {
  const branch = await prisma.branch.create({ data: { name: `Reset Test ${suffix}` } });
  const user = await prisma.user.create({
    data: {
      name: "Password Reset Test",
      email: `password-reset-${suffix}@example.test`,
      passwordHash: "initial-hash",
      role: "ADMIN",
    },
  });
  return { branch, user };
}

async function clean({ branch, user }) {
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.branch.delete({ where: { id: branch.id } });
}

test("reset redemption is single-use, rejects expiry, and only one concurrent request wins", async () => {
  const context = await createUser(`single-${Date.now()}`);
  try {
    const first = await createPasswordResetTokenForUser(context.user.id, prisma);
    const firstResult = await redeemPasswordResetToken(first.token, "FirstPassword1", prisma);
    assert.equal(firstResult?.id, context.user.id);
    assert.equal(await redeemPasswordResetToken(first.token, "SecondPassword2", prisma), null);

    const expired = await createPasswordResetTokenForUser(context.user.id, prisma);
    await prisma.passwordResetToken.update({
      where: { tokenHash: hashToken(expired.token) },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    assert.equal(await redeemPasswordResetToken(expired.token, "ThirdPassword3", prisma), null);

    const concurrent = await createPasswordResetTokenForUser(context.user.id, prisma);
    const outcomes = await Promise.all([
      redeemPasswordResetToken(concurrent.token, "FourthPassword4", prisma),
      redeemPasswordResetToken(concurrent.token, "FifthPassword55", prisma),
    ]);
    assert.equal(outcomes.filter(Boolean).length, 1);
  } finally {
    await clean(context);
  }
});

test("new reset request invalidates the previous token", async () => {
  const context = await createUser(`replace-${Date.now()}`);
  try {
    const oldToken = await createPasswordResetTokenForUser(context.user.id, prisma);
    const newToken = await createPasswordResetTokenForUser(context.user.id, prisma);
    assert.equal(await redeemPasswordResetToken(oldToken.token, "OldPassword123", prisma), null);
    assert.equal((await redeemPasswordResetToken(newToken.token, "NewPassword123", prisma))?.id, context.user.id);
  } finally {
    await clean(context);
  }
});

test("reset request throttle counts an unknown email three times, blocks the fourth, and stays separate from login", async () => {
  const suffix = `${Date.now()}-${Math.random()}`;
  const resetEmailHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.resetEmail, `unknown-${suffix}@example.test`, secret);
  const resetIpHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.resetIp, `192.0.2.${Math.floor(Math.random() * 200) + 1}`, secret);
  const loginEmailHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, `unknown-${suffix}@example.test`, secret);
  const ipOnlyHashes = [];
  try {
    const unknownEmail = `unknown-${suffix}@example.test`;
    assert.equal(await prisma.user.findUnique({ where: { email: unknownEmail } }), null);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      assert.equal(await recordPasswordResetRequestThrottle(prisma, resetEmailHash, resetIpHash), true);
      assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.resetEmail, resetEmailHash), attempt === 3);
    }
    assert.equal(await recordPasswordResetRequestThrottle(prisma, resetEmailHash, resetIpHash), false);
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.resetEmail, resetEmailHash), true);
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.resetIp, resetIpHash), false);
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.email, loginEmailHash), false);

    const ipOnlyHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.resetIp, `198.51.100.${Math.floor(Math.random() * 200) + 1}`, secret);
    ipOnlyHashes.push(ipOnlyHash);
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const distinctEmail = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.resetEmail, `ip-${suffix}-${attempt}@example.test`, secret);
      ipOnlyHashes.push(distinctEmail);
      assert.equal(await recordPasswordResetRequestThrottle(prisma, distinctEmail, ipOnlyHash), true);
    }
    assert.equal(await recordPasswordResetRequestThrottle(
      prisma,
      hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.resetEmail, `ip-${suffix}-11@example.test`, secret),
      ipOnlyHash,
    ), false);
  } finally {
    await prisma.$executeRaw`DELETE FROM "AuthThrottle" WHERE "subjectHash" IN (${resetEmailHash}, ${resetIpHash}, ${loginEmailHash})`;
    for (const subjectHash of ipOnlyHashes) {
      await prisma.$executeRaw`DELETE FROM "AuthThrottle" WHERE "subjectHash" = ${subjectHash}`;
    }
  }
});

test("redemption stores a bcrypt password and writes an audit record without token material", async () => {
  const context = await createUser(`audit-${Date.now()}`);
  const emailHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, context.user.email, getAuthThrottleSecret());
  try {
    for (let attempt = 0; attempt < AUTH_EMAIL_MAX_FAILED_ATTEMPTS; attempt += 1) {
      await recordAuthFailure(prisma, AUTH_THROTTLE_SCOPES.email, emailHash);
    }
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.email, emailHash), true);
    const reset = await createPasswordResetTokenForUser(context.user.id, prisma);
    await redeemPasswordResetToken(reset.token, "AuditedPassword123", prisma);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: context.user.id } });
    assert.equal(await bcrypt.compare("AuditedPassword123", user.passwordHash), true);
    assert.ok(user.passwordChangedAt);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { userId: user.id, action: "PASSWORD_RESET_COMPLETED" } });
    assert.deepEqual(audit.details, { event: "password_reset_completed" });
    assert.equal(JSON.stringify(audit.details).includes(reset.token), false);
    assert.equal(await isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.email, emailHash), false);
    assert.equal(await prisma.$queryRaw`SELECT 1 FROM "AuthThrottle" WHERE "scope" = 'EMAIL'::"AuthThrottleScope" AND "subjectHash" = ${emailHash}`.then((rows) => rows.length), 0);
  } finally {
    await prisma.$executeRaw`DELETE FROM "AuthThrottle" WHERE "scope" = 'EMAIL'::"AuthThrottleScope" AND "subjectHash" = ${emailHash}`;
    await clean(context);
  }
});

test.after(async () => prisma.$disconnect());