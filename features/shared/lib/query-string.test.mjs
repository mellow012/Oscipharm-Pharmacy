import assert from "node:assert/strict";
import test from "node:test";
import { buildNextQueryString } from "./query-string.ts";

test("query update preserves unrelated params and replaces the selected key", () => {
  assert.equal(buildNextQueryString("tab=branches&branchId=b1&status=inactive", "status", "archived"), "tab=branches&branchId=b1&status=archived");
});

test("empty filter values remove only that query param", () => {
  assert.equal(buildNextQueryString("tab=branches&branchId=b1&status=inactive", "branchId", ""), "tab=branches&status=inactive");
});