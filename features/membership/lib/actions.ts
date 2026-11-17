"use server";

import { MembershipContactPreference, MembershipStatus, MembershipTier, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { membershipDiscountPercent } from "@/features/membership/lib/policy";
import { isMembershipHoneypotFilled, validateMembershipApplication, type MembershipApplicationErrors, type MembershipApplicationValues } from "@/features/membership/lib/application-validation";

const MEMBERSHIP_SUCCESS_MESSAGE = "Thank you, we have received your request. Our team will contact you.";

export type MembershipActionState = {
    fieldErrors?: MembershipApplicationErrors;
    formError?: string;
    values?: MembershipApplicationValues;
    success?: string;
};

export type MembershipLookup = {
    id: string;
    fullName: string;
    discountPercent: string;
};

const membershipTiers = [MembershipTier.CHRONIC_ILLNESS, MembershipTier.GENERAL_SICKNESS];

export async function applyForMembership(
    _previousState: MembershipActionState,
    formData: FormData
): Promise<MembershipActionState> {
    if (isMembershipHoneypotFilled(formData.get("website"))) {
        return { success: MEMBERSHIP_SUCCESS_MESSAGE };
    }

    const validation = validateMembershipApplication({
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        workPlace: formData.get("workPlace"),
        currentAddress: formData.get("currentAddress"),
        village: formData.get("village"),
        healthConditions: formData.getAll("healthConditions"),
        otherHealthCondition: formData.get("otherHealthCondition"),
        contactPreference: formData.get("contactPreference"),
        consent: formData.get("consent") === "on",
    });

    if (!validation.ok) return { fieldErrors: validation.errors, values: validation.values };

    try {
        await prisma.membershipApplication.create({
            data: {
                fullName: validation.value.fullName,
                phone: validation.value.phone,
                email: validation.value.email || null,
                workPlace: validation.value.workPlace,
                currentAddress: validation.value.currentAddress,
                village: validation.value.village,
                healthConditions: validation.value.healthConditions,
                otherHealthCondition: validation.value.otherHealthCondition || null,
                contactPreference: validation.value.contactPreference as MembershipContactPreference,
                updatesConsentAt: new Date(),
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { success: MEMBERSHIP_SUCCESS_MESSAGE };
        }
        return { formError: "We couldn't send your request. Please try again.", values: validation.values };
    }

    revalidatePath("/admin/memberships");
    return { success: MEMBERSHIP_SUCCESS_MESSAGE };
}

export async function reviewMembershipApplication(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "membership:manage")) return;

    const id = String(formData.get("id") ?? "").trim();
    const status = String(formData.get("status") ?? "");
    const tier = String(formData.get("discountTier") ?? "");
    if (!id || (status !== "ACTIVE" && status !== "REJECTED")) return;
    if (status === "ACTIVE" && !membershipTiers.includes(tier as MembershipTier)) return;

    const discountTier = status === "ACTIVE" ? (tier as MembershipTier) : null;
    const discountPercent = discountTier ? membershipDiscountPercent[discountTier] : 0;

    await prisma.membershipApplication.update({
        where: { id },
        data: {
            status: status as MembershipStatus,
            discountTier,
            discountPercent: new Prisma.Decimal(discountPercent),
        },
    });
    revalidatePath("/admin/memberships");
}

export async function lookupActiveMembership(phone: string): Promise<{ member?: MembershipLookup; error?: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "pos:checkout")) return { error: "You are not allowed to look up memberships." };

    const normalizedPhone = phone.trim();
    if (normalizedPhone.length < 7 || normalizedPhone.length > 30) return { error: "Enter the member's phone number." };
    const member = await prisma.membershipApplication.findFirst({
        where: { phone: normalizedPhone, status: MembershipStatus.ACTIVE, discountTier: { not: null } },
        select: { id: true, fullName: true, discountTier: true },
    });
    if (!member) return { error: "No active membership found for that phone number." };
    return { member: { ...member, discountPercent: String(membershipDiscountPercent[member.discountTier!]) } };
}
