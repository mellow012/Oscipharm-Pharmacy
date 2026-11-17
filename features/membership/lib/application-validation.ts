import { isValidPhoneNumber } from "../../../lib/phone.ts";
import { membershipTopicValues, type MembershipTopic } from "../types.ts";

export type MembershipContactPreferenceValue = "PHONE" | "EMAIL";
export type MembershipApplicationField =
    | "fullName"
    | "phone"
    | "email"
    | "workPlace"
    | "currentAddress"
    | "village"
    | "healthConditions"
    | "otherHealthCondition"
    | "contactPreference"
    | "consent";

export type MembershipApplicationValues = {
    fullName: string;
    phone: string;
    email: string;
    workPlace: string;
    currentAddress: string;
    village: string;
    healthConditions: string[];
    otherHealthCondition: string;
    contactPreference: string;
    consent: boolean;
};

export type ValidMembershipApplication = Omit<MembershipApplicationValues, "contactPreference" | "healthConditions"> & {
    contactPreference: MembershipContactPreferenceValue;
    healthConditions: MembershipTopic[];
};

export type MembershipApplicationErrors = Partial<Record<MembershipApplicationField, string>>;

export type MembershipApplicationValidation =
    | { ok: true; value: ValidMembershipApplication; values: MembershipApplicationValues }
    | { ok: false; errors: MembershipApplicationErrors; values: MembershipApplicationValues };

function stringValue(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function isMembershipHoneypotFilled(value: unknown): boolean {
    return typeof value === "string" && value.trim().length > 0;
}

export function validateMembershipApplication(input: Record<string, unknown>): MembershipApplicationValidation {
    const rawConditions = Array.isArray(input.healthConditions) ? input.healthConditions : [];
    const values: MembershipApplicationValues = {
        fullName: stringValue(input.fullName),
        phone: stringValue(input.phone),
        email: stringValue(input.email),
        workPlace: stringValue(input.workPlace),
        currentAddress: stringValue(input.currentAddress),
        village: stringValue(input.village),
        healthConditions: rawConditions.map(stringValue),
        otherHealthCondition: stringValue(input.otherHealthCondition),
        contactPreference: stringValue(input.contactPreference),
        consent: input.consent === true,
    };
    const errors: MembershipApplicationErrors = {};

    if (values.fullName.length < 2) errors.fullName = "Enter your full name.";
    else if (values.fullName.length > 100) errors.fullName = "Full name must be 100 characters or fewer.";

    if (!isValidPhoneNumber(values.phone)) errors.phone = "Enter a valid phone number (7 to 20 characters).";

    if (values.email.length > 254) errors.email = "Email address must be 254 characters or fewer.";
    else if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";

    if (values.workPlace.length < 2) errors.workPlace = "Enter your workplace.";
    else if (values.workPlace.length > 120) errors.workPlace = "Workplace must be 120 characters or fewer.";

    if (values.currentAddress.length < 3) errors.currentAddress = "Enter your current residential address.";
    else if (values.currentAddress.length > 200) errors.currentAddress = "Address must be 200 characters or fewer.";

    if (values.village.length < 2) errors.village = "Enter your village.";
    else if (values.village.length > 120) errors.village = "Village must be 120 characters or fewer.";

    const validConditions = values.healthConditions.filter((condition): condition is MembershipTopic =>
        membershipTopicValues.includes(condition as MembershipTopic),
    );
    if (validConditions.length !== values.healthConditions.length || validConditions.length > membershipTopicValues.length) {
        errors.healthConditions = "Choose valid health conditions.";
    } else if (!validConditions.length && !values.otherHealthCondition) {
        errors.healthConditions = "Select a listed condition or enter another illness.";
    }

    if (values.otherHealthCondition.length > 120) errors.otherHealthCondition = "Other illness must be 120 characters or fewer.";

    if (values.contactPreference !== "PHONE" && values.contactPreference !== "EMAIL") {
        errors.contactPreference = "Choose a preferred contact method.";
    } else if (values.contactPreference === "EMAIL" && !values.email) {
        errors.email = "Enter an email address to choose email as your preferred contact method.";
    }

    if (!values.consent) errors.consent = "Consent is required to send your request.";

    if (Object.keys(errors).length) return { ok: false, errors, values };
    return {
        ok: true,
        values,
        value: {
            ...values,
            healthConditions: validConditions,
            contactPreference: values.contactPreference as MembershipContactPreferenceValue,
        },
    };
}