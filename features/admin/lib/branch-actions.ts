"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../../../lib/auth";
import { createBranch, deactivateBranch, reactivateBranch, updateBranch } from "./branch-service";

type BranchActionState = { ok: boolean; message: string } | null;

async function currentActorId() {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
}

function branchInput(formData: FormData) {
    return {
        name: formData.get("name"),
        location: formData.get("location"),
    };
}

function branchIdFrom(formData: FormData) {
    return String(formData.get("branchId") ?? "");
}

async function revalidateBranchPages() {
    revalidatePath("/admin/branches");
    revalidatePath("/admin");
}

export async function createBranchAction(_previousState: BranchActionState, formData: FormData): Promise<BranchActionState> {
    const actorId = await currentActorId();
    if (!actorId) return { ok: false, message: "Sign in required." };

    const result = await createBranch(actorId, branchInput(formData));
    if (result.ok) await revalidateBranchPages();
    return { ok: result.ok, message: result.message };
}

export async function updateBranchAction(_previousState: BranchActionState, formData: FormData): Promise<BranchActionState> {
    const actorId = await currentActorId();
    if (!actorId) return { ok: false, message: "Sign in required." };

    const result = await updateBranch(actorId, branchIdFrom(formData), branchInput(formData));
    if (result.ok) await revalidateBranchPages();
    return { ok: result.ok, message: result.message };
}

export async function deactivateBranchAction(_previousState: BranchActionState, formData: FormData): Promise<BranchActionState> {
    const actorId = await currentActorId();
    if (!actorId) return { ok: false, message: "Sign in required." };

    const result = await deactivateBranch(actorId, branchIdFrom(formData));
    if (result.ok) await revalidateBranchPages();
    return { ok: result.ok, message: result.message };
}

export async function reactivateBranchAction(_previousState: BranchActionState, formData: FormData): Promise<BranchActionState> {
    const actorId = await currentActorId();
    if (!actorId) return { ok: false, message: "Sign in required." };

    const result = await reactivateBranch(actorId, branchIdFrom(formData));
    if (result.ok) await revalidateBranchPages();
    return { ok: result.ok, message: result.message };
}