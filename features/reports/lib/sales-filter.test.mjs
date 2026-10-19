import assert from "node:assert/strict";
import test from "node:test";
import { parseSalesListFilters } from "./sales-filter.ts";

test("sales list filters normalize repeated and invalid query params", () => {
  assert.deepEqual(parseSalesListFilters({ from: ["2026-10-01"], to: "2026-10-19", type: "refund", search: "  ABC  ", page: "3" }), {
    from: "2026-10-01", to: "2026-10-19", type: "refund", search: "ABC", page: 3, importRunId: null,
  });
  const invalid = parseSalesListFilters({ from: "yesterday", to: "bad", type: "other", page: "0" });
  assert.match(invalid.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(invalid.to, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(invalid.type, "all");
  assert.equal(invalid.page, 1);
});
