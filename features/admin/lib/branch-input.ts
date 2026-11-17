import { isValidPhoneNumber } from "../../../lib/phone.ts";

export type BranchInput = {
    name: unknown;
    location: unknown;
    contactNumber?: unknown;
};

export type ValidBranchInput = {
    name: string;
    location: string;
    contactNumber: string | null;
};

export function validateBranchInput(input: BranchInput):
    | { ok: true; value: ValidBranchInput }
    | { ok: false; message: string } {
    if (typeof input.name !== "string" || !input.name.trim()) return { ok: false, message: "Branch name is required." };
    if (input.name.trim().length > 120) return { ok: false, message: "Branch name must be 120 characters or fewer." };
    if (typeof input.location !== "string" || !input.location.trim()) return { ok: false, message: "Branch location is required." };
    const location = input.location.trim();
    if (location.length > 240) return { ok: false, message: "Branch location must be 240 characters or fewer." };

    let contactNumber: string | null = null;
    if (input.contactNumber !== null && input.contactNumber !== undefined) {
        if (typeof input.contactNumber !== "string") return { ok: false, message: "Enter a valid phone number, or leave it blank." };
        const candidate = input.contactNumber.trim();
        if (candidate) {
            if (!isValidPhoneNumber(candidate)) {
                return { ok: false, message: "Enter a valid phone number, or leave it blank." };
            }
            contactNumber = candidate;
        }
    }

    return { ok: true, value: { name: input.name.trim(), location, contactNumber } };
}