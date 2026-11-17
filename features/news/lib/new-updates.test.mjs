import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowNewDot } from "./new-updates.ts";

const now = new Date("2026-11-17T12:00:00.000Z");
const latest = "2026-11-16T12:00:00.000Z";

test("shows a recent post for a first-time visitor", () => {
    assert.equal(shouldShowNewDot(latest, null, now, 14), true);
});

test("shows only posts newer than the last-seen timestamp", () => {
    assert.equal(shouldShowNewDot(latest, "2026-11-15T12:00:00.000Z", now, 14), true);
    assert.equal(shouldShowNewDot(latest, latest, now, 14), false);
    assert.equal(shouldShowNewDot(latest, "2026-11-17T00:00:00.000Z", now, 14), false);
});

test("hides posts older than the configured window", () => {
    assert.equal(shouldShowNewDot("2026-11-03T11:59:59.999Z", null, now, 14), false);
    assert.equal(shouldShowNewDot("2026-11-03T12:00:00.000Z", null, now, 14), true);
});

test("hides missing and invalid latest timestamps", () => {
    assert.equal(shouldShowNewDot(null, null, now, 14), false);
    assert.equal(shouldShowNewDot("not-a-date", null, now, 14), false);
    assert.equal(shouldShowNewDot(latest, null, "not-a-date", 14), false);
});

test("treats an invalid last-seen value as never seen", () => {
    assert.equal(shouldShowNewDot(latest, "not-a-date", now, 14), true);
});