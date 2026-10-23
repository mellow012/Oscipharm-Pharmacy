"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../../../lib/auth";
import { changeStaffRoleAndBranch, deactivateStaff, listStaffBranchesForAdmin, listStaffForAdmin, listTeamForManager, reactivateStaff, sendStaffResetLink } from "./staff-service";
import type { StaffActionResult, StaffBranchesResult, StaffListResult } from "./staff-types";

const SIGN_IN_REQUIRED = { ok: false, message: "Sign in required." } as const;

async function currentActorId() {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
}

export async function getStaffList(): Promise<StaffListResult> {
    const actorId = await currentActorId();
    return actorId ? listStaffForAdmin(actorId) : SIGN_IN_REQUIRED;
}

export async function getStaffBranches(): Promise<StaffBranchesResult> {
    const actorId = await currentActorId();
    return actorId ? listStaffBranchesForAdmin(actorId) : SIGN_IN_REQUIRED;
}

export async function getTeamList(): Promise<StaffListResult> {
    const actorId = await currentActorId();
    return actorId ? listTeamForManager(actorId) : SIGN_IN_REQUIRED;
}

export async function updateStaffRoleAndBranch(input: { userId: string; role: string; branchId: string | null }): Promise<StaffActionResult> {
    const actorId = await currentActorId();
    if (!actorId) return SIGN_IN_REQUIRED;
    const result = await changeStaffRoleAndBranch(actorId, input);
    if (result.ok) {
        revalidatePath("/admin/staff");
        revalidatePath("/staff/team");
    }
    return result;
}

export async function deactivateStaffAccount(userId: string): Promise<StaffActionResult> {
    const actorId = await currentActorId();
    if (!actorId) return SIGN_IN_REQUIRED;
    const result = await deactivateStaff(actorId, userId);
    if (result.ok) {
        revalidatePath("/admin/staff");
        revalidatePath("/staff/team");
        revalidatePath("/admin");
    }
    return result;
}

export async function reactivateStaffAccount(userId: string): Promise<StaffActionResult> {
    const actorId = await currentActorId();
    if (!actorId) return SIGN_IN_REQUIRED;
    const result = await reactivateStaff(actorId, userId);
    if (result.ok) {
        revalidatePath("/admin/staff");
        revalidatePath("/staff/team");
        revalidatePath("/admin");
    }
    return result;
}

export async function sendStaffPasswordReset(userId: string): Promise<StaffActionResult> {
    const actorId = await currentActorId();
    if (!actorId) return SIGN_IN_REQUIRED;
    const result = await sendStaffResetLink(actorId, userId);
    if (result.ok) revalidatePath("/admin/staff");
    return result;
}