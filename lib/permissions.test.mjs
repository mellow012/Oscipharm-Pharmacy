import assert from "node:assert/strict";
import test from "node:test";
import { can } from "./permissions.ts";

test("POS has the requested view and import permissions only", () => {
  assert.equal(can("POS", "sales:view"), true);
  assert.equal(can("POS", "catalog:view"), true);
  assert.equal(can("POS", "inventory:view"), true);
  assert.equal(can("POS", "stock:import"), true);
  assert.equal(can("POS", "catalog:manage"), false);
  assert.equal(can("POS", "reports:branch:view"), false);
  assert.equal(can("POS", "stock:receive"), false);
  assert.equal(can("POS", "stock:adjust"), false);
  assert.equal(can("POS", "price:set"), false);
});
