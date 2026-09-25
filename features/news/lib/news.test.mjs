import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("./news.ts");

test("slug generation keeps title-readable and unique-safe", () => {
    assert.equal(mod.slugify("What is the best vitamin for winter?"), "what-is-the-best-vitamin-for-winter");
    assert.equal(mod.slugify("  Spring Sale!!!  "), "spring-sale");
});

test("image MIME validation allows standard public web images", () => {
    assert.equal(mod.isAllowedImageMimeType("image/jpeg"), true);
    assert.equal(mod.isAllowedImageMimeType("image/png"), true);
    assert.equal(mod.isAllowedImageMimeType("application/pdf"), false);
});
