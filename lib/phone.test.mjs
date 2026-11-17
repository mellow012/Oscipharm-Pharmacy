import assert from "node:assert/strict";
import test from "node:test";
import { isValidPhoneNumber } from "./phone.ts";

test("shared phone validation accepts the existing branch formats", () => {
    assert.equal(isValidPhoneNumber("+265 987 025 549"), true);
    assert.equal(isValidPhoneNumber("0987025549"), true);
    assert.equal(isValidPhoneNumber("(0999) 000-000"), true);
});

test("shared phone validation preserves the branch length and character limits", () => {
    assert.equal(isValidPhoneNumber("123-45"), false);
    assert.equal(isValidPhoneNumber("1234567"), true);
    assert.equal(isValidPhoneNumber("1".repeat(20)), true);
    assert.equal(isValidPhoneNumber("1".repeat(21)), false);
    assert.equal(isValidPhoneNumber("+265ABC1234"), false);
    assert.equal(isValidPhoneNumber("+ () -  "), false);
});