"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../../../lib/auth.ts";
import { prisma } from "../../../lib/prisma.ts";
import { createStorage } from "../../../lib/supabase-storage.ts";
import { deleteImage, moveImage, updateImageText } from "./image-service.ts";

async function actorId() {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
}

function revalidateImagePaths(data: { postId: string; slug: string }) {
    revalidatePath("/news");
    revalidatePath(`/news/${data.slug}`);
    revalidatePath("/staff/news");
    revalidatePath(`/staff/news/${data.postId}/preview`);
    revalidatePath(`/staff/news/${data.postId}/edit`);
}

export async function deleteImageAction(imageId: string) {
    const currentActorId = await actorId();
    if (!currentActorId) return { ok: false as const, message: "Sign in required." };
    const result = await deleteImage({ prisma, storage: createStorage(), actorId: currentActorId, imageId });
    if (result.ok) revalidateImagePaths(result.data);
    return result;
}

export async function moveImageAction(imageId: string, direction: "up" | "down") {
    const currentActorId = await actorId();
    if (!currentActorId) return { ok: false as const, message: "Sign in required." };
    const result = await moveImage({ prisma, actorId: currentActorId, imageId, direction });
    if (result.ok) revalidateImagePaths(result.data);
    return result;
}

export async function updateImageTextAction(imageId: string, altText: string, caption: string) {
    const currentActorId = await actorId();
    if (!currentActorId) return { ok: false as const, message: "Sign in required." };
    const result = await updateImageText({ prisma, actorId: currentActorId, imageId, altText, caption });
    if (result.ok) revalidateImagePaths(result.data);
    return result;
}