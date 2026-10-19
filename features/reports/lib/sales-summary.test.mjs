import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesSummary } from "./sales-summary.ts";

test("sales summary counts a negative refund in refunds and net", () => {
  assert.deepEqual(buildSalesSummary([
    { subtotalAmount: "100", discountAmount: "0", totalAmount: "100", isRefund: false },
    { subtotalAmount: "-25", discountAmount: "0", totalAmount: "-25", isRefund: true },
  ]), { gross: 100, discounts: 0, netSales: 100, refunds: -25, combinedNet: 75 });
});
