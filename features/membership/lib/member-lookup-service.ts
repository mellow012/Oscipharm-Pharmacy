import { MembershipStatus, type Role } from "@prisma/client";
import { getMembersAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { membershipDiscountPercent } from "./policy";
import { buildMemberLookupWhere, getMemberLookupQuery, getMemberLookupSelect } from "./member-lookup";

export type MemberLookupRow = {
    name: string;
    phone: string;
    tier: "CHRONIC_ILLNESS" | "GENERAL_SICKNESS" | null;
    discountPercent: number;
    status: MembershipStatus;
    healthConditions: string[];
    otherHealthCondition: string | null;
};

export async function searchMembersForDispensing(role: Role, rawQuery: string): Promise<MemberLookupRow[]> {
    if (!getMembersAccess(role).view) return [];
    const query = getMemberLookupQuery(rawQuery);
    if (query.length < 2) return [];

    const records = await prisma.membershipApplication.findMany({
        where: buildMemberLookupWhere(role, query),
        orderBy: { fullName: "asc" },
        select: getMemberLookupSelect(role),
    });

    return records.map((record) => ({
        name: record.fullName,
        phone: record.phone,
        tier: record.discountTier,
        discountPercent: record.discountTier ? membershipDiscountPercent[record.discountTier] : 0,
        status: record.status,
        healthConditions: record.healthConditions,
        otherHealthCondition: record.otherHealthCondition,
    }));
}