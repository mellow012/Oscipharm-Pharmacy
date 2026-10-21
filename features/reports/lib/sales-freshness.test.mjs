import assert from "node:assert/strict";
import test from "node:test";
import { calculateSalesFreshness, SALES_FRESHNESS_CRITICAL_MS, SALES_FRESHNESS_WARNING_MS } from "./sales-freshness.ts";

test("sales freshness status is based only on latest sale age", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  assert.equal(calculateSalesFreshness({ lastStockImportAt: null, lastSalesImportAt: null, latestSaleAt: null }, now).level, "none");
  assert.equal(calculateSalesFreshness({ lastStockImportAt: now, lastSalesImportAt: now, latestSaleAt: now }, now).level, "fresh");
  assert.equal(calculateSalesFreshness({ lastStockImportAt: now, lastSalesImportAt: now, latestSaleAt: new Date(now.getTime() - SALES_FRESHNESS_WARNING_MS) }, now).level, "fresh");
  assert.equal(calculateSalesFreshness({ lastStockImportAt: now, lastSalesImportAt: now, latestSaleAt: new Date(now.getTime() - SALES_FRESHNESS_WARNING_MS - 1) }, now).level, "warning");
  assert.equal(calculateSalesFreshness({ lastStockImportAt: now, lastSalesImportAt: now, latestSaleAt: new Date(now.getTime() - SALES_FRESHNESS_CRITICAL_MS) }, now).level, "warning");
  assert.equal(calculateSalesFreshness({ lastStockImportAt: now, lastSalesImportAt: now, latestSaleAt: new Date(now.getTime() - SALES_FRESHNESS_CRITICAL_MS - 1) }, now).level, "critical");
});
