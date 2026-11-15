import type { Role } from "@prisma/client";

export const MEMBER_LOOKUP_SELECT = {
    fullName: true,
    phone: true,
    discountTier: true,
    status: true,
    healthConditions: true,
    otherHealthCondition: true,
} as const;

export const POS_MEMBER_LOOKUP_SELECT = MEMBER_LOOKUP_SELECT;

export function getMemberLookupSelect(role: Role) {
    return role === "POS" ? POS_MEMBER_LOOKUP_SELECT : MEMBER_LOOKUP_SELECT;
}

export function buildMemberLookupWhere(role: Role, query: string) {
    return {
        ...(role === "POS" ? { status: "ACTIVE" as const, discountTier: { not: null } } : {}),
        OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
        ],
    };
}

export function getMemberLookupQuery(query: string) {
    return query.trim();
}