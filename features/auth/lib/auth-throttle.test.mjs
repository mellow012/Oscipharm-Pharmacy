import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_EMAIL_MAX_FAILED_ATTEMPTS,
  AUTH_FAILURE_WINDOW_MS,
  AUTH_IP_MAX_FAILED_ATTEMPTS,
  AUTH_LOCK_DURATION_MS,
  AUTH_THROTTLE_SCOPES,
  getAuthThrottleSecret,
  getTrustedClientIp,
  hashAuthThrottleSubject,
  isAuthFailureWindowExpired,
  isAuthThrottleLocked,
  nextAuthFailureState,
  normalizeAuthEmail,
} from "./auth-throttle.ts";

const START = Date.parse("2026-10-20T12:00:00Z");

test("failure window expires exactly at 15 minutes", () => {
  assert.equal(isAuthFailureWindowExpired(START, START + AUTH_FAILURE_WINDOW_MS - 1), false);
  assert.equal(isAuthFailureWindowExpired(START, START + AUTH_FAILURE_WINDOW_MS), true);
});

test("email and IP thresholds lock at their exact configured attempt", () => {
  let state = null;
  for (let attempt = 1; attempt <= AUTH_EMAIL_MAX_FAILED_ATTEMPTS; attempt += 1) {
    state = nextAuthFailureState(state, START + attempt, AUTH_EMAIL_MAX_FAILED_ATTEMPTS);
    assert.equal(state.failedAttempts, attempt);
    assert.equal(state.lockedUntil !== null, attempt === 5);
  }
  let ipState = null;
  for (let attempt = 1; attempt <= AUTH_IP_MAX_FAILED_ATTEMPTS; attempt += 1) {
    ipState = nextAuthFailureState(ipState, START + attempt, AUTH_IP_MAX_FAILED_ATTEMPTS);
  }
  assert.equal(ipState.failedAttempts, 20);
  assert.equal(ipState.lockedUntil, START + 20 + AUTH_LOCK_DURATION_MS);
});

test("active locks survive window expiry and unlock exactly at lockedUntil", () => {
  const locked = { failedAttempts: 5, windowStartedAt: START, lockedUntil: START + 60_000 + AUTH_LOCK_DURATION_MS };
  assert.equal(isAuthThrottleLocked(locked.lockedUntil, locked.lockedUntil - 1), true);
  assert.equal(isAuthThrottleLocked(locked.lockedUntil, locked.lockedUntil), false);
  assert.deepEqual(nextAuthFailureState(locked, locked.windowStartedAt + AUTH_FAILURE_WINDOW_MS, 5), locked);
  assert.deepEqual(nextAuthFailureState(locked, locked.lockedUntil, 5), {
    failedAttempts: 1,
    windowStartedAt: locked.lockedUntil,
    lockedUntil: null,
  });
});

test("normalizes email before HMAC and accepts forwarded Vercel client address", () => {
  assert.equal(normalizeAuthEmail("  Owner@Example.COM  "), "owner@example.com");
  assert.equal(hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, " Owner@Example.COM ", "secret"), hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, "owner@example.com", "secret"));
  assert.equal(getTrustedClientIp({ "x-forwarded-for": "203.0.113.4, 10.0.0.2" }), "203.0.113.4");
  assert.equal(getTrustedClientIp({ "x-real-ip": "203.0.113.5", "x-forwarded-for": "203.0.113.4" }), "203.0.113.5");
  assert.equal(getTrustedClientIp({}), null);
});

test("production requires the throttle secret; development has a fallback", () => {
  assert.throws(() => getAuthThrottleSecret({ NODE_ENV: "production" }), /AUTH_THROTTLE_SECRET/);
  assert.equal(getAuthThrottleSecret({ NODE_ENV: "development" }), "oscipharm-development-auth-throttle-secret");
});
