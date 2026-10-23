import assert from "node:assert/strict";
import test from "node:test";
import { decideNewsAccess, limits, publicNewsWhere, slugWithSuffix, validateNewsInput } from "./news-rules.ts";

const validNews = { title: "Update", type: "NEWS", excerpt: "", body: "Text" };
const validEvent = { title: "Event", type: "EVENT", excerpt: "", body: "Text", eventStartsAt: "2026-10-22T10:00", eventEndsAt: "", eventLocation: "" };

test("validates basic news fields and trims optional empty values", () => {
    const result = validateNewsInput({ ...validNews, title: " Update ", excerpt: "  " }, "create");
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { title: "Update", type: "NEWS", excerpt: null, body: "Text", eventStartsAt: null, eventEndsAt: null, eventLocation: null });
});

test("requires event start and rejects an end earlier than start", () => {
    assert.equal(validateNewsInput({ ...validEvent, eventStartsAt: "" }, "create").ok, false);
    assert.equal(validateNewsInput({ ...validEvent, eventEndsAt: "2026-10-22T09:59" }, "create").ok, false);
    assert.equal(validateNewsInput(validEvent, "create").ok, true);
});

test("rejects invalid types and strips event-only fields from news", () => {
    assert.equal(validateNewsInput({ ...validNews, type: "OTHER" }, "create").ok, false);
    const result = validateNewsInput({ ...validNews, eventStartsAt: "bad", eventLocation: "somewhere" }, "create");
    assert.equal(result.ok, true);
    assert.equal(result.data.eventStartsAt, null);
    assert.equal(result.data.eventLocation, null);
});

test("accepts field length limits and rejects values beyond them", () => {
    const atLimits = { ...validNews, title: "t".repeat(limits.title), excerpt: "e".repeat(limits.excerpt), body: "b".repeat(limits.body) };
    assert.equal(validateNewsInput(atLimits, "create").ok, true);
    assert.equal(validateNewsInput({ ...atLimits, title: `${atLimits.title}t` }, "create").ok, false);
    assert.equal(validateNewsInput({ ...atLimits, excerpt: `${atLimits.excerpt}e` }, "create").ok, false);
    assert.equal(validateNewsInput({ ...atLimits, body: `${atLimits.body}b` }, "create").ok, false);
    assert.equal(validateNewsInput({ ...validEvent, eventLocation: "l".repeat(limits.location + 1) }, "create").ok, false);
});

test("news access permits admins and an active manager's own posts only", () => {
    const admin = { id: "admin", role: "ADMIN", isActive: true };
    const manager = { id: "manager-a", role: "BRANCH_MANAGER", isActive: true };
    assert.equal(decideNewsAccess({ actor: admin, canManageNews: true, authorId: "other" }), true);
    assert.equal(decideNewsAccess({ actor: manager, canManageNews: true, authorId: "manager-a" }), true);
    assert.equal(decideNewsAccess({ actor: manager, canManageNews: true, authorId: "manager-b" }), false);
    assert.equal(decideNewsAccess({ actor: { id: "pos", role: "POS", isActive: true }, canManageNews: false, authorId: "pos" }), false);
    assert.equal(decideNewsAccess({ actor: { ...manager, isActive: false }, canManageNews: true, authorId: "manager-a" }), false);
    assert.equal(decideNewsAccess({ actor: null, canManageNews: true, authorId: "manager-a" }), false);
    assert.equal(decideNewsAccess({ actor: admin, canManageNews: false, authorId: "other" }), false);
});

test("slug suffixes preserve the base on first attempt and cap at 120 characters", () => {
    assert.equal(slugWithSuffix("a-post", 1), "a-post");
    assert.equal(slugWithSuffix("a-post", 2), "a-post-2");
    assert.equal(slugWithSuffix("x".repeat(120), 3), `${"x".repeat(118)}-3`);
    assert.ok(slugWithSuffix("x".repeat(120), 20).length <= 120);
});

test("public news filter always carries status and type", () => {
    assert.deepEqual(publicNewsWhere("NEWS"), { status: "PUBLISHED", type: "NEWS" });
});