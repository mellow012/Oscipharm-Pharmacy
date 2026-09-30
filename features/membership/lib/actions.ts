"use server";

import { MembershipContactPreference, MembershipStatus, MembershipTier, Prisma } from "@prisma/client";
import { z } from "zod";
import { membershipTopicValues } from "@/features/membership/types";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { membershipDiscountPercent } from "@/features/membership/lib/policy";

export type MembershipActionState = {
    error?: string;
    success?: string;
};

export type MembershipLookup = {
    id: string;
    fullName: string;
    discountPercent: string;
};

const membershipTiers = [MembershipTier.CHRONIC_ILLNESS, MembershipTier.GENERAL_SICKNESS];

const applicationSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(30),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]),
    workPlace: z.string().trim().min(2).max(120),
    currentAddress: z.string().trim().min(3).max(200),
    village: z.string().trim().min(2).max(120),
    healthConditions: z.array(z.enum(membershipTopicValues)).max(membershipTopicValues.length),
    otherHealthCondition: z.string().trim().max(120),
    contactPreference: z.nativeEnum(MembershipContactPreference),
    consent: z.literal("on"),
}).refine((application) => application.healthConditions.length > 0 || application.otherHealthCondition.length > 0, {
    message: "Select a listed condition or enter another illness.",
    path: ["healthConditions"],
});

export async function applyForMembership(
    _previousState: MembershipActionState,
    formData: FormData
): Promise<MembershipActionState> {
    if (String(formData.get("website") ?? "").trim()) {
        return { success: "Your request has been received." };
    }

    const parsed = applicationSchema.safeParse({
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
        email: String(formData.get("email") ?? "").trim(),
        workPlace: formData.get("workPlace"),
        currentAddress: formData.get("currentAddress"),
        village: formData.get("village"),
        healthConditions: formData.getAll("healthConditions"),
        otherHealthCondition: String(formData.get("otherHealthCondition") ?? "").trim(),
        contactPreference: formData.get("contactPreference"),
        consent: formData.get("consent"),
    });

    if (!parsed.success) {
        return { error: "Complete the required details, provide a health condition, and give consent to continue." };
    }

    if (parsed.data.contactPreference === "EMAIL" && !parsed.data.email) {
        return { error: "Add an email address to choose email as your preferred contact method." };
    }

    try {
        await prisma.membershipApplication.create({
            data: {
                fullName: parsed.data.fullName,
                phone: parsed.data.phone,
                email: parsed.data.email || null,
                workPlace: parsed.data.workPlace,
                currentAddress: parsed.data.currentAddress,
                village: parsed.data.village,
                healthConditions: parsed.data.healthConditions,
                otherHealthCondition: parsed.data.otherHealthCondition || null,
                contactPreference: parsed.data.contactPreference,
                updatesConsentAt: new Date(),
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { error: "A membership request already exists for this phone number. Please contact the branch to update it." };
        }
        throw error;
    }

    revalidatePath("/admin/memberships");
    return { success: "Your membership request was received. Our team will contact you about enrollment and applicable discounts." };
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
