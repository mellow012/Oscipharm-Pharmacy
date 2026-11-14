import assert from "node:assert/strict";
import test from "node:test";
import { assertStockImportAccess, can, getImportAccess } from "./permissions.ts";

test("POS has the requested view and import permissions only", () => {
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
