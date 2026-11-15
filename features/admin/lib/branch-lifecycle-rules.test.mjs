import assert from "node:assert/strict";
import test from "node:test";
import { BRANCH_LIFECYCLE_AUDIT_ACTIONS, canArchiveBranch, canArchiveStaff, canDeleteBranch, ensureBranchNameInAuditDetails, filterManagementRows, getManagementStatusCounts, parseManagementStatus } from "./branch-lifecycle-rules.ts";

const clear = { branches: 2, users: 0, invitations: 0, batches: 0, prices: 0, sales: 0, importRuns: 0, auditRows: 0, lifecycleAuditRows: 0 };

test("branch deletion allows lifecycle audit rows but no blockers", () => {
  assert.equal(canDeleteBranch({ ...clear, auditRows: 4, lifecycleAuditRows: 4 }).allowed, true);
  assert.deepEqual(BRANCH_LIFECYCLE_AUDIT_ACTIONS, ["BRANCH_CREATED", "BRANCH_UPDATED", "BRANCH_DEACTIVATED", "BRANCH_REACTIVATED"]);
});

test("branch deletion refuses the only remaining branch", () => {
  assert.equal(canDeleteBranch({ ...clear, branches: 1 }).allowed, false);
});

for (const field of ["users", "invitations", "batches", "prices", "sales", "importRuns", "auditRows"]) {
  test(`branch deletion is blocked by ${field}`, () => {
    const result = canDeleteBranch({ ...clear, [field]: 1 });
    assert.equal(result.allowed, false);
    assert.match(result.message, /can't be deleted/i);
  });
}

test("an audit row beyond lifecycle history blocks branch deletion", () => {
  assert.equal(canDeleteBranch({ ...clear, auditRows: 5, lifecycleAuditRows: 4 }).allowed, false);
});

test("branch archive requires inactive state and another remaining branch", () => {
  assert.equal(canArchiveBranch({ isActive: true, remainingBranches: 2 }).allowed, false);
  assert.equal(canArchiveBranch({ isActive: false, remainingBranches: 1 }).allowed, false);
  assert.equal(canArchiveBranch({ isActive: false, remainingBranches: 2 }).allowed, true);
});

test("staff archive requires inactive and protects primary admin", () => {
  assert.equal(canArchiveStaff({ isActive: true, isPrimaryAdmin: false }).allowed, false);
  assert.equal(canArchiveStaff({ isActive: false, isPrimaryAdmin: true }).allowed, false);
  assert.equal(canArchiveStaff({ isActive: false, isPrimaryAdmin: false }).allowed, true);
});

test("status parsing defaults to active and supports archived", () => {
  for (const [value, expected] of [[undefined, "active"], ["active", "active"], ["inactive", "inactive"], ["all", "all"], ["archived", "archived"], ["bad", "active"], [["archived", "all"], "archived"]]) {
    assert.equal(parseManagementStatus(value), expected);
  }
});


test("detached lifecycle audit details retain or gain the branch name", () => {
  assert.deepEqual(ensureBranchNameInAuditDetails({ after: { name: "North" } }, "North"), { after: { name: "North" } });
  assert.deepEqual(ensureBranchNameInAuditDetails({ event: "BRANCH_ARCHIVED" }, "North"), { event: "BRANCH_ARCHIVED", branchName: "North" });
});

test("status filtering defaults exclude archived rows and All includes everything", () => {
  const rows = [
    { id: "active", isActive: true, archivedAt: null },
    { id: "inactive", isActive: false, archivedAt: null },
    { id: "archived", isActive: false, archivedAt: new Date() },
  ];
  assert.deepEqual(filterManagementRows(rows, "active").map((row) => row.id), ["active"]);
  assert.deepEqual(filterManagementRows(rows, "inactive").map((row) => row.id), ["inactive"]);
  assert.deepEqual(filterManagementRows(rows, "archived").map((row) => row.id), ["archived"]);
  assert.deepEqual(filterManagementRows(rows, "all").map((row) => row.id), ["active", "inactive", "archived"]);
  assert.deepEqual(getManagementStatusCounts(rows), { active: 1, inactive: 1, archived: 1, all: 3 });
});