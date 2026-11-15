import assert from "node:assert/strict";
import test from "node:test";
import { validateBranchInput } from "./branch-input.ts";

const base = { name: "Blantyre", location: "City Centre" };

test("blank optional branch contact numbers normalize to null", () => {
  assert.equal(validateBranchInput({ ...base, contactNumber: "" }).value.contactNumber, null);
  assert.equal(validateBranchInput({ ...base, contactNumber: "   " }).value.contactNumber, null);
  assert.equal(validateBranchInput(base).value.contactNumber, null);
});

test("valid Malawi contact number formats are trimmed and retained", () => {
  assert.equal(validateBranchInput({ ...base, contactNumber: " +265 987 025 549 " }).value.contactNumber, "+265 987 025 549");
  assert.equal(validateBranchInput({ ...base, contactNumber: "0987025549" }).value.contactNumber, "0987025549");
});

test("contact numbers shorter than seven characters are rejected", () => {
  assert.deepEqual(validateBranchInput({ ...base, contactNumber: "123-45" }), {
    ok: false,
    message: "Enter a valid phone number, or leave it blank.",
  });
});

test("letters in the contact number are rejected", () => {
  assert.deepEqual(validateBranchInput({ ...base, contactNumber: "+265ABC1234" }), {
    ok: false,
    message: "Enter a valid phone number, or leave it blank.",
  });
});