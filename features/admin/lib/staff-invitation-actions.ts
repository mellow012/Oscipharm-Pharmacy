"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../../../lib/auth";
import {
    createInvitation,
    resendInvitation,
    revokeInvitation,
    STAFF_INVITATION_EMAIL_FAILURE,
} from "./staff-invitation-service";

const SIGN_IN_REQUIRED = { ok: false as const, message: "Sign in required." };

async function currentActorId() {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
}

export async function inviteStaff(input: { email: string; role: string; branchId: string | null }) {
    const actorId = await currentActorId();
    if (!actorId) return SIGN_IN_REQUIRED;
    const result = await createInvitation(actorId, input);
    if (result.ok || result.message === STAFF_INVITATION_EMAIL_FAILURE) revalidatePath("/admin/staff");
    return { ok: result.ok, message: result.message };
}

export async function resendStaffInvitation(invitationId: string) {
    const actorId = await currentActorId();
    if (!actorId) return SIGN_IN_REQUIRED;
    const result = await resendInvitation(actorId, invitationId);
    if (result.ok || result.message === STAFF_INVITATION_EMAIL_FAILURE) revalidatePath("/admin/staff");
    return { ok: result.ok, message: result.message };
}

export async function revokeStaffInvitation(invitationId: string) {
    const actorId = await currentActorId();
    if (!actorId) return SIGN_IN_REQUIRED;
    const result = await revokeInvitation(actorId, invitationId);
    if (result.ok) revalidatePath("/admin/staff");
    return { ok: result.ok, message: result.message };
}