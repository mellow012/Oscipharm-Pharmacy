import assert from "node:assert/strict";
import test from "node:test";
import { generateToken, hashToken } from "../../../lib/tokens.ts";
import { isValidNewPassword } from "../../../lib/password.ts";
import { isSessionStale } from "../../../lib/session-stale.ts";
import {
  buildPasswordResetUrl,
  getPasswordResetExpiry,
  isPasswordResetTokenValid,
  PASSWORD_RESET_TTL_MS,
} from "./password-reset-policy.ts";
import {
  AUTH_FAILURE_WINDOW_MS,
  AUTH_LOCK_DURATION_MS,
  AUTH_THROTTLE_SCOPES,
  getAuthThrottlePolicy,
} from "./auth-throttle.ts";

test("reset tokens use 32 random bytes encoded base64url and SHA-256 hex hashes", () => {
  const token = generateToken();
  assert.equal(Buffer.from(token, "base64url").length, 32);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.match(hashToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashToken(token), token);
});

test("reset expiry is 30 minutes and validity excludes used or expired tokens", () => {
  const now = new Date("2026-10-21T12:00:00.000Z");
  const expiresAt = getPasswordResetExpiry(now);
  assert.equal(PASSWORD_RESET_TTL_MS, 30 * 60 * 1000);
  assert.equal(expiresAt.getTime() - now.getTime(), PASSWORD_RESET_TTL_MS);
  assert.equal(isPasswordResetTokenValid({ expiresAt, usedAt: null }, now), true);
  assert.equal(isPasswordResetTokenValid({ expiresAt: now, usedAt: null }, now), false);
  assert.equal(isPasswordResetTokenValid({ expiresAt, usedAt: now }, now), false);
});

test("password validation enforces ten characters and a 72-byte UTF-8 maximum", () => {
  assert.equal(isValidNewPassword("123456789"), false);
  assert.equal(isValidNewPassword("1234567890"), true);
  assert.equal(isValidNewPassword("é".repeat(36)), true);
  assert.equal(isValidNewPassword("é".repeat(37)), false);
});

test("reset link uses only the configured app URL and token path", () => {
  assert.equal(buildPasswordResetUrl("https://pharmacy.example/", "abc_def"), "https://pharmacy.example/reset-password/abc_def");
});

test("session staleness is false without a password change and true after it", () => {
  assert.equal(isSessionStale(1_800_000_000, null), false);
  assert.equal(isSessionStale(undefined, new Date()), false);
  assert.equal(isSessionStale(1_800_000_000, new Date(1_800_000_000_000)), false);
  assert.equal(isSessionStale(1_800_000_000, new Date(1_800_000_000_001)), true);
});

test("reset throttle policies are scoped and leave login thresholds unchanged", () => {
  assert.deepEqual(getAuthThrottlePolicy(AUTH_THROTTLE_SCOPES.email), {
    maxAttempts: 5,
    windowMs: AUTH_FAILURE_WINDOW_MS,
    lockMs: AUTH_LOCK_DURATION_MS,
  });
  assert.deepEqual(getAuthThrottlePolicy(AUTH_THROTTLE_SCOPES.ip), {
    maxAttempts: 20,
    windowMs: AUTH_FAILURE_WINDOW_MS,
    lockMs: AUTH_LOCK_DURATION_MS,
  });
  assert.deepEqual(getAuthThrottlePolicy(AUTH_THROTTLE_SCOPES.resetEmail), {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    lockMs: 60 * 60 * 1000,
  });
  assert.deepEqual(getAuthThrottlePolicy(AUTH_THROTTLE_SCOPES.resetIp), {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,
    lockMs: 60 * 60 * 1000,
  });
});