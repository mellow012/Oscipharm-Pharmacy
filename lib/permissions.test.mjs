import assert from "node:assert/strict";
import test from "node:test";
import { assertStockImportAccess, can, getImportAccess, getMembersAccess } from "./permissions.ts";
import { getMemberLookupSelect } from "../features/membership/lib/member-lookup.ts";

test("POS has the requested view, member lookup and import permissions", () => {
  assert.equal(can("POS", "sales:view"), true);
  assert.equal(can("POS", "catalog:view"), true);
  assert.equal(can("POS", "inventory:view"), true);
  assert.equal(can("POS", "sales:import"), true);
  assert.equal(can("POS", "stock:import"), false);
  assert.equal(can("POS", "catalog:manage"), false);
  assert.equal(can("POS", "reports:branch:view"), false);
  assert.equal(can("POS", "stock:receive"), false);
  assert.equal(can("POS", "stock:adjust"), false);
  assert.equal(can("POS", "price:set"), false);
  assert.equal(can("POS", "members:view"), true);
});

test("member lookup is available to every staff role without changing review permissions", () => {
  for (const role of ["ADMIN", "BRANCH_MANAGER", "POS"]) {
    assert.equal(can(role, "members:view"), true, role);
    assert.deepEqual(getMembersAccess(role), { view: true }, role);
  }
  assert.equal(can("POS", "membership:manage"), false);
  assert.equal(can("BRANCH_MANAGER", "membership:manage"), true);
  assert.equal(can("ADMIN", "membership:manage"), true);
});

test("POS member lookup selection contains only permitted dispensing fields", () => {
  assert.deepEqual(Object.keys(getMemberLookupSelect("POS")), [
    "fullName",
    "phone",
    "discountTier",
    "status",
    "healthConditions",
    "otherHealthCondition",
  ]);
});

test("import permission matrix separates sales and stock access by role", () => {
  const expected = {
    ADMIN: { sales: true, stock: true, label: "Import" },
    BRANCH_MANAGER: { sales: true, stock: true, label: "Import" },
    POS: { sales: true, stock: false, label: "Import sales" },
  };

  for (const [role, access] of Object.entries(expected)) {
    assert.deepEqual(getImportAccess(role), { ...access, any: true }, role);
  }
});

test("stock import guard allows Admin and Branch Manager but refuses POS", () => {
  assert.doesNotThrow(() => assertStockImportAccess("ADMIN"));
  assert.doesNotThrow(() => assertStockImportAccess("BRANCH_MANAGER"));
  assert.throws(() => assertStockImportAccess("POS"), /not allowed to import stock/i);
});

test("stock adjustment is available to Admin and Branch Manager, not POS", () => {
  assert.equal(can("ADMIN", "stock:adjust"), true);
  assert.equal(can("BRANCH_MANAGER", "stock:adjust"), true);
  assert.equal(can("POS", "stock:adjust"), false);
});
