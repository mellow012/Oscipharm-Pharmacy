import test from "node:test";
import assert from "node:assert/strict";
import {
    formatBlantyreDateTime,
    formatBlantyreInputValue,
    getMalawiDateKey,
    isExpiredInMalawi,
    isSellableInMalawi,
    parseBlantyreLocalDateTime,
} from "./timezone.ts";

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

test("Report date defaults stay on Malawi calendar days", () => {
    const today = new Date("2026-09-24T20:30:00Z");
    const previousWeek = new Date(Date.parse("2026-09-17T20:30:00Z"));
    assert.equal(new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Blantyre",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(today).replace(/\//g, "-"), "2026-09-24");
    assert.equal(new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Blantyre",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(previousWeek).replace(/\//g, "-"), "2026-09-17");
});

test("Blantyre datetime-local parser requires a real date and strict format", () => {
    assert.equal(parseBlantyreLocalDateTime("2026-02-29T12:00"), null);
    assert.equal(parseBlantyreLocalDateTime("2024-02-29T12:00")?.toISOString(), "2024-02-29T10:00:00.000Z");
    assert.equal(parseBlantyreLocalDateTime("2026-10-22T24:00"), null);
    assert.equal(parseBlantyreLocalDateTime("2026-10-22T12:60"), null);
    assert.equal(parseBlantyreLocalDateTime("2026-10-22T12:00:00"), null);
});

test("Blantyre datetime helpers round-trip local input and display Malawi time", () => {
    const date = parseBlantyreLocalDateTime("2026-10-22T14:35");
    assert.ok(date);
    assert.equal(formatBlantyreInputValue(date), "2026-10-22T14:35");
    assert.match(formatBlantyreDateTime(date), /22 Oct 2026/);
});
