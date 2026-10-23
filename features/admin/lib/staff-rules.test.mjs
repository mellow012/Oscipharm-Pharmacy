import assert from "node:assert/strict";
import test from "node:test";
import { decideSelfAction, validateRoleBranch, wouldRemoveLastActiveAdmin } from "./staff-rules.ts";

test("validateRoleBranch enforces the role and branch matrix", () => {
  assert.equal(validateRoleBranch({ role: "ADMIN", branchId: "branch-1" }).ok, false);
  assert.deepEqual(validateRoleBranch({ role: "ADMIN", branchId: null }), { ok: true });
  assert.equal(validateRoleBranch({ role: "BRANCH_MANAGER", branchId: null }).ok, false);
  assert.equal(validateRoleBranch({ role: "POS", branchId: null }).ok, false);
  assert.equal(validateRoleBranch({ role: "POS", branchId: "" }).ok, false);
  assert.equal(validateRoleBranch({ role: "SUPERVISOR", branchId: "branch-1" }).ok, false);
});

test("wouldRemoveLastActiveAdmin protects the final active Admin", () => {
  assert.equal(wouldRemoveLastActiveAdmin({ targetIsActiveAdmin: true, activeAdminCount: 1 }), true);
  assert.equal(wouldRemoveLastActiveAdmin({ targetIsActiveAdmin: true, activeAdminCount: 2 }), false);
  assert.equal(wouldRemoveLastActiveAdmin({ targetIsActiveAdmin: false, activeAdminCount: 1 }), false);
  assert.equal(wouldRemoveLastActiveAdmin({ targetIsActiveAdmin: false, activeAdminCount: 0 }), false);
});

test("decideSelfAction blocks self-deactivation and role changes but allows reset links", () => {
  assert.equal(decideSelfAction({ actorId: "same", targetId: "same", action: "deactivate" }).ok, false);
  assert.equal(decideSelfAction({ actorId: "same", targetId: "same", action: "change_role" }).ok, false);
  assert.deepEqual(decideSelfAction({ actorId: "same", targetId: "same", action: "reset_link" }), { ok: true });
  assert.deepEqual(decideSelfAction({ actorId: "admin", targetId: "staff", action: "deactivate" }), { ok: true });
});