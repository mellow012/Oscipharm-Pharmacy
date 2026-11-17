"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { can } from "../../../lib/permissions";
import { authOptions } from "../../../lib/auth";
import { archiveBranch, createBranch, deactivateBranch, deleteBranch, reactivateBranch, restoreBranch, updateBranch } from "./branch-service";
import { revalidatePublicCatalog } from "@/features/catalog/lib/public-catalog-cache";
import { updateStaffNotificationsTag } from "@/features/notifications/lib/notification-cache";

type BranchActionState = { ok: boolean; message: string } | null;

async function currentActorId() {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
}

function branchInput(formData: FormData) {
    return {
        name: formData.get("name"),
        location: formData.get("location"),
        contactNumber: formData.get("contactNumber"),
    };
}

function branchIdFrom(formData: FormData) {
    return String(formData.get("branchId") ?? "");
}

async function revalidateBranchPages() {
    updateStaffNotificationsTag();
    revalidatePublicCatalog();
    revalidatePath("/", "page");
    revalidatePath("/catalog", "page");
    revalidatePath("/catalog/[categoryId]", "page");
    revalidatePath("/catalog/[categoryId]/[ingredientId]", "page");
    revalidatePath("/catalog/product/[variantId]", "page");
    revalidatePath("/news", "page");
    revalidatePath("/news/[slug]", "page");
    revalidatePath("/admin/branches");
    revalidatePath("/admin/staff");
    revalidatePath("/admin");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    revalidatePath("/staff/catalog");
    revalidatePath("/staff/import");
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

async function adminActorId() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN" || !can(session.user.role, "branches:manage")) return null;
    return session.user.id;
}

export async function deleteBranchAction(branchId: string): Promise<BranchActionState> {
    const actorId = await adminActorId();
    if (!actorId) return { ok: false, message: "You are not authorized to manage branches." };
    const result = await deleteBranch(actorId, branchId);
    if (result.ok) await revalidateBranchPages();
    return { ok: result.ok, message: result.message };
}

export async function archiveBranchAction(branchId: string): Promise<BranchActionState> {
    const actorId = await adminActorId();
    if (!actorId) return { ok: false, message: "You are not authorized to manage branches." };
    const result = await archiveBranch(actorId, branchId);
    if (result.ok) await revalidateBranchPages();
    return { ok: result.ok, message: result.message };
}

export async function restoreBranchAction(branchId: string): Promise<BranchActionState> {
    const actorId = await adminActorId();
    if (!actorId) return { ok: false, message: "You are not authorized to manage branches." };
    const result = await restoreBranch(actorId, branchId);
    if (result.ok) await revalidateBranchPages();
    return { ok: result.ok, message: result.message };
}