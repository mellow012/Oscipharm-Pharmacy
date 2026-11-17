import assert from "node:assert/strict";
import test from "node:test";
import { isActiveNavItem } from "./public-navigation.ts";

test("matches exact and nested catalog and news routes", () => {
    assert.equal(isActiveNavItem("/catalog", "/catalog"), true);
    assert.equal(isActiveNavItem("/catalog/product/item-1", "/catalog"), true);
    assert.equal(isActiveNavItem("/news/story", "/news"), true);
    assert.equal(isActiveNavItem("/membership", "/membership"), true);
});

test("does not match similar prefixes or the home page", () => {
    assert.equal(isActiveNavItem("/newsletter", "/news"), false);
    assert.equal(isActiveNavItem("/", "/catalog"), false);
    assert.equal(isActiveNavItem("/", "/news"), false);
    assert.equal(isActiveNavItem("/", "/membership"), false);
});

test("ignores trailing slashes and query strings", () => {
    assert.equal(isActiveNavItem("/catalog/", "/catalog"), true);
    assert.equal(isActiveNavItem("/news/story/?tab=events", "/news"), true);
    assert.equal(isActiveNavItem("/membership/?source=header", "/membership"), true);
});