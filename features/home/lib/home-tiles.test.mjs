import assert from "node:assert/strict";
import test from "node:test";
import { getHomeTileGroups } from "./home-tiles.ts";

function groupSummary(role) {
  return getHomeTileGroups(role).map((group) => ({
    label: group.label,
    layout: group.layout,
    destinations: group.tiles.map((tile) => tile.href),
  }));
}

function destinations(role) {
  return getHomeTileGroups(role).flatMap((group) => group.tiles.map((tile) => tile.href)).sort();
}

test("Admin retains the existing Home destinations in the agreed group order", () => {
  const administration = getHomeTileGroups("ADMIN").flatMap((group) => group.tiles).find((tile) => tile.href === "/admin");
  assert.equal(administration.description, "Review staff, branch coverage, and pharmacy totals");
  assert.deepEqual(destinations("ADMIN"), [
    "/admin",
    "/admin/memberships",
    "/admin/staff",
    "/inventory",
    "/reports",
    "/staff/catalog",
    "/staff/import",
    "/staff/news",
    "/staff/sales",
  ]);
  assert.deepEqual(groupSummary("ADMIN"), [
    { label: "Daily work", layout: "daily", destinations: ["/staff/sales", "/inventory"] },
    { label: "More", layout: "more", destinations: ["/staff/catalog", "/reports", "/staff/import", "/staff/news", "/admin/memberships", "/admin", "/admin/staff"] },
  ]);
});

test("Branch Manager retains the existing Home destinations in the agreed group order", () => {
  assert.deepEqual(destinations("BRANCH_MANAGER"), [
    "/admin/memberships",
    "/inventory",
    "/reports",
    "/staff/catalog",
    "/staff/import",
    "/staff/news",
    "/staff/sales",
    "/staff/team",
  ]);
  assert.deepEqual(groupSummary("BRANCH_MANAGER"), [
    { label: "Daily work", layout: "daily", destinations: ["/staff/sales", "/inventory"] },
    { label: "More", layout: "more", destinations: ["/staff/catalog", "/reports", "/staff/import", "/staff/news", "/admin/memberships", "/staff/team"] },
  ]);
});

test("Sales/POS sees its own Home destinations", () => {
  assert.deepEqual(destinations("POS"), ["/inventory", "/staff/catalog", "/staff/import", "/staff/sales"]);
  assert.deepEqual(groupSummary("POS"), [
    { label: "Daily work", layout: "daily", destinations: ["/staff/sales", "/inventory"] },
    { label: "More", layout: "more", destinations: ["/staff/catalog", "/staff/import"] },
  ]);
});