import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { createBranch, deactivateBranch, reactivateBranch, updateBranch } from "./branch-service.ts";
import { getActiveBranches } from "./branch-queries.ts";
import { INACTIVE_BRANCH_WRITE_ERROR, lockActiveBranch } from "../../../lib/branch-write-guard.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

async function createAdmin(label) {
  return prisma.user.create({
    data: {
      name: `Branch Admin ${label}`,
      email: `branch-admin-${label}-${Date.now()}-${Math.random()}@example.test`,
      passwordHash: "test-only-hash",
      role: "ADMIN",
    },
  });
}

async function clean({ admin, branches = [] }) {
  await prisma.auditLog.deleteMany({ where: { userId: admin.id } });
  if (branches.length) await prisma.auditLog.deleteMany({ where: { branchId: { in: branches.map((branch) => branch.id) } } });
  await prisma.user.delete({ where: { id: admin.id } });
  if (branches.length) await prisma.branch.deleteMany({ where: { id: { in: branches.map((branch) => branch.id) } } });
}

test("branch create and update validate names and write before/after audits", async () => {
  const admin = await createAdmin("create-update");
  const branches = [];
  try {
    const created = await createBranch(admin.id, { name: `  North ${Date.now()}  `, location: " North District " });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const branch = await prisma.branch.findUniqueOrThrow({ where: { id: created.branch.id } });
    branches.push(branch);
    assert.equal(branch.name.startsWith("North "), true);
    assert.equal(branch.location, "North District");

    const updated = await updateBranch(admin.id, branch.id, { name: `${branch.name} Central`, location: "Central" });
    assert.equal(updated.ok, true);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { userId: admin.id, action: "BRANCH_UPDATED", branchId: branch.id },
      orderBy: { createdAt: "desc" },
    });
    assert.deepEqual(audit.details.before, { name: branch.name, location: "North District", isActive: true });
    assert.deepEqual(audit.details.after, { name: `${branch.name} Central`, location: "Central", isActive: true });

    const invalid = await createBranch(admin.id, { name: "  ", location: null });
    assert.equal(invalid.ok, false);
  } finally {
    await clean({ admin, branches });
  }
});

test("branch names are unique without regard to case", async () => {
  const admin = await createAdmin("unique-name");
  const branches = [];
  try {
    const first = await createBranch(admin.id, { name: `Unique ${Date.now()}`, location: null });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    branches.push(first.branch);
    const duplicate = await createBranch(admin.id, { name: first.branch.name.toUpperCase(), location: null });
    assert.equal(duplicate.ok, false);
    assert.match(duplicate.message, /already exists/i);
  } finally {
    await clean({ admin, branches });
  }
});

test("concurrent case-insensitive branch creation permits only one name", async () => {
  const admin = await createAdmin("concurrent-name");
  const branches = [];
  try {
    const name = `Concurrent Name ${Date.now()}`;
    const results = await Promise.all([
      createBranch(admin.id, { name, location: null }),
      createBranch(admin.id, { name: name.toUpperCase(), location: null }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    const winner = results.find((result) => result.ok);
    if (winner?.ok && winner.branch) branches.push(winner.branch);
  } finally {
    await clean({ admin, branches });
  }
});

test("shared active-branch write guard allows active branches and rejects inactive ones", async () => {
  const branch = await prisma.branch.create({ data: { name: `Guard ${Date.now()}` } });
  try {
    assert.equal(await prisma.$transaction((tx) => lockActiveBranch(tx, branch.id)), true);
    await prisma.branch.update({ where: { id: branch.id }, data: { isActive: false } });
    assert.equal(await prisma.$transaction((tx) => lockActiveBranch(tx, branch.id)), false);
    assert.equal(INACTIVE_BRANCH_WRITE_ERROR, "This branch is inactive and cannot be changed.");
  } finally {
    await prisma.branch.delete({ where: { id: branch.id } });
  }
});

test("branch deactivation rejects assigned active staff and the last active branch", async () => {
  const admin = await createAdmin("deactivate-rules");
  const branch = await prisma.branch.create({ data: { name: `Deactivate ${Date.now()}` } });
  const manager = await prisma.user.create({
    data: {
      name: "Assigned Manager",
      email: `assigned-manager-${Date.now()}-${Math.random()}@example.test`,
      passwordHash: "test-only-hash",
      role: "BRANCH_MANAGER",
      branchId: branch.id,
    },
  });
  const originallyActive = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true } });
  try {
    assert.deepEqual(await deactivateBranch(admin.id, branch.id), {
      ok: false,
      message: "Cannot deactivate this branch while 1 active staff member is assigned.",
    });
    await prisma.user.update({ where: { id: manager.id }, data: { isActive: false } });

    await prisma.branch.updateMany({ where: { id: { in: originallyActive.map((row) => row.id) } }, data: { isActive: false } });
    await prisma.branch.update({ where: { id: branch.id }, data: { isActive: true } });
    assert.deepEqual(await deactivateBranch(admin.id, branch.id), {
      ok: false,
      message: "At least one active branch must remain.",
    });
  } finally {
    await prisma.branch.updateMany({ where: { id: { in: originallyActive.map((row) => row.id) } }, data: { isActive: true } });
    await prisma.user.delete({ where: { id: manager.id } });
    await clean({ admin, branches: [branch] });
  }
});

test("concurrent deactivation leaves at least one active branch and lifecycle changes are audited", async () => {
  const admin = await createAdmin("concurrent-deactivate");
  const branches = await Promise.all([
    prisma.branch.create({ data: { name: `Concurrent A ${Date.now()}-${Math.random()}` } }),
    prisma.branch.create({ data: { name: `Concurrent B ${Date.now()}-${Math.random()}` } }),
  ]);
  const originallyActive = await prisma.branch.findMany({ where: { isActive: true, id: { notIn: branches.map((branch) => branch.id) } }, select: { id: true } });
  try {
    await prisma.branch.updateMany({ where: { id: { in: originallyActive.map((row) => row.id) } }, data: { isActive: false } });
    const results = await Promise.all(branches.map((branch) => deactivateBranch(admin.id, branch.id)));
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(await prisma.branch.count({ where: { isActive: true } }), 1);
    const remaining = await prisma.branch.findFirstOrThrow({ where: { isActive: true } });
    assert.deepEqual(await reactivateBranch(admin.id, branches.find((branch) => branch.id !== remaining.id).id), {
      ok: true,
      message: "Branch reactivated.",
    });
    const active = await getActiveBranches();
    assert.ok(active.some((branch) => branches.some((candidate) => candidate.id === branch.id)));
    assert.equal(await prisma.auditLog.count({ where: { userId: admin.id, action: { in: ["BRANCH_DEACTIVATED", "BRANCH_REACTIVATED"] } } }), 2);
  } finally {
    await prisma.branch.updateMany({ where: { id: { in: originallyActive.map((row) => row.id) } }, data: { isActive: true } });
    await clean({ admin, branches });
  }
});

test.after(async () => prisma.$disconnect());