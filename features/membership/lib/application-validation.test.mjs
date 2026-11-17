import assert from "node:assert/strict";
import test from "node:test";
import { isMembershipHoneypotFilled, validateMembershipApplication } from "./application-validation.ts";

const validApplication = {
    fullName: "Test Applicant",
    phone: "0999 000 000",
    email: "",
    workPlace: "Market",
    currentAddress: "Area 1, Lilongwe",
    village: "Area 1",
    healthConditions: ["ASTHMA"],
    otherHealthCondition: "",
    contactPreference: "PHONE",
    consent: true,
};

test("validates lenient phone formats and trims submitted strings", () => {
    const result = validateMembershipApplication({ ...validApplication, fullName: "  Test Applicant  ", phone: " (0999) 000-000 " });
    assert.equal(result.ok, true);
    assert.equal(result.value.fullName, "Test Applicant");
    assert.equal(result.value.phone, "(0999) 000-000");
});

test("requires a valid email only when email is the preferred contact", () => {
    assert.equal(validateMembershipApplication({ ...validApplication, contactPreference: "EMAIL" }).errors.email, "Enter an email address to choose email as your preferred contact method.");
    assert.equal(validateMembershipApplication({ ...validApplication, email: "bad-address" }).errors.email, "Enter a valid email address.");
    assert.equal(validateMembershipApplication({ ...validApplication, contactPreference: "EMAIL", email: "applicant@example.test" }).ok, true);
});

test("enforces field length limits and the condition/consent requirements", () => {
    const tooLongName = validateMembershipApplication({ ...validApplication, fullName: "A".repeat(101) });
    assert.equal(tooLongName.errors.fullName, "Full name must be 100 characters or fewer.");
    const tooLongPhone = validateMembershipApplication({ ...validApplication, phone: "1".repeat(21) });
    assert.equal(tooLongPhone.errors.phone, "Enter a valid phone number (7 to 20 characters).");
    const missingConditions = validateMembershipApplication({ ...validApplication, healthConditions: [], consent: false });
    assert.equal(missingConditions.errors.healthConditions, "Select a listed condition or enter another illness.");
    assert.equal(missingConditions.errors.consent, "Consent is required to send your request.");
});

test("honeypot ignores empty values and detects bot-filled values", () => {
    assert.equal(isMembershipHoneypotFilled(undefined), false);
    assert.equal(isMembershipHoneypotFilled("   "), false);
    assert.equal(isMembershipHoneypotFilled("https://spam.example"), true);
});