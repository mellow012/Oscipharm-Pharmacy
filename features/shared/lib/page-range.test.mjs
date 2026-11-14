import assert from "node:assert/strict";
import test from "node:test";
import { getPageNumbers } from "./page-range.ts";

test("page range shows every page when the count is small", () => {
  assert.deepEqual(getPageNumbers(2, 5), [1, 2, 3, 4, 5]);
});

test("page range adds gaps around the current page", () => {
  assert.deepEqual(getPageNumbers(5, 12), [1, "ellipsis", 4, 5, 6, "ellipsis", 12]);
});

test("page range clamps the current page and handles invalid totals", () => {
  assert.deepEqual(getPageNumbers(99, 12), [1, "ellipsis", 9, 10, 11, 12]);
  assert.deepEqual(getPageNumbers(1, 0), []);
});
