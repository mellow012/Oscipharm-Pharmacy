import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { databaseTarget, requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { redeemPasswordResetToken, createPasswordResetTokenForUser } from "./password-reset.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
assert.ok(process.env.DATABASE_URL, "DB test must run via npm run test:db");
assert.equal(databaseTarget(process.env.DATABASE_URL), databaseTarget(testDatabaseUrl), "DB test must run via npm run test:db");
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

test("Admin password reset writes a global audit event (null branchId)", async () => {
  const user = await prisma.user.create({
    data: {
      name: "Global Admin Reset Test",
      email: `global-admin-reset-${Date.now()}-${Math.random()}@example.test`,
      passwordHash: "initial-hash",
      role: "ADMIN",
      branchId: null,
    },
  });

  try {
    const { token } = await createPasswordResetTokenForUser(user.id);
    const redeemedUser = await redeemPasswordResetToken(token, "GlobalAdminReset123");

    assert.equal(redeemedUser?.id, user.id);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { userId: user.id, action: "PASSWORD_RESET_COMPLETED" },
      select: { branchId: true, details: true },
    });
    assert.equal(audit.branchId, null);
    assert.deepEqual(audit.details, { event: "password_reset_completed" });
  } finally {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test.after(async () => prisma.$disconnect());