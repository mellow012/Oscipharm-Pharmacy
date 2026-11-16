import assert from "node:assert/strict";
import test from "node:test";
import { getPublicAvailability } from "./public-availability.ts";
import { formatMwk } from "../utils/formatPrice.ts";

const now = new Date("2026-11-16T12:00:00.000Z");
const batch = (quantityRemaining, expiryDate, expiryDateKnown = true) => ({
    quantityRemaining,
    expiryDate: new Date(expiryDate),
    expiryDateKnown,
});
const branch = (id, batches, reorderThreshold = null, overrides = {}) => ({
    id,
    isActive: true,
    archivedAt: null,
    reorderThreshold,
    batches,
    ...overrides,
});

test("expired-only and zero-quantity batches are out of stock", () => {
    assert.equal(getPublicAvailability([
        branch("expired", [batch(12, "2026-11-15T00:00:00.000Z")]),
        branch("zero", [batch(0, "2026-12-01T00:00:00.000Z")]),
    ], now).status, "out-of-stock");
});

test("a batch expiring today is sellable and meets the branch reorder point", () => {
    assert.equal(getPublicAvailability([
        branch("today", [batch(10, "2026-11-16T00:00:00.000Z")], 10),
    ], now).status, "low-stock");
});

test("sellable units above the branch reorder point are in stock", () => {
    assert.equal(getPublicAvailability([
        branch("stocked", [batch(11, "2026-12-01T00:00:00.000Z")], 10),
    ], now).status, "in-stock");
});

test("availability combines active branches and excludes inactive or archived branches", () => {
    const result = getPublicAvailability([
        branch("low", [batch(2, "2026-12-01T00:00:00.000Z")], 5),
        branch("regular", [batch(11, "2026-12-01T00:00:00.000Z")], 10),
        branch("extra", [batch(100, "2026-12-01T00:00:00.000Z")], null, { isActive: false }),
        branch("archived", [batch(100, "2026-12-01T00:00:00.000Z")], null, { archivedAt: now }),
    ], now);

    assert.deepEqual(result, {
        status: "low-stock",
        branches: [
            { branchId: "low", status: "low-stock" },
            { branchId: "regular", status: "in-stock" },
        ],
    });
});

test("unknown expiry dates remain sellable", () => {
    assert.equal(getPublicAvailability([
        branch("unknown", [batch(3, "2000-01-01T00:00:00.000Z", false)]),
    ], now).status, "in-stock");
});

test("prices use the public Malawi kwacha format", () => {
    assert.equal(formatMwk("4000.00"), "MK 4,000");
});