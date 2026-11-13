import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { hashToken } from "../../../lib/tokens.ts";
import { createStaffInvitationService, INVALID_STAFF_INVITATION_MESSAGE } from "./staff-invitation-service.ts";
import { deactivateBranch } from "./branch-service.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

async function createBranch(label, isActive = true) {
  return prisma.branch.create({ data: { name: `Invitation ${label} ${Date.now()} ${Math.random()}`, location: "Test location", isActive } });
}

async function createUser({ label, role = "ADMIN", branchId = null, isActive = true, email } = {}) {
  return prisma.user.create({
    data: {
      name: `Invitation ${label ?? "user"}`,
      email: email ?? `invitation-${label ?? "user"}-${Date.now()}-${Math.random()}@example.test`,
      passwordHash: "test-only-hash",
      role,
      branchId,
      isActive,
    },
  });
}

async function cleanup({ users = [], branches = [] }) {
  const userIds = users.map((user) => user.id);
  const branchIds = branches.map((branch) => branch.id);
  const invitations = await prisma.staffInvitation.findMany({
    where: { OR: [ ...(userIds.length ? [{ invitedById: { in: userIds } }, { acceptedUserId: { in: userIds } }] : []), ...(branchIds.length ? [{ branchId: { in: branchIds } }] : []) ] },
    select: { id: true },
  });
  if (invitations.length) await prisma.staffInvitation.deleteMany({ where: { id: { in: invitations.map((row) => row.id) } } });
  if (userIds.length) await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  if (branchIds.length) await prisma.auditLog.deleteMany({ where: { branchId: { in: branchIds } } });
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (branchIds.length) await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
}

function makeService(sender = async () => ({ sent: true })) {
  return createStaffInvitationService(prisma, sender);
}

test("only active Admins can create, resend, revoke, or list invitations", async () => {
  const branch = await createBranch("authorization");
  const admin = await createUser({ label: "authorization-admin" });
  const manager = await createUser({ label: "authorization-manager", role: "BRANCH_MANAGER", branchId: branch.id });
  const inactiveAdmin = await createUser({ label: "authorization-inactive-admin", isActive: false });
  const service = makeService();
  try {
    for (const actor of [manager, inactiveAdmin]) {
      assert.equal((await service.createInvitation(actor.id, { email: `rejected-${actor.id}@example.test`, role: "ADMIN", branchId: null })).ok, false);
      assert.equal((await service.listPendingInvitations(actor.id)).ok, false);
    }
    const created = await service.createInvitation(admin.id, { email: `authorized-${Date.now()}@example.test`, role: "ADMIN", branchId: null });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal((await service.resendInvitation(manager.id, created.invitation.id)).ok, false);
    assert.equal((await service.revokeInvitation(inactiveAdmin.id, created.invitation.id)).ok, false);
  } finally {
    await cleanup({ users: [admin, manager, inactiveAdmin], branches: [branch] });
  }
});

test("existing active and deactivated user emails cannot be invited", async () => {
  const admin = await createUser({ label: "existing-user-admin" });
  const assignedBranch = await createBranch("existing-inactive-user");
  const active = await createUser({ label: "existing-active-user", email: `existing-active-${Date.now()}@example.test` });
  const inactive = await createUser({ label: "existing-inactive-user", role: "POS", branchId: assignedBranch.id, isActive: false, email: `existing-inactive-${Date.now()}@example.test` });
  const service = makeService();
  try {
    const activeResult = await service.createInvitation(admin.id, { email: active.email, role: "ADMIN", branchId: null });
    const inactiveResult = await service.createInvitation(admin.id, { email: inactive.email, role: "POS", branchId: assignedBranch.id });
    assert.match(activeResult.message, /already has an account/i);
    assert.match(inactiveResult.message, /reactivat/i);
  } finally {
    await cleanup({ users: [admin, active, inactive], branches: [assignedBranch] });
  }
});

test("role and branch validation rejects missing, invalid, and inactive branches", async () => {
  const admin = await createUser({ label: "validation-admin" });
  const branch = await createBranch("validation");
  const inactiveBranch = await createBranch("validation-inactive", false);
  const service = makeService();
  try {
    assert.equal((await service.createInvitation(admin.id, { email: `bad-role-${Date.now()}@example.test`, role: "NOPE", branchId: branch.id })).ok, false);
    assert.equal((await service.createInvitation(admin.id, { email: `missing-branch-${Date.now()}@example.test`, role: "POS", branchId: null })).ok, false);
    assert.equal((await service.createInvitation(admin.id, { email: `admin-branch-${Date.now()}@example.test`, role: "ADMIN", branchId: branch.id })).ok, false);
    assert.match((await service.createInvitation(admin.id, { email: `inactive-branch-${Date.now()}@example.test`, role: "BRANCH_MANAGER", branchId: inactiveBranch.id })).message, /inactive/i);
  } finally {
    await cleanup({ users: [admin], branches: [branch, inactiveBranch] });
  }
});

test("pending email is unique case-insensitively across branches and resend rotates token and expiry", async () => {
  const admin = await createUser({ label: "resend-admin" });
  const branchA = await createBranch("resend-a");
  const branchB = await createBranch("resend-b");
  const sentTokens = [];
  const service = makeService(async ({ token }) => { sentTokens.push(token); return { sent: true }; });
  try {
    const email = `ReSend-${Date.now()}@Example.test`;
    const created = await service.createInvitation(admin.id, { email, role: "BRANCH_MANAGER", branchId: branchA.id });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const duplicate = await service.createInvitation(admin.id, { email: email.toLowerCase(), role: "POS", branchId: branchB.id });
    assert.equal(duplicate.ok, false);

    const oldHash = (await prisma.staffInvitation.findUniqueOrThrow({ where: { id: created.invitation.id } })).tokenHash;
    const oldExpiry = created.invitation.expiresAt;
    const resent = await service.resendInvitation(admin.id, created.invitation.id);
    assert.equal(resent.ok, true);
    if (!resent.ok) return;
    assert.ok(resent.invitation.expiresAt > oldExpiry);
    assert.equal(await prisma.staffInvitation.findUnique({ where: { tokenHash: oldHash } }), null);
    assert.notEqual((await prisma.staffInvitation.findUniqueOrThrow({ where: { id: created.invitation.id } })).tokenHash, oldHash);
    assert.equal(sentTokens.length, 2);
    const lifecycleAudit = await prisma.auditLog.findMany({
      where: { userId: admin.id, action: { in: ["STAFF_INVITATION_CREATED", "STAFF_INVITATION_RESENT"] } },
      orderBy: { action: "asc" },
    });
    assert.deepEqual(lifecycleAudit.map((row) => row.action).sort(), ["STAFF_INVITATION_CREATED", "STAFF_INVITATION_RESENT"]);
    assert.ok(lifecycleAudit.every((row) => row.details.before !== undefined && row.details.after !== undefined));
  } finally {
    await cleanup({ users: [admin], branches: [branchA, branchB] });
  }
});

test("create, resend, revoke and list handle email delivery outcomes without exposing tokens", async () => {
  const admin = await createUser({ label: "mail-outcomes-admin" });
  const branch = await createBranch("mail-outcomes");
  const service = makeService(async () => ({ sent: false, reason: "not_configured" }));
  try {
    const created = await service.createInvitation(admin.id, { email: `mail-${Date.now()}@example.test`, role: "POS", branchId: branch.id });
    assert.equal(created.ok, false);
    assert.match(created.message, /email/i);
    const stored = await prisma.staffInvitation.findFirstOrThrow({ where: { invitedById: admin.id } });
    assert.equal(stored.status, "PENDING");
    assert.equal(stored.emailSentAt, null);
    assert.equal(JSON.stringify(created).includes(stored.tokenHash), false);

    const pending = await makeService().listPendingInvitations(admin.id);
    assert.equal(pending.invitations.length, 1);
    assert.equal(JSON.stringify(pending).includes(stored.tokenHash), false);
    const resendFailure = await service.resendInvitation(admin.id, stored.id);
    assert.equal(resendFailure.ok, false);
    assert.equal((await prisma.staffInvitation.findUniqueOrThrow({ where: { id: stored.id } })).status, "PENDING");

    const revoked = await makeService().revokeInvitation(admin.id, stored.id);
    assert.equal(revoked.ok, true);
    assert.equal((await prisma.staffInvitation.findUniqueOrThrow({ where: { id: stored.id } })).status, "REVOKED");
    const auditActions = await prisma.auditLog.findMany({ where: { userId: admin.id }, select: { action: true } });
    assert.ok(auditActions.some((row) => row.action === "STAFF_INVITATION_CREATED"));
    assert.ok(auditActions.some((row) => row.action === "STAFF_INVITATION_RESENT"));
    assert.ok(auditActions.some((row) => row.action === "STAFF_INVITATION_REVOKED"));
  } finally {
    await cleanup({ users: [admin], branches: [branch] });
  }
});

test("sender exceptions leave invitations pending without an email-sent timestamp", async () => {
  const admin = await createUser({ label: "mail-throw-admin" });
  const service = makeService(async () => { throw new Error("mail unavailable"); });
  try {
    const result = await service.createInvitation(admin.id, { email: `mail-throw-${Date.now()}@example.test`, role: "ADMIN", branchId: null });
    assert.equal(result.ok, false);
    assert.match(result.message, /email/i);
    const invitation = await prisma.staffInvitation.findFirstOrThrow({ where: { invitedById: admin.id } });
    assert.equal(invitation.status, "PENDING");
    assert.equal(invitation.emailSentAt, null);
  } finally {
    await cleanup({ users: [admin] });
  }
});

test("expired pending invitations are treated as expired and no longer block a new invite", async () => {
  const admin = await createUser({ label: "expired-admin" });
  const branch = await createBranch("expired");
  const service = makeService();
  try {
    const created = await service.createInvitation(admin.id, { email: `expired-${Date.now()}@example.test`, role: "POS", branchId: branch.id });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    await prisma.staffInvitation.update({ where: { id: created.invitation.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    assert.deepEqual(await service.listPendingInvitations(admin.id), { ok: true, message: "Pending invitations loaded.", invitations: [] });
    assert.equal((await prisma.staffInvitation.findUniqueOrThrow({ where: { id: created.invitation.id } })).status, "EXPIRED");
    const replacement = await service.createInvitation(admin.id, { email: created.invitation.email.toUpperCase(), role: "POS", branchId: branch.id });
    assert.equal(replacement.ok, true);
  } finally {
    await cleanup({ users: [admin], branches: [branch] });
  }
});

test("accept creates one User with invitation email, role, branch, password hash and audit", async () => {
  const admin = await createUser({ label: "accept-admin" });
  const branch = await createBranch("accept");
  let rawToken;
  const service = makeService(async ({ token }) => { rawToken = token; return { sent: true }; });
  try {
    const created = await service.createInvitation(admin.id, { email: `accept-${Date.now()}@example.test`, role: "BRANCH_MANAGER", branchId: branch.id });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const result = await service.acceptInvitation(rawToken, { name: "New Manager", password: "ValidPassword123" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId } });
    assert.equal(user.email, created.invitation.email);
    assert.equal(user.role, "BRANCH_MANAGER");
    assert.equal(user.branchId, branch.id);
    assert.equal(user.isActive, true);
    assert.equal(user.passwordChangedAt, null);
    assert.equal(await bcrypt.compare("ValidPassword123", user.passwordHash), true);
    const invitation = await prisma.staffInvitation.findUniqueOrThrow({ where: { id: created.invitation.id } });
    assert.equal(invitation.status, "ACCEPTED");
    assert.equal(invitation.acceptedUserId, user.id);
    const acceptanceAudit = await prisma.auditLog.findFirstOrThrow({ where: { action: "STAFF_INVITATION_ACCEPTED", userId: user.id } });
    assert.deepEqual(acceptanceAudit.details.before.status, "PENDING");
    assert.deepEqual(acceptanceAudit.details.after.status, "ACCEPTED");
  } finally {
    await cleanup({ users: [admin, ...(await prisma.user.findMany({ where: { name: "New Manager" } }))], branches: [branch] });
  }
});

test("acceptance rejects invalid, revoked, expired and reused tokens with one generic result", async () => {
  const admin = await createUser({ label: "token-states-admin" });
  const branch = await createBranch("token-states");
  let token;
  const service = makeService(async (input) => { token = input.token; return { sent: true }; });
  try {
    const revokedInvite = await service.createInvitation(admin.id, { email: `revoked-${Date.now()}@example.test`, role: "ADMIN", branchId: null });
    assert.equal(revokedInvite.ok, true);
    if (!revokedInvite.ok) return;
    const revokedToken = token;
    await service.revokeInvitation(admin.id, revokedInvite.invitation.id);
    assert.deepEqual(await service.acceptInvitation(revokedToken, { name: "Revoked", password: "ValidPassword123" }), { ok: false, message: INVALID_STAFF_INVITATION_MESSAGE });

    const expiredInvite = await service.createInvitation(admin.id, { email: `expired-token-${Date.now()}@example.test`, role: "ADMIN", branchId: null });
    assert.equal(expiredInvite.ok, true);
    if (!expiredInvite.ok) return;
    const expiredToken = token;
    await prisma.staffInvitation.update({ where: { id: expiredInvite.invitation.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    assert.deepEqual(await service.acceptInvitation(expiredToken, { name: "Expired", password: "ValidPassword123" }), { ok: false, message: INVALID_STAFF_INVITATION_MESSAGE });

    assert.deepEqual(await service.acceptInvitation("not-a-real-token", { name: "Wrong", password: "ValidPassword123" }), { ok: false, message: INVALID_STAFF_INVITATION_MESSAGE });
    const validInvite = await service.createInvitation(admin.id, { email: `used-${Date.now()}@example.test`, role: "ADMIN", branchId: null });
    assert.equal(validInvite.ok, true);
    if (!validInvite.ok) return;
    const validToken = token;
    const accepted = await service.acceptInvitation(validToken, { name: "Used", password: "ValidPassword123" });
    assert.equal(accepted.ok, true);
    assert.deepEqual(await service.acceptInvitation(validToken, { name: "Used Again", password: "ValidPassword123" }), { ok: false, message: INVALID_STAFF_INVITATION_MESSAGE });
  } finally {
    await cleanup({ users: [admin, ...(await prisma.user.findMany({ where: { name: { in: ["Used", "New Manager"] } } }))], branches: [branch] });
  }
});

test("concurrent accepts of one token create exactly one user", async () => {
  const admin = await createUser({ label: "concurrent-accept-admin" });
  let token;
  const service = makeService(async (input) => { token = input.token; return { sent: true }; });
  try {
    const created = await service.createInvitation(admin.id, { email: `concurrent-accept-${Date.now()}@example.test`, role: "ADMIN", branchId: null });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const results = await Promise.all([
      service.acceptInvitation(token, { name: "Concurrent One", password: "ValidPassword123" }),
      service.acceptInvitation(token, { name: "Concurrent Two", password: "ValidPassword123" }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(await prisma.user.count({ where: { email: created.invitation.email } }), 1);
  } finally {
    await cleanup({ users: [admin, ...(await prisma.user.findMany({ where: { name: { in: ["Concurrent One", "Concurrent Two"] } } }))] });
  }
});

test("pending invitation blocks branch deactivation with count, and create/deactivate races preserve the invariant", async () => {
  const admin = await createUser({ label: "branch-lock-admin" });
  const branch = await createBranch("branch-lock");
  const otherBranch = await createBranch("branch-lock-other");
  const service = makeService();
  try {
    const invite = await service.createInvitation(admin.id, { email: `pending-${Date.now()}@example.test`, role: "POS", branchId: branch.id });
    assert.equal(invite.ok, true);
    if (!invite.ok) return;
    const blocked = await deactivateBranch(admin.id, branch.id);
    assert.equal(blocked.ok, false);
    assert.match(blocked.message, /1 pending invitation.*revoke/i);
    await service.revokeInvitation(admin.id, invite.invitation.id);
    assert.equal((await deactivateBranch(admin.id, branch.id)).ok, true);

    await prisma.branch.update({ where: { id: branch.id }, data: { isActive: true } });
    const expiredInvite = await service.createInvitation(admin.id, { email: `pending-expired-${Date.now()}@example.test`, role: "POS", branchId: branch.id });
    assert.equal(expiredInvite.ok, true);
    if (!expiredInvite.ok) return;
    await prisma.staffInvitation.update({ where: { id: expiredInvite.invitation.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    assert.equal((await deactivateBranch(admin.id, branch.id)).ok, true);
    assert.equal((await prisma.staffInvitation.findUniqueOrThrow({ where: { id: expiredInvite.invitation.id } })).status, "EXPIRED");

    await prisma.branch.update({ where: { id: branch.id }, data: { isActive: true } });
    const email = `race-create-${Date.now()}@example.test`;
    const outcomes = await Promise.all([
      service.createInvitation(admin.id, { email, role: "POS", branchId: branch.id }),
      deactivateBranch(admin.id, branch.id),
    ]);
    const pendingCount = await prisma.staffInvitation.count({ where: { branchId: branch.id, status: "PENDING", expiresAt: { gt: new Date() } } });
    const currentBranch = await prisma.branch.findUniqueOrThrow({ where: { id: branch.id } });
    assert.ok(currentBranch.isActive || pendingCount === 0);
  } finally {
    await cleanup({ users: [admin], branches: [branch, otherBranch] });
  }
});

test("acceptance and branch deactivation serialize safely", async () => {
  const admin = await createUser({ label: "accept-deactivate-admin" });
  const branch = await createBranch("accept-deactivate");
  const otherBranch = await createBranch("accept-deactivate-other");
  let token;
  const service = makeService(async (input) => { token = input.token; return { sent: true }; });
  try {
    const created = await service.createInvitation(admin.id, { email: `accept-race-${Date.now()}@example.test`, role: "POS", branchId: branch.id });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    await service.revokeInvitation(admin.id, created.invitation.id);
    const fresh = await service.createInvitation(admin.id, { email: `accept-race-${Date.now()}@example.test`, role: "POS", branchId: branch.id });
    assert.equal(fresh.ok, true);
    if (!fresh.ok) return;
    const outcomes = await Promise.all([
      service.acceptInvitation(token, { name: "Race Invitee", password: "ValidPassword123" }),
      deactivateBranch(admin.id, branch.id),
    ]);
    const acceptedUser = await prisma.user.findUnique({ where: { email: fresh.invitation.email } });
    const currentBranch = await prisma.branch.findUniqueOrThrow({ where: { id: branch.id } });
    assert.ok(currentBranch.isActive || acceptedUser === null);
    assert.ok(outcomes.some((result) => result.ok));
  } finally {
    await cleanup({ users: [admin, ...(await prisma.user.findMany({ where: { name: "Race Invitee" } }))], branches: [branch, otherBranch] });
  }
});

test.after(async () => prisma.$disconnect());