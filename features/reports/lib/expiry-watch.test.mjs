import assert from "node:assert/strict";
import test from "node:test";
import { groupExpiryNotRecorded } from "./expiry-watch.ts";
import { countAvailableUnits, filterLowStockRows } from "./stock-availability.ts";
import { getExpiryStatus } from "../../inventory/utils/expiry.ts";

test("unknown-expiry-only stock above reorder threshold is not low stock", () => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const availableUnits = countAvailableUnits([
    { quantityRemaining: 12, expiryDateKnown: false, expiryDate: new Date("2000-01-01T00:00:00.000Z") },
  ], todayKey);
  assert.deepEqual(filterLowStockRows([{ product: "Product A", availableUnits, reorderThreshold: 10 }]), []);
});

test("expiry-not-recorded batches group by branch and keep a global count", () => {
  const unknownExpiryOnlyProduct = { batchId: "unknown-a", branchId: "north", branchName: "North", ingredientName: "Uncategorized", brandName: "Product A", batchNumber: null, remainingUnits: 12 };
  const result = groupExpiryNotRecorded([
    unknownExpiryOnlyProduct,
    { batchId: "a", branchId: "north", branchName: "North", ingredientName: "Uncategorized", brandName: "Product A", batchNumber: null, remainingUnits: 4 },
    { batchId: "b", branchId: "north", branchName: "North", ingredientName: "Vitamin C", brandName: "Product B", batchNumber: "B-2", remainingUnits: 8 },
    { batchId: "c", branchId: "south", branchName: "South", ingredientName: "Pain relief", brandName: "Product C", batchNumber: "C-3", remainingUnits: 2 },
  ]);

  assert.equal(result.count, 4);
  assert.deepEqual(result.groups.map((group) => [group.branchId, group.batches.length]), [["north", 3], ["south", 1]]);
  assert.equal(result.groups[0].batches.some((batch) => batch.batchId === "unknown-a"), true);
});

test("unknown-expiry stock is never labeled In date", () => {
  const status = getExpiryStatus(new Date("2100-01-01T00:00:00.000Z"), false);
  assert.equal(status.label, "Expiry not recorded");
  assert.notEqual(status.label, "In date");
});
