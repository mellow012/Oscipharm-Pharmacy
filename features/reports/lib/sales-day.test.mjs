import assert from "node:assert/strict";
import test from "node:test";
import { malawiSalesDay } from "./sales-day.ts";

test("sales day uses the sale instant in Africa/Blantyre at both day boundaries", () => {
  assert.equal(malawiSalesDay("2026-10-12T22:30:00.000Z"), "2026-10-13");
  assert.equal(malawiSalesDay("2026-10-13T21:30:00.000Z"), "2026-10-13");
});
