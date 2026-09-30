import type { MembershipTier } from "@prisma/client";

export const membershipDiscountPercent: Record<MembershipTier, number> = {
    CHRONIC_ILLNESS: 20,
    GENERAL_SICKNESS: 15,
};

export const membershipTierLabels: Record<MembershipTier, string> = {
    CHRONIC_ILLNESS: "Chronic illness",
    GENERAL_SICKNESS: "General sickness",
};