import assert from "node:assert/strict";
import test from "node:test";
import { filterPublicBranches } from "./public-branch-rules.ts";

test("keeps only active, non-archived branches and preserves null contacts", () => {
    const branches = filterPublicBranches([
        { id: "active", name: "Active", location: "North", contactNumber: "+265111111111", isActive: true, archivedAt: null },
        { id: "null-contact", name: "No phone", location: "South", contactNumber: null, isActive: true, archivedAt: null },
        { id: "inactive", name: "Inactive", location: "East", contactNumber: "+265222222222", isActive: false, archivedAt: null },
        { id: "archived", name: "Archived", location: "West", contactNumber: "+265333333333", isActive: true, archivedAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);

    assert.deepEqual(branches, [
        { id: "active", name: "Active", location: "North", contactNumber: "+265111111111" },
        { id: "null-contact", name: "No phone", location: "South", contactNumber: null },
    ]);
});