"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../../../lib/auth.ts";
import { createNewsPost, deleteNewsPost, publishNewsPost, unpublishNewsPost, updateNewsPost } from "./news-service.ts";
import type { NewsActionResult, NewsInputPayload } from "../types.ts";

async function getActorId(): Promise<string | NewsActionResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { ok: false, message: "Sign in required." };
    return session.user.id;
}

function isActionFailure(value: string | NewsActionResult): value is NewsActionResult {
    return typeof value !== "string";
}

function toActionResult(result: { ok: true; data: { id: string; slug: string } } | { ok: false; message: string }): NewsActionResult {
    if (!result.ok) return result;
    return { ok: true, newsId: result.data.id, slug: result.data.slug };
}

export async function createNewsPostAction(input: NewsInputPayload): Promise<NewsActionResult> {
    const actorId = await getActorId();
    if (isActionFailure(actorId)) return actorId;
    const result = toActionResult(await createNewsPost(actorId, input));
    if (result.ok) {
        revalidatePath("/staff/news");
        revalidatePath("/news");
    }
    return result;
}

export async function updateNewsPostAction(postId: string, input: NewsInputPayload): Promise<NewsActionResult> {
    const actorId = await getActorId();
    if (isActionFailure(actorId)) return actorId;
    const result = toActionResult(await updateNewsPost(actorId, postId, input));
    if (result.ok) {
        revalidatePath("/staff/news");
        revalidatePath(`/staff/news/${postId}/preview`);
        revalidatePath("/news");
    }
    return result;
}

export async function deleteNewsPostAction(postId: string): Promise<NewsActionResult> {
    const actorId = await getActorId();
    if (isActionFailure(actorId)) return actorId;
    const result = await deleteNewsPost(actorId, postId);
    if (!result.ok) return result;
    revalidatePath("/staff/news");
    revalidatePath("/news");
    return { ok: true };
}

export async function publishNewsPostAction(postId: string): Promise<NewsActionResult> {
    const actorId = await getActorId();
    if (isActionFailure(actorId)) return actorId;
    const result = toActionResult(await publishNewsPost(actorId, postId));
    if (result.ok) {
        revalidatePath("/staff/news");
        revalidatePath(`/staff/news/${postId}/preview`);
        revalidatePath("/news");
    }
    return result;
}

export async function unpublishNewsPostAction(postId: string): Promise<NewsActionResult> {
    const actorId = await getActorId();
    if (isActionFailure(actorId)) return actorId;
    const result = toActionResult(await unpublishNewsPost(actorId, postId));
    if (result.ok) {
        revalidatePath("/staff/news");
        revalidatePath(`/staff/news/${postId}/preview`);
        revalidatePath("/news");
    }
    return result;
}
