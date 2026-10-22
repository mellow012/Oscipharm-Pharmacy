import assert from "node:assert/strict";
import test from "node:test";
import { shouldInvalidateSession } from "./session-stale.ts";

const issuedAt = 1_800_000_000;

test("session invalidation rejects missing and inactive users", () => {
  assert.equal(shouldInvalidateSession({ exists: false, isActive: true, iat: issuedAt, passwordChangedAt: null }), true);
  assert.equal(shouldInvalidateSession({ exists: true, isActive: false, iat: issuedAt, passwordChangedAt: null }), true);
});

test("session invalidation rejects stale issuance timestamps", () => {
  assert.equal(shouldInvalidateSession({
    exists: true,
    isActive: true,
    iat: issuedAt,
    passwordChangedAt: new Date(issuedAt * 1000 + 1),
  }), true);
});

test("session invalidation accepts fresh timestamps and null password-change dates", () => {
  assert.equal(shouldInvalidateSession({
    exists: true,
    isActive: true,
    iat: issuedAt,
    passwordChangedAt: new Date(issuedAt * 1000 - 1),
  }), false);
  assert.equal(shouldInvalidateSession({ exists: true, isActive: true, iat: issuedAt, passwordChangedAt: null }), false);
});