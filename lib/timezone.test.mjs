import test from "node:test";
import assert from "node:assert/strict";
import { getMalawiDateKey, isExpiredInMalawi, isSellableInMalawi } from "./timezone.ts";

const date = (iso) => new Date(iso);

test("Malawi date key uses Africa/Blantyre not server local timezone", () => {
    assert.equal(getMalawiDateKey(date("2026-09-24T20:30:00Z")), "2026-09-24");
    assert.equal(getMalawiDateKey(date("2026-09-24T22:30:00Z")), "2026-09-25");
});

test("Expiry boundary is in Malawi local time at UTC+2", () => {
    const now = date("2026-09-24T20:00:00Z");
    assert.equal(isExpiredInMalawi(date("2026-09-24T20:30:00Z"), now), false);
    assert.equal(isExpiredInMalawi(date("2026-09-24T21:59:59Z"), now), false);
    assert.equal(isExpiredInMalawi(date("2026-09-24T22:00:00Z"), now), false);
    assert.equal(isExpiredInMalawi(date("2026-09-23T20:00:00Z"), now), true);
    assert.equal(isSellableInMalawi(date("2026-09-24T22:30:00Z"), now), true);
});
