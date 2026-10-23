import type { Prisma, PrismaClient, Role } from "@prisma/client";
import { can } from "../../../lib/permissions.ts";
import { decideNewsAccess } from "./news-rules.ts";
import {
    ALT_MAX,
    buildStoragePath,
    canAddImage,
    CAPTION_MAX,
    detectImageType,
    isImageSizeAllowed,
    MAX_IMAGE_BYTES,
    normalizeText,
    reorderIds,
    type NewsImageStorage,
} from "./image-rules.ts";

type Db = PrismaClient;
type Tx = Prisma.TransactionClient;
type Actor = { id: string; role: Role; branchId: string | null; isActive: boolean };
type Post = { id: string; slug: string; createdById: string };
type ImageRecord = {
    id: string;
    newsId: string;
    url: string;
    storagePath: string | null;
    altText: string | null;
    caption: string | null;
    sortOrder: number;
    news: Post;
};
type ImageData = Pick<ImageRecord, "id" | "newsId" | "url" | "altText" | "caption" | "sortOrder">;
type Failure = { ok: false; message: string; status: 400 | 403 | 404 | 413 | 500 | 503 };
type Success<T> = { ok: true; message: string; data: T };
type Result<T> = Success<T> | Failure;

async function readActor(db: Db | Tx, actorId: string): Promise<Actor | null> {
    return db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, branchId: true, isActive: true } });
}

function canAccess(actor: Actor | null, authorId: string): boolean {
    const roleAllowed = actor?.role === "ADMIN" || actor?.role === "BRANCH_MANAGER";
    return decideNewsAccess({
        actor,
        canManageNews: Boolean(roleAllowed && actor && can(actor.role, "news:manage")),
        authorId,
    });
}

function fail(message: string, status: Failure["status"]): Failure {
    return { ok: false, message, status };
}

async function findPost(db: Db | Tx, postId: string): Promise<Post | null> {
    return db.news.findUnique({ where: { id: postId }, select: { id: true, slug: true, createdById: true } });
}

async function findImage(db: Db | Tx, imageId: string): Promise<ImageRecord | null> {
    return db.newsImage.findUnique({
        where: { id: imageId },
        include: { news: { select: { id: true, slug: true, createdById: true } } },
    });
}

async function writeAudit(tx: Tx, actor: Actor, imageId: string, op: string) {
    await tx.auditLog.create({
        data: {
            action: "NEWS_UPDATED",
            userId: actor.id,
            branchId: actor.branchId,
            details: { changed: ["images"], op, imageId },
        },
    });
}

async function renumber(tx: Tx, postId: string, orderedIds: string[]) {
    for (let sortOrder = 0; sortOrder < orderedIds.length; sortOrder += 1) {
        await tx.newsImage.update({ where: { id: orderedIds[sortOrder] }, data: { sortOrder } });
    }
    return tx.newsImage.findMany({
        where: { newsId: postId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, newsId: true, url: true, altText: true, caption: true, sortOrder: true },
    });
}

async function removeBestEffort(storage: NewsImageStorage, path: string) {
    try {
        await storage.remove(path);
    } catch {
        // Upload cleanup is best effort; the caller still returns the transaction failure.
    }
}

export async function attachImage({
    prisma,
    storage,
    actorId,
    postId,
    bytes,
    altText,
    caption,
}: {
    prisma: Db;
    storage: NewsImageStorage;
    actorId: string;
    postId: string;
    bytes: Uint8Array;
    altText: unknown;
    caption: unknown;
}): Promise<Result<{ postId: string; slug: string; image: ImageData }>> {
    try {
        const actor = await readActor(prisma, actorId);
        if (!actor || !actor.isActive) return fail("You are not allowed to manage images.", 403);
        if (!storage.isConfigured()) return fail("Image storage is not configured.", 503);
        if (!isImageSizeAllowed(bytes.byteLength)) return fail(`Images must be ${MAX_IMAGE_BYTES} bytes or smaller.`, bytes.byteLength > MAX_IMAGE_BYTES ? 413 : 400);
        const imageType = detectImageType(bytes);
        if (!imageType) return fail("Choose a valid JPEG, PNG, WebP, or AVIF image.", 400);
        const normalizedAlt = normalizeText(altText, ALT_MAX);
        const normalizedCaption = normalizeText(caption, CAPTION_MAX);
        if (!normalizedAlt.ok || !normalizedCaption.ok) return fail("Image text is too long or invalid.", 400);

        const post = await findPost(prisma, postId);
        if (!post) return fail("Post not found.", 404);
        if (!canAccess(actor, post.createdById)) return fail("You are not allowed to manage images.", 403);
        const imageCount = await prisma.newsImage.count({ where: { newsId: postId } });
        if (!canAddImage(imageCount)) return fail("A post can have at most 8 images.", 400);

        const storagePath = buildStoragePath(postId, imageType.ext);
        let uploaded: Awaited<ReturnType<NewsImageStorage["upload"]>>;
        try {
            uploaded = await storage.upload(storagePath, bytes, imageType.mime);
        } catch {
            console.error("news image upload threw");
            return fail("Image upload failed.", 500);
        }
        if (!uploaded.ok) {
            console.error("news image upload failed:", uploaded.reason);
            return fail("Image upload failed.", 500);
        }

        try {
            const data = await prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT "id" FROM "News" WHERE "id" = ${postId} FOR UPDATE`;
                const currentActor = await readActor(tx, actorId);
                const currentPost = await findPost(tx, postId);
                if (!currentActor || !currentActor.isActive || !currentPost) return { error: "Post not found or access denied." as const, status: 403 as const };
                if (!canAccess(currentActor, currentPost.createdById)) return { error: "Post not found or access denied." as const, status: 403 as const };
                const currentCount = await tx.newsImage.count({ where: { newsId: postId } });
                if (!canAddImage(currentCount)) return { error: "A post can have at most 8 images." as const, status: 400 as const };
                const maximum = await tx.newsImage.aggregate({ where: { newsId: postId }, _max: { sortOrder: true } });
                const created = await tx.newsImage.create({
                    data: {
                        newsId: postId,
                        url: uploaded.url,
                        storagePath,
                        altText: normalizedAlt.value,
                        caption: normalizedCaption.value,
                        sortOrder: (maximum._max.sortOrder ?? -1) + 1,
                    },
                    select: { id: true, newsId: true, url: true, altText: true, caption: true, sortOrder: true },
                });
                await writeAudit(tx, currentActor, created.id, "add");
                return { created };
            });
            if ("error" in data && data.error) {
                await removeBestEffort(storage, storagePath);
                return fail(data.error, data.status);
            }
            return { ok: true, message: "Image added.", data: { postId, slug: post.slug, image: data.created } };
        } catch {
            await removeBestEffort(storage, storagePath);
            return fail("Image could not be attached.", 500);
        }
    } catch {
        return fail("Image could not be attached.", 500);
    }
}

export async function deleteImage({ prisma, storage, actorId, imageId }: {
    prisma: Db;
    storage: NewsImageStorage;
    actorId: string;
    imageId: string;
}): Promise<Result<{ postId: string; slug: string }>> {
    try {
        const actor = await readActor(prisma, actorId);
        if (!actor || !actor.isActive) return fail("You are not allowed to manage images.", 403);
        const image = await findImage(prisma, imageId);
        if (!image) return fail("Image not found.", 404);
        if (!canAccess(actor, image.news.createdById)) return fail("You are not allowed to manage images.", 403);
        await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "News" WHERE "id" = ${image.newsId} FOR UPDATE`;
            const currentActor = await readActor(tx, actorId);
            const currentImage = await findImage(tx, imageId);
            if (!currentActor || !currentActor.isActive || !currentImage || !canAccess(currentActor, currentImage.news.createdById)) {
                throw new Error("Image could not be deleted.");
            }
            await tx.newsImage.delete({ where: { id: imageId } });
            const remaining = await tx.newsImage.findMany({ where: { newsId: image.newsId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
            await renumber(tx, image.newsId, remaining.map((row) => row.id));
            await writeAudit(tx, currentActor, imageId, "delete");
        });
        if (image.storagePath) {
            try {
                await storage.remove(image.storagePath);
            } catch {
                // The database row is already removed; storage cleanup is best effort.
            }
        }
        return { ok: true, message: "Image deleted.", data: { postId: image.newsId, slug: image.news.slug } };
    } catch {
        return fail("Image could not be deleted.", 500);
    }
}

export async function moveImage({ prisma, actorId, imageId, direction }: {
    prisma: Db;
    actorId: string;
    imageId: string;
    direction: "up" | "down";
}): Promise<Result<{ postId: string; slug: string; images: ImageData[] }>> {
    try {
        const actor = await readActor(prisma, actorId);
        if (!actor || !actor.isActive) return fail("You are not allowed to manage images.", 403);
        const image = await findImage(prisma, imageId);
        if (!image) return fail("Image not found.", 404);
        if (!canAccess(actor, image.news.createdById)) return fail("You are not allowed to manage images.", 403);
        const data = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "News" WHERE "id" = ${image.newsId} FOR UPDATE`;
            const currentActor = await readActor(tx, actorId);
            const currentImage = await findImage(tx, imageId);
            if (!currentActor || !currentActor.isActive || !currentImage || !canAccess(currentActor, currentImage.news.createdById)) return null;
            const rows = await tx.newsImage.findMany({ where: { newsId: image.newsId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
            const ids = reorderIds(rows.map((row) => row.id), imageId, direction);
            const images = await renumber(tx, image.newsId, ids);
            await writeAudit(tx, currentActor, imageId, "move");
            return { images, postId: image.newsId, slug: image.news.slug };
        });
        if (!data) return fail("Image not found or access denied.", 403);
        return { ok: true, message: "Image order updated.", data };
    } catch {
        return fail("Image order could not be updated.", 500);
    }
}

export async function updateImageText({ prisma, actorId, imageId, altText, caption }: {
    prisma: Db;
    actorId: string;
    imageId: string;
    altText: unknown;
    caption: unknown;
}): Promise<Result<{ postId: string; slug: string; image: ImageData }>> {
    try {
        const actor = await readActor(prisma, actorId);
        if (!actor || !actor.isActive) return fail("You are not allowed to manage images.", 403);
        const image = await findImage(prisma, imageId);
        if (!image) return fail("Image not found.", 404);
        if (!canAccess(actor, image.news.createdById)) return fail("You are not allowed to manage images.", 403);
        const normalizedAlt = normalizeText(altText, ALT_MAX);
        const normalizedCaption = normalizeText(caption, CAPTION_MAX);
        if (!normalizedAlt.ok || !normalizedCaption.ok) return fail("Image text is too long or invalid.", 400);
        const updated = await prisma.$transaction(async (tx) => {
            const currentActor = await readActor(tx, actorId);
            const currentImage = await findImage(tx, imageId);
            if (!currentActor || !currentActor.isActive || !currentImage || !canAccess(currentActor, currentImage.news.createdById)) return null;
            const saved = await tx.newsImage.update({
                where: { id: imageId },
                data: { altText: normalizedAlt.value, caption: normalizedCaption.value },
                select: { id: true, newsId: true, url: true, altText: true, caption: true, sortOrder: true },
            });
            await writeAudit(tx, currentActor, imageId, "text");
            return saved;
        });
        if (!updated) return fail("Image not found or access denied.", 403);
        return { ok: true, message: "Image text saved.", data: { postId: image.newsId, slug: image.news.slug, image: updated } };
    } catch {
        return fail("Image text could not be saved.", 500);
    }
}