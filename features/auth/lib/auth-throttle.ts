import { createHmac, randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const AUTH_EMAIL_MAX_FAILED_ATTEMPTS = 5;
export const AUTH_IP_MAX_FAILED_ATTEMPTS = 20;
export const AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_LOCK_DURATION_MS = 15 * 60 * 1000;
export const AUTH_THROTTLE_CLEANUP_AGE_MS = 24 * 60 * 60 * 1000;
export const AUTH_THROTTLE_CLEANUP_LIMIT = 100;
export const AUTH_THROTTLE_SCOPES = {
  email: "EMAIL",
  ip: "IP",
  resetEmail: "RESET_EMAIL",
  resetIp: "RESET_IP",
} as const;
const DEVELOPMENT_THROTTLE_SECRET = "oscipharm-development-auth-throttle-secret";

export type AuthThrottleScope = (typeof AUTH_THROTTLE_SCOPES)[keyof typeof AUTH_THROTTLE_SCOPES];
export type AuthFailureState = { failedAttempts: number; windowStartedAt: number; lockedUntil: number | null };

export function isAuthFailureWindowExpired(windowStartedAt: Date | number, now: Date | number, windowMs = AUTH_FAILURE_WINDOW_MS): boolean {
  return Number(now) - Number(windowStartedAt) >= windowMs;
}

export function isAuthThrottleLocked(lockedUntil: Date | number | null, now: Date | number): boolean {
  return lockedUntil !== null && Number(lockedUntil) > Number(now);
}

export function nextAuthFailureState(
  previous: AuthFailureState | null,
  now: Date | number,
  maxAttempts: number,
  windowMs = AUTH_FAILURE_WINDOW_MS,
  lockMs = AUTH_LOCK_DURATION_MS,
): AuthFailureState {
  const timestamp = Number(now);
  if (previous && isAuthThrottleLocked(previous.lockedUntil, timestamp)) return previous;
  const expired = !previous || isAuthFailureWindowExpired(previous.windowStartedAt, timestamp, windowMs);
  const failedAttempts = expired ? 1 : Math.min(maxAttempts, previous.failedAttempts + 1);
  return {
    failedAttempts,
    windowStartedAt: expired ? timestamp : previous.windowStartedAt,
    lockedUntil: failedAttempts >= maxAttempts ? (previous?.lockedUntil && isAuthThrottleLocked(previous.lockedUntil, timestamp) ? previous.lockedUntil : timestamp + lockMs) : null,
  };
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAuthThrottleSecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.AUTH_THROTTLE_SECRET) return env.AUTH_THROTTLE_SECRET;
  if (env.NODE_ENV !== "production") return DEVELOPMENT_THROTTLE_SECRET;
  throw new Error("AUTH_THROTTLE_SECRET is required in production; configure it in the deployment environment.");
}

export function hashAuthThrottleSubject(scope: AuthThrottleScope, subject: string, secret = getAuthThrottleSecret()): string {
  const normalized = scope === AUTH_THROTTLE_SCOPES.email || scope === AUTH_THROTTLE_SCOPES.resetEmail
    ? normalizeAuthEmail(subject)
    : subject.trim();
  return createHmac("sha256", secret).update(`${scope}:${normalized}`).digest("hex");
}

export function getTrustedClientIp(headers: Record<string, string | string[] | undefined>): string | null {
  const realIpHeader = headers["x-real-ip"];
  const realIp = Array.isArray(realIpHeader) ? realIpHeader[0] : realIpHeader;
  if (realIp?.trim()) return realIp.trim();
  const forwardedHeader = headers["x-forwarded-for"];
  const forwarded = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader;
  return forwarded?.split(",", 1)[0]?.trim() || null;
}

export type AuthThrottlePolicy = { maxAttempts: number; windowMs: number; lockMs: number };

export function getAuthThrottlePolicy(scope: AuthThrottleScope): AuthThrottlePolicy {
  if (scope === AUTH_THROTTLE_SCOPES.resetEmail) {
    return { maxAttempts: 3, windowMs: 60 * 60 * 1000, lockMs: 60 * 60 * 1000 };
  }
  if (scope === AUTH_THROTTLE_SCOPES.resetIp) {
    return { maxAttempts: 10, windowMs: 60 * 60 * 1000, lockMs: 60 * 60 * 1000 };
  }
  return {
    maxAttempts: scope === AUTH_THROTTLE_SCOPES.email ? AUTH_EMAIL_MAX_FAILED_ATTEMPTS : AUTH_IP_MAX_FAILED_ATTEMPTS,
    windowMs: AUTH_FAILURE_WINDOW_MS,
    lockMs: AUTH_LOCK_DURATION_MS,
  };
}

export async function isAuthSubjectLocked(db: PrismaClient, scope: AuthThrottleScope, subjectHash: string, now = new Date()): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ locked: boolean }>>`
    SELECT COALESCE("lockedUntil" > ${now}, false) AS locked
    FROM "AuthThrottle"
    WHERE scope = ${scope}::"AuthThrottleScope" AND "subjectHash" = ${subjectHash}
  `;
  return rows[0]?.locked ?? false;
}

export async function recordPasswordResetRequestThrottle(
  db: PrismaClient,
  emailHash: string,
  ipHash: string | null,
): Promise<boolean> {
  const [emailLocked, ipLocked] = await Promise.all([
    isAuthSubjectLocked(db, AUTH_THROTTLE_SCOPES.resetEmail, emailHash),
    ipHash ? isAuthSubjectLocked(db, AUTH_THROTTLE_SCOPES.resetIp, ipHash) : Promise.resolve(false),
  ]);
  if (emailLocked || ipLocked) return false;

  await Promise.all([
    recordAuthFailure(db, AUTH_THROTTLE_SCOPES.resetEmail, emailHash),
    ...(ipHash ? [recordAuthFailure(db, AUTH_THROTTLE_SCOPES.resetIp, ipHash)] : []),
  ]);
  return true;
}

export async function recordAuthFailure(db: PrismaClient, scope: AuthThrottleScope, subjectHash: string, now = new Date()): Promise<AuthFailureState> {
  const { maxAttempts, windowMs, lockMs } = getAuthThrottlePolicy(scope);
  const rows = await db.$queryRaw<Array<{ failedAttempts: number; windowStartedAt: Date; lockedUntil: Date | null }>>`
    INSERT INTO "AuthThrottle" ("id", "scope", "subjectHash", "failedAttempts", "windowStartedAt", "lockedUntil", "updatedAt")
    VALUES (
      ${randomUUID()}, ${scope}::"AuthThrottleScope", ${subjectHash}, 1, ${now},
      CASE WHEN ${maxAttempts} <= 1 THEN ${now} + (${lockMs} * INTERVAL '1 millisecond') ELSE NULL END,
      ${now}
    )
    ON CONFLICT ("scope", "subjectHash") DO UPDATE SET
      "failedAttempts" = CASE
        WHEN "AuthThrottle"."windowStartedAt" <= ${now} - (${windowMs} * INTERVAL '1 millisecond')
          AND ("AuthThrottle"."lockedUntil" IS NULL OR "AuthThrottle"."lockedUntil" <= ${now}) THEN 1
        ELSE LEAST(${maxAttempts}, "AuthThrottle"."failedAttempts" + 1)
      END,
      "windowStartedAt" = CASE
        WHEN "AuthThrottle"."windowStartedAt" <= ${now} - (${windowMs} * INTERVAL '1 millisecond')
          AND ("AuthThrottle"."lockedUntil" IS NULL OR "AuthThrottle"."lockedUntil" <= ${now}) THEN ${now}
        ELSE "AuthThrottle"."windowStartedAt"
      END,
      "lockedUntil" = CASE
        WHEN "AuthThrottle"."windowStartedAt" <= ${now} - (${windowMs} * INTERVAL '1 millisecond')
          AND ("AuthThrottle"."lockedUntil" IS NULL OR "AuthThrottle"."lockedUntil" <= ${now}) THEN
          CASE WHEN ${maxAttempts} <= 1 THEN ${now} + (${lockMs} * INTERVAL '1 millisecond') ELSE NULL END
        WHEN "AuthThrottle"."lockedUntil" > ${now} THEN "AuthThrottle"."lockedUntil"
        WHEN "AuthThrottle"."failedAttempts" + 1 >= ${maxAttempts} THEN ${now} + (${lockMs} * INTERVAL '1 millisecond')
        ELSE NULL
      END,
      "updatedAt" = ${now}
    RETURNING "failedAttempts", "windowStartedAt", "lockedUntil"
  `;
  const row = rows[0];
  if (!row) throw new Error("Failed to record authentication throttle attempt.");
  return { failedAttempts: row.failedAttempts, windowStartedAt: row.windowStartedAt.getTime(), lockedUntil: row.lockedUntil?.getTime() ?? null };
}

export async function resetAuthEmailFailures(db: PrismaClient, subjectHash: string): Promise<void> {
  await db.$executeRaw`DELETE FROM "AuthThrottle" WHERE "scope" = 'EMAIL'::"AuthThrottleScope" AND "subjectHash" = ${subjectHash}`;
}

export async function cleanupAuthThrottleRows(db: PrismaClient, now = new Date()): Promise<void> {
  await db.$executeRaw`
    WITH stale AS (
      SELECT ctid
      FROM "AuthThrottle"
      WHERE "windowStartedAt" < ${now} - (${AUTH_THROTTLE_CLEANUP_AGE_MS} * INTERVAL '1 millisecond')
        AND ("lockedUntil" IS NULL OR "lockedUntil" <= ${now})
      LIMIT ${AUTH_THROTTLE_CLEANUP_LIMIT}
    )
    DELETE FROM "AuthThrottle" AS throttle
    USING stale
    WHERE throttle.ctid = stale.ctid
  `;
}
