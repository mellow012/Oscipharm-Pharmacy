import assert from "node:assert/strict";
import test from "node:test";
import { stripCostFieldsForRole } from "./import-preview-access.ts";

const payload = {
  rows: [{ unitCost: 10, lineCost: 20, lineCostInclTax: 23, totalValue: 30, product: "Paracetamol" }],
  counts: { totals: { quantity: 2, cost: 20, costTotal: 20, value: 30 } },
  margin: 10,
};

test("POS import payloads omit cost fields while managers and admins retain them", () => {
  const posPayload = stripCostFieldsForRole("POS", payload);
  assert.deepEqual(posPayload, {
    rows: [{ product: "Paracetamol" }],
    counts: { totals: { quantity: 2 } },
  });
  assert.deepEqual(stripCostFieldsForRole("BRANCH_MANAGER", payload), payload);
  assert.deepEqual(stripCostFieldsForRole("ADMIN", payload), payload);
});
