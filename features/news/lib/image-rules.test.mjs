import assert from "node:assert/strict";
import test from "node:test";
import { MAX_IMAGE_BYTES, buildStoragePath, canAddImage, detectImageType, isImageSizeAllowed, normalizeText, reorderIds } from "./image-rules.ts";

const bytes = (...values) => new Uint8Array(values);

test("detects JPEG, PNG, WebP and AVIF from their signatures", () => {
    assert.deepEqual(detectImageType(bytes(0xff, 0xd8, 0xff)), { mime: "image/jpeg", ext: "jpg" });
    assert.deepEqual(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), { mime: "image/png", ext: "png" });
    assert.deepEqual(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)), { mime: "image/webp", ext: "webp" });
    assert.deepEqual(detectImageType(bytes(0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66)), { mime: "image/avif", ext: "avif" });
    assert.deepEqual(detectImageType(bytes(0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x73)), { mime: "image/avif", ext: "avif" });
});

test("rejects unsupported and malformed signatures", () => {
    assert.equal(detectImageType(bytes(0x47, 0x49, 0x46, 0x38)), null);
    assert.equal(detectImageType(new TextEncoder().encode("<svg")), null);
    assert.equal(detectImageType(new TextEncoder().encode("plain text")), null);
    assert.equal(detectImageType(new Uint8Array()), null);
    assert.equal(detectImageType(bytes(0xff, 0xd8, 0xff).subarray(0, 2)), null);
    assert.equal(detectImageType(bytes(0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31)), null);
    assert.equal(detectImageType(bytes(0x52, 0x49, 0x46, 0x58, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)), null);
    assert.equal(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x58)), null);
});

test("enforces the 4 MiB size boundary and image-count limit", () => {
    assert.equal(isImageSizeAllowed(MAX_IMAGE_BYTES), true);
    assert.equal(isImageSizeAllowed(MAX_IMAGE_BYTES + 1), false);
    assert.equal(isImageSizeAllowed(0), false);
    assert.equal(canAddImage(7), true);
    assert.equal(canAddImage(8), false);
});

test("storage path uses only post id, random id and detected extension", () => {
    const path = buildStoragePath("post-id", "webp");
    assert.match(path, /^news\/post-id\/[0-9a-f-]{36}\.webp$/);
    assert.equal(path.includes("untrusted"), false);
});

test("normalizes optional plain text and enforces length", () => {
    assert.deepEqual(normalizeText("  accessible text  ", 20), { ok: true, value: "accessible text" });
    assert.deepEqual(normalizeText("   ", 20), { ok: true, value: null });
    assert.deepEqual(normalizeText("x".repeat(200), 200), { ok: true, value: "x".repeat(200) });
    assert.deepEqual(normalizeText("x".repeat(3), 2), { ok: false });
    assert.deepEqual(normalizeText(null, 2), { ok: false });
});

test("reorders ids without mutating input and leaves ids at bounds unchanged", () => {
    const ids = ["a", "b", "c"];
    assert.deepEqual(reorderIds(ids, "b", "up"), ["b", "a", "c"]);
    assert.deepEqual(reorderIds(ids, "b", "down"), ["a", "c", "b"]);
    assert.deepEqual(reorderIds(ids, "a", "up"), ids);
    assert.deepEqual(reorderIds(ids, "c", "down"), ids);
    assert.deepEqual(ids, ["a", "b", "c"]);
});