import assert from "node:assert/strict";
import test from "node:test";
import { buildNotifications, groupNotificationsByDay, shouldShowNotificationDot } from "./notification-rules.ts";

const now = new Date();
const recent = new Date(now.getTime() - 60_000);
const old = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
const branches = [
    { id: "north", name: "North", latestStockImportAt: null, latestImportAt: new Date(now.getTime() - 49 * 60 * 60 * 1000) },
    { id: "south", name: "South", latestStockImportAt: recent, latestImportAt: recent },
];
const fixture = {
    now,
    branches,
    pendingMembershipCount: 2,
    batchExpiries: [{ branchId: "north", expiryDate: recent, expiryDateKnown: true }],
    stockLevels: [{ branchId: "north", variantId: "drug-1", quantityRemaining: 2, expiryDate: recent, expiryDateKnown: true }],
    reorderPoints: [{ branchId: "north", variantId: "drug-1", reorderThreshold: 5 }],
    shortfalls: [{ branchId: "north", units: 7 }, { branchId: "south", units: 3 }],
    imports: [
        { id: "run-n", branchId: "north", branchName: "North", actorName: "Rina", kind: "SALES", committedAt: recent, rowsOrReceipts: 4, shortfallUnits: 7 },
        { id: "run-old", branchId: "north", branchName: "North", actorName: "Rina", kind: "STOCK", committedAt: old, rowsOrReceipts: 12, shortfallUnits: 0 },
        { id: "run-s", branchId: "south", branchName: "South", actorName: "Sam", kind: "STOCK", committedAt: recent, rowsOrReceipts: 5, shortfallUnits: 0 },
    ],
    news: [{ id: "news-1", title: "Clinic hours", authorName: "Editor", occurredAt: recent }],
    members: [{ id: "member-1", name: "Applicant One", occurredAt: recent }],
    staffEvents: [{ id: "staff-n", branchId: "north", branchName: "North", actorName: "Admin", title: "Staff access updated", occurredAt: recent }],
    branchEvents: [{ id: "branch-1", branchName: "South", actorName: "Admin", title: "Branch archived", occurredAt: recent }],
};

test("Admin sees all branches and all supported event kinds", () => {
    const result = buildNotifications("ADMIN", null, fixture);
    assert.ok(result.attention.some((item) => item.branchName === "North"));
    assert.ok(result.attention.some((item) => item.branchName === "South"));
    assert.deepEqual(new Set(result.activity.map((item) => item.kind)), new Set(["import", "news", "member", "staff", "branch"]));
});

test("Branch Manager sees own-branch imports, stock and staff, plus pending memberships and news", () => {
    const result = buildNotifications("BRANCH_MANAGER", "north", fixture);
    assert.ok(result.attention.some((item) => item.kind === "membership"));
    assert.ok(result.attention.every((item) => !item.branchName || item.branchName === "North"));
    assert.deepEqual(new Set(result.activity.map((item) => item.kind)), new Set(["import", "news", "staff"]));
    assert.ok(result.activity.every((item) => !item.branchName || item.branchName === "North"));
});

test("branchless staff events are Admin-only", () => {
    const sources = {
        ...fixture,
        staffEvents: [{ id: "global-staff", branchId: null, branchName: null, actorName: "Admin", title: "Staff access updated", occurredAt: recent }],
    };
    assert.ok(buildNotifications("ADMIN", null, sources).activity.some((item) => item.id === "staff:global-staff"));
    assert.ok(!buildNotifications("BRANCH_MANAGER", "north", sources).activity.some((item) => item.id === "staff:global-staff"));
    assert.ok(!buildNotifications("POS", "north", sources).activity.some((item) => item.id === "staff:global-staff"));
});

test("POS sees own import and shortfall attention and news, never membership or stock details", () => {
    const result = buildNotifications("POS", "north", fixture);
    assert.ok(result.attention.some((item) => item.kind === "shortfall"));
    assert.ok(result.attention.some((item) => item.kind === "stale"));
    assert.ok(result.attention.some((item) => item.kind === "missing-stock"));
    assert.ok(result.attention.every((item) => !["membership", "expiry", "low-stock"].includes(item.kind)));
    assert.deepEqual(new Set(result.activity.map((item) => item.kind)), new Set(["import", "news"]));
    assert.ok(result.activity.every((item) => item.kind !== "member"));
});

test("notification items contain no health, phone, cost, or price fields", () => {
    for (const role of ["ADMIN", "BRANCH_MANAGER", "POS"]) {
        const items = Object.values(buildNotifications(role, "north", fixture)).flat();
        for (const item of items) {
            const serialized = JSON.stringify(item).toLowerCase();
            assert.doesNotMatch(serialized, /phone|health|condition|cost|price|discount/);
        }
    }
});

test("recent activity is newest-first, limited to 14 days and at most 30 items", () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
        id: `news-${index}`,
        title: `Update ${index}`,
        authorName: "Editor",
        occurredAt: new Date(now.getTime() - index * 1000),
    }));
    const result = buildNotifications("POS", "north", { ...fixture, news: [...many, { id: "old", title: "Old", authorName: "Editor", occurredAt: old }] });
    assert.equal(result.activity.length, 30);
    assert.equal(result.activity[0].id, "news:news-0");
    assert.ok(result.activity.every((item) => item.occurredAt.getTime() >= now.getTime() - 14 * 24 * 60 * 60 * 1000));
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const boundary = { ...fixture, imports: [], news: [{ id: "boundary", title: "Boundary", authorName: "Editor", occurredAt: fourteenDaysAgo }] };
    assert.equal(buildNotifications("POS", "north", boundary).activity.length, 1);
});

test("groups activity by Malawi date and keeps each group newest-first", () => {
    const beforeMidnightUtc = { id: "a", kind: "news", tone: "info", title: "A", description: "A", href: "/news", occurredAt: new Date("2026-11-16T22:30:00.000Z") };
    const afterMidnightUtc = { ...beforeMidnightUtc, id: "b", occurredAt: new Date("2026-11-16T23:30:00.000Z") };
    const groups = groupNotificationsByDay([beforeMidnightUtc, afterMidnightUtc]);
    assert.equal(groups.length, 1);
    assert.match(groups[0].label, /Tuesday, 17 Nov 2026/);
    assert.deepEqual(groups[0].items.map((item) => item.id), ["b", "a"]);
});

test("enforces 30-day expiry, reorder counts, import staleness and shortfalls", () => {
    const result = buildNotifications("ADMIN", null, fixture);
    const byKind = new Set(result.attention.map((item) => item.kind));
    assert.ok(byKind.has("expiry"));
    assert.ok(byKind.has("low-stock"));
    assert.ok(byKind.has("shortfall"));
    assert.ok(byKind.has("stale"));
    assert.ok(byKind.has("missing-stock"));
    const aboveReorder = { ...fixture, stockLevels: [{ branchId: "north", variantId: "drug-1", quantityRemaining: 6, expiryDate: recent, expiryDateKnown: true }] };
    assert.equal(buildNotifications("ADMIN", null, aboveReorder).attention.some((item) => item.kind === "low-stock"), false);
    const exactly48Hours = { ...fixture, branches: [{ ...branches[0], latestImportAt: new Date(now.getTime() - 48 * 60 * 60 * 1000) }] };
    assert.equal(buildNotifications("ADMIN", null, exactly48Hours).attention.some((item) => item.kind === "stale"), false);
    const exactly30Days = { ...fixture, batchExpiries: [{ branchId: "north", expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), expiryDateKnown: true }] };
    assert.equal(buildNotifications("ADMIN", null, exactly30Days).attention.some((item) => item.kind === "expiry"), true);
    const outsideExpiry = { ...fixture, batchExpiries: [{ branchId: "north", expiryDate: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000), expiryDateKnown: true }] };
    assert.equal(buildNotifications("ADMIN", null, outsideExpiry).attention.some((item) => item.kind === "expiry"), false);
});

test("notification dot handles unseen, old, newer, equal and invalid timestamps", () => {
    const now = new Date("2026-11-17T12:00:00.000Z");
    const latest = new Date(now.getTime() - 1000);
    assert.equal(shouldShowNotificationDot(latest, null, now), true);
    assert.equal(shouldShowNotificationDot(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), null, now), false);
    assert.equal(shouldShowNotificationDot(latest, new Date(latest.getTime() - 1), now), true);
    assert.equal(shouldShowNotificationDot(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000), now), true);
    assert.equal(shouldShowNotificationDot(latest, latest, now), false);
    assert.equal(shouldShowNotificationDot("invalid", null, now), false);
});