import assert from "node:assert/strict";
import test from "node:test";
import { getStaffInvitationExpiry, isStaffInvitationPending, normalizeInvitationEmail } from "./staff-invitation-policy.ts";

test("staff invitation expiry is seven days from its creation time", () => {
  const createdAt = new Date("2026-10-24T12:00:00.000Z");
  assert.equal(getStaffInvitationExpiry(createdAt).toISOString(), "2026-10-31T12:00:00.000Z");
});

test("pending invitations stop being pending at expiry even before status is lazily flipped", () => {
  const expiresAt = new Date("2026-10-24T12:00:00.000Z");
  assert.equal(isStaffInvitationPending({ status: "PENDING", expiresAt }, new Date("2026-10-24T11:59:59.999Z")), true);
  assert.equal(isStaffInvitationPending({ status: "PENDING", expiresAt }, expiresAt), false);
  assert.equal(isStaffInvitationPending({ status: "REVOKED", expiresAt }, new Date("2026-10-24T11:00:00.000Z")), false);
});

test("invitation email normalization trims and lowercases", () => {
  assert.equal(normalizeInvitationEmail("  Staff.Member@Example.COM "), "staff.member@example.com");
});