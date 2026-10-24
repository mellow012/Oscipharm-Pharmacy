import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { databaseTarget, requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import {
  changeStaffRoleAndBranch,
  deactivateStaff,
  listStaffBranchesForAdmin,
  listStaffForAdmin,
  listTeamForManager,
  reactivateStaff,
  sendStaffResetLink,
} from "./staff-service.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
assert.ok(process.env.DATABASE_URL, "DB test must run via npm run test:db");
assert.equal(databaseTarget(process.env.DATABASE_URL), databaseTarget(testDatabaseUrl), "DB test must run via npm run test:db");
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

async function createBranch(label) {
  return prisma.branch.create({ data: { name: `Staff lifecycle ${label} ${Date.now()} ${Math.random()}` } });
}

async function createUser({ label, role, branchId = null, isActive = true }) {
  return prisma.user.create({
    data: {
      name: `Staff lifecycle ${label}`,
      email: `staff-lifecycle-${label}-${Date.now()}-${Math.random()}@example.test`,
      passwordHash: "test-only-hash",
      role,
      branchId,
      isActive,
    },
  });
}

async function cleanup({ users = [], branches = [] }) {
  const userIds = users.map((user) => user.id);
  if (userIds.length) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (branches.length) await prisma.branch.deleteMany({ where: { id: { in: branches.map((branch) => branch.id) } } });
}

test("concurrent demotions preserve at least one active Admin", async () => {
  const otherActiveAdmins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, isActive: true },
  });
  const branch = await createBranch("concurrent");
  const adminA = await createUser({ label: "concurrent-a", role: "ADMIN" });
  const adminB = await createUser({ label: "concurrent-b", role: "ADMIN" });
  const users = [adminA, adminB];
  try {
    if (otherActiveAdmins.length) {
      await prisma.user.updateMany({ where: { id: { in: otherActiveAdmins.map((user) => user.id) } }, data: { isActive: false } });
    }
    const results = await Promise.all([
      changeStaffRoleAndBranch(adminA.id, { userId: adminB.id, role: "BRANCH_MANAGER", branchId: branch.id }),
      changeStaffRoleAndBranch(adminB.id, { userId: adminA.id, role: "BRANCH_MANAGER", branchId: branch.id }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.ok(await prisma.user.count({ where: { role: "ADMIN", isActive: true } }) >= 1);
  } finally {
    await cleanup({ users, branches: [branch] });
    if (otherActiveAdmins.length) {
      await prisma.user.updateMany({ where: { id: { in: otherActiveAdmins.map((user) => user.id) } }, data: { isActive: true } });
    }
  }
});

test("the sole active Admin cannot be deactivated or demoted", async () => {
  const branch = await createBranch("last-admin");
  const admin = await createUser({ label: "last-admin", role: "ADMIN" });
  const otherActiveAdmins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, id: { not: admin.id } },
    select: { id: true },
  });
  try {
    if (otherActiveAdmins.length) {
      await prisma.user.updateMany({ where: { id: { in: otherActiveAdmins.map((user) => user.id) } }, data: { isActive: false } });
    }
    const deactivateResult = await deactivateStaff(admin.id, admin.id);
    const demoteResult = await changeStaffRoleAndBranch(admin.id, { userId: admin.id, role: "POS", branchId: branch.id });
    assert.equal(deactivateResult.ok, false);
    assert.equal(demoteResult.ok, false);
    assert.equal(deactivateResult.message, "At least one active admin is required.");
    assert.equal(demoteResult.message, "At least one active admin is required.");
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { role: true, isActive: true } }), { role: "ADMIN", isActive: true });
  } finally {
    await cleanup({ users: [admin], branches: [branch] });
    if (otherActiveAdmins.length) {
      await prisma.user.updateMany({ where: { id: { in: otherActiveAdmins.map((user) => user.id) } }, data: { isActive: true } });
    }
  }
});

test("Admin self-deactivation and self-role change are rejected", async () => {
  const branch = await createBranch("self");
  const admin = await createUser({ label: "self-admin", role: "ADMIN" });
  const peerAdmin = await createUser({ label: "self-peer-admin", role: "ADMIN" });
  try {
    assert.equal((await deactivateStaff(admin.id, admin.id)).ok, false);
    assert.equal((await changeStaffRoleAndBranch(admin.id, { userId: admin.id, role: "BRANCH_MANAGER", branchId: branch.id })).ok, false);
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { role: true, isActive: true } }), { role: "ADMIN", isActive: true });
  } finally {
    await cleanup({ users: [admin, peerAdmin], branches: [branch] });
  }
});

test("deactivation and reactivation audit global Admin actions with null branch", async () => {
  const branch = await createBranch("toggle");
  const admin = await createUser({ label: "toggle-admin", role: "ADMIN" });
  const target = await createUser({ label: "toggle-target", role: "POS", branchId: branch.id });
  try {
    assert.equal((await deactivateStaff(admin.id, target.id)).ok, true);
    assert.equal((await reactivateStaff(admin.id, target.id)).ok, true);
    const auditRows = await prisma.auditLog.findMany({
      where: { userId: admin.id, details: { path: ["targetUserId"], equals: target.id } },
      select: { action: true, branchId: true },
    });
    assert.deepEqual(auditRows.map((row) => row.action).sort(), ["STAFF_DEACTIVATED", "STAFF_REACTIVATED"]);
    assert.ok(auditRows.every((row) => row.branchId === null));
  } finally {
    await cleanup({ users: [admin, target], branches: [branch] });
  }
});

test("role and branch change is atomic and writes both audit events", async () => {
  const branchA = await createBranch("move-a");
  const branchB = await createBranch("move-b");
  const admin = await createUser({ label: "move-admin", role: "ADMIN" });
  const target = await createUser({ label: "move-target", role: "POS", branchId: branchA.id });
  try {
    const result = await changeStaffRoleAndBranch(admin.id, { userId: target.id, role: "BRANCH_MANAGER", branchId: branchB.id });
    assert.equal(result.ok, true);
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: target.id }, select: { role: true, branchId: true } }), {
      role: "BRANCH_MANAGER",
      branchId: branchB.id,
    });
    const auditRows = await prisma.auditLog.findMany({
      where: { userId: admin.id, details: { path: ["targetUserId"], equals: target.id } },
      select: { action: true, branchId: true, details: true },
    });
    assert.equal(auditRows.length, 2);
    assert.deepEqual(auditRows.map((row) => row.action).sort(), ["STAFF_BRANCH_CHANGED", "STAFF_ROLE_CHANGED"]);
    assert.ok(auditRows.every((row) => row.branchId === null));
  } finally {
    await cleanup({ users: [admin, target], branches: [branchA, branchB] });
  }
});

test("invalid role and branch assignments are rejected without changing the user", async () => {
  const branch = await createBranch("invalid");
  const admin = await createUser({ label: "invalid-admin", role: "ADMIN" });
  const target = await createUser({ label: "invalid-target", role: "POS", branchId: branch.id });
  try {
    const invalidInputs = [
      { role: "ADMIN", branchId: branch.id },
      { role: "POS", branchId: null },
      { role: "BRANCH_MANAGER", branchId: "missing-branch-id" },
      { role: "UNKNOWN", branchId: branch.id },
    ];
    for (const input of invalidInputs) {
      assert.equal((await changeStaffRoleAndBranch(admin.id, { userId: target.id, ...input })).ok, false);
    }
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: target.id }, select: { role: true, branchId: true } }), {
      role: "POS",
      branchId: branch.id,
    });
  } finally {
    await cleanup({ users: [admin, target], branches: [branch] });
  }
});

test("staff cannot be assigned to an inactive branch", async () => {
  const branch = await createBranch("inactive-assignment");
  const admin = await createUser({ label: "inactive-assignment-admin", role: "ADMIN" });
  const target = await createUser({ label: "inactive-assignment-target", role: "POS", branchId: branch.id });
  try {
    await prisma.branch.update({ where: { id: branch.id }, data: { isActive: false } });
    const result = await changeStaffRoleAndBranch(admin.id, { userId: target.id, role: "BRANCH_MANAGER", branchId: branch.id });
    assert.equal(result.ok, false);
    assert.match(result.message, /inactive/i);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).role, "POS");
  } finally {
    await cleanup({ users: [admin, target], branches: [branch] });
  }
});

test("inactive staff cannot be reactivated while their assigned branch is inactive", async () => {
  const branch = await createBranch("inactive-reactivation");
  const admin = await createUser({ label: "inactive-reactivation-admin", role: "ADMIN" });
  const target = await createUser({ label: "inactive-reactivation-target", role: "POS", branchId: branch.id, isActive: false });
  try {
    await prisma.branch.update({ where: { id: branch.id }, data: { isActive: false } });
    const result = await reactivateStaff(admin.id, target.id);
    assert.equal(result.ok, false);
    assert.match(result.message, /inactive branch/i);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).isActive, false);
  } finally {
    await cleanup({ users: [admin, target], branches: [branch] });
  }
});

test("manager team list includes only the manager's branch and never an Admin", async () => {
  const branchA = await createBranch("team-a");
  const branchB = await createBranch("team-b");
  const manager = await createUser({ label: "team-manager", role: "BRANCH_MANAGER", branchId: branchA.id });
  const colleague = await createUser({ label: "team-colleague", role: "POS", branchId: branchA.id });
  const otherBranchUser = await createUser({ label: "team-other", role: "POS", branchId: branchB.id });
  const admin = await createUser({ label: "team-admin", role: "ADMIN", branchId: branchA.id });
  try {
    const result = await listTeamForManager(manager.id);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const listedIds = result.users.map((user) => user.id);
    assert.ok(listedIds.includes(manager.id));
    assert.ok(listedIds.includes(colleague.id));
    assert.ok(!listedIds.includes(otherBranchUser.id));
    assert.ok(!listedIds.includes(admin.id));
  } finally {
    await cleanup({ users: [manager, colleague, otherBranchUser, admin], branches: [branchA, branchB] });
  }
});

test("manager without branch assignment cannot list a team", async () => {
  const manager = await createUser({ label: "team-no-branch", role: "BRANCH_MANAGER" });
  try {
    assert.deepEqual(await listTeamForManager(manager.id), {
      ok: false,
      message: "Your account has no branch assigned. Ask an admin.",
    });
  } finally {
    await cleanup({ users: [manager] });
  }
});

test("reset link rejects inactive targets and reports missing SMTP without a sent audit", async () => {
  const branch = await createBranch("reset-mail");
  const admin = await createUser({ label: "reset-mail-admin", role: "ADMIN" });
  const inactive = await createUser({ label: "reset-mail-inactive", role: "POS", branchId: branch.id, isActive: false });
  const active = await createUser({ label: "reset-mail-active", role: "POS", branchId: branch.id });
  const envKeys = ["APP_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalLog = console.log;
  try {
    process.env.APP_URL = "http://localhost:3000";
    for (const key of envKeys.filter((name) => name !== "APP_URL")) delete process.env[key];
    console.log = () => {};

    assert.deepEqual(await sendStaffResetLink(admin.id, inactive.id), {
      ok: false,
      message: "Reactivate this account before sending a reset link.",
    });
    const notSent = await sendStaffResetLink(admin.id, active.id);
    assert.deepEqual(notSent, { ok: false, message: "Email could not be sent. The previous reset link no longer works; try again." });
    assert.equal(await prisma.auditLog.count({ where: { userId: admin.id, action: "STAFF_RESET_LINK_SENT" } }), 0);
  } finally {
    console.log = originalLog;
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
    await cleanup({ users: [admin, inactive, active], branches: [branch] });
  }
});

test("all Admin service functions reject manager, POS, and inactive Admin actors", async () => {
  const branch = await createBranch("denied");
  const manager = await createUser({ label: "denied-manager", role: "BRANCH_MANAGER", branchId: branch.id });
  const pos = await createUser({ label: "denied-pos", role: "POS", branchId: branch.id });
  const inactiveAdmin = await createUser({ label: "denied-inactive-admin", role: "ADMIN", isActive: false });
  const target = await createUser({ label: "denied-target", role: "POS", branchId: branch.id });
  const actors = [manager, pos, inactiveAdmin];
  try {
    for (const actor of actors) {
      assert.equal((await listStaffForAdmin(actor.id)).ok, false);
      assert.equal((await listStaffBranchesForAdmin(actor.id)).ok, false);
      assert.equal((await changeStaffRoleAndBranch(actor.id, { userId: target.id, role: "BRANCH_MANAGER", branchId: branch.id })).ok, false);
      assert.equal((await deactivateStaff(actor.id, target.id)).ok, false);
      assert.equal((await reactivateStaff(actor.id, target.id)).ok, false);
      assert.equal((await sendStaffResetLink(actor.id, target.id)).ok, false);
    }
  } finally {
    await cleanup({ users: [...actors, target], branches: [branch] });
  }
});

test("staff list results never expose password hashes", async () => {
  const branch = await createBranch("select");
  const admin = await createUser({ label: "select-admin", role: "ADMIN" });
  const manager = await createUser({ label: "select-manager", role: "BRANCH_MANAGER", branchId: branch.id });
  const staff = await createUser({ label: "select-pos", role: "POS", branchId: branch.id });
  try {
    const results = [
      await listStaffForAdmin(admin.id),
      await listStaffBranchesForAdmin(admin.id),
      await listTeamForManager(manager.id),
      await changeStaffRoleAndBranch(admin.id, { userId: "missing-target", role: "POS", branchId: branch.id }),
      await deactivateStaff(admin.id, "missing-target"),
      await reactivateStaff(admin.id, "missing-target"),
      await sendStaffResetLink(admin.id, "missing-target"),
    ];
    for (const result of results) {
      assert.equal(JSON.stringify(result).includes("passwordHash"), false);
    }
  } finally {
    await cleanup({ users: [admin, manager, staff], branches: [branch] });
  }
});

test.after(async () => prisma.$disconnect());