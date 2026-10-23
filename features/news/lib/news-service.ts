import { Prisma, type NewsStatus, type NewsType, type Role } from "@prisma/client";
import { can } from "../../../lib/permissions.ts";
import { prisma } from "../../../lib/prisma.ts";
import { decideNewsAccess, slugWithSuffix, validateNewsInput } from "./news-rules.ts";
import { slugify } from "./news.ts";

type Actor = { id: string; role: Role; branchId: string | null; isActive: boolean };
type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function readActor(actorId: string): Promise<Actor | null> {
    return prisma.user.findUnique({
        where: { id: actorId },
        select: { id: true, role: true, branchId: true, isActive: true },
    });
}

function canAccess(actor: Actor | null, authorId: string) {
    return decideNewsAccess({
        actor,
        canManageNews: actor ? can(actor.role, "news:manage") : false,
        authorId,
    });
}

function accessFailure(): ServiceResult<never> {
    return { ok: false, message: "You are not allowed to manage this post." };
}

function isSlugConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
    const target = error.meta?.target;
    return Array.isArray(target) ? target.includes("slug") : typeof target === "string" && target.includes("slug");
}

function auditDetails(post: { id: string; slug: string; title: string; type: NewsType }, changedFields?: string[]) {
    return {
        newsId: post.id,
        slug: post.slug,
        title: post.title,
        type: post.type,
        ...(changedFields ? { changedFields } : {}),
    };
}

async function createAudit(
    tx: Prisma.TransactionClient,
    actor: Actor,
    action: "NEWS_CREATED" | "NEWS_UPDATED" | "NEWS_PUBLISHED" | "NEWS_UNPUBLISHED" | "NEWS_DELETED",
    post: { id: string; slug: string; title: string; type: NewsType },
    changedFields?: string[],
) {
    await tx.auditLog.create({
        data: {
            action,
            branchId: actor.branchId,
            userId: actor.id,
            details: auditDetails(post, changedFields),
        },
    });
}

export async function createNewsPost(actorId: string, raw: unknown): Promise<ServiceResult<{ id: string; slug: string }>> {
    const actor = await readActor(actorId);
    if (!actor || !canAccess(actor, actor.id)) return accessFailure();

    const validation = validateNewsInput(raw, "create");
    if (!validation.ok) return validation;
    const baseSlug = slugify(validation.data.title);

    for (let attempt = 1; attempt <= 20; attempt += 1) {
        const slug = slugWithSuffix(baseSlug, attempt);
        try {
            const post = await prisma.$transaction(async (tx) => {
                const created = await tx.news.create({
                    data: {
                        ...validation.data,
                        slug,
                        status: "PREVIEW",
                        createdById: actor.id,
                    },
                    select: { id: true, slug: true, title: true, type: true },
                });
                await createAudit(tx, actor, "NEWS_CREATED", created);
                return created;
            });
            return { ok: true, data: { id: post.id, slug: post.slug } };
        } catch (error) {
            if (isSlugConflict(error)) continue;
            throw error;
        }
    }

    return { ok: false, message: "Could not find an available post URL. Change the title and try again." };
}

export async function updateNewsPost(actorId: string, postId: string, raw: unknown): Promise<ServiceResult<{ id: string; slug: string }>> {
    const actor = await readActor(actorId);
    if (!actor) return accessFailure();
    const existing = await prisma.news.findUnique({ where: { id: postId } });
    if (!existing) return { ok: false, message: "Post not found." };
    if (!canAccess(actor, existing.createdById)) return accessFailure();

    const input = raw && typeof raw === "object" && !Array.isArray(raw)
        ? { ...(raw as Record<string, unknown>), type: existing.type }
        : raw;
    const validation = validateNewsInput(input, "edit");
    if (!validation.ok) return validation;
    const data = validation.data;
    const changedFields = (Object.keys(data) as Array<keyof typeof data>).filter((field) => {
        const previous = existing[field];
        const next = data[field];
        if (previous instanceof Date && next instanceof Date) return previous.getTime() !== next.getTime();
        return previous !== next;
    });

    const post = await prisma.$transaction(async (tx) => {
        const updated = await tx.news.update({
            where: { id: existing.id },
            data: { ...data, updatedById: actor.id },
            select: { id: true, slug: true, title: true, type: true },
        });
        await createAudit(tx, actor, "NEWS_UPDATED", updated, changedFields);
        return updated;
    });

    return { ok: true, data: { id: post.id, slug: post.slug } };
}

export async function deleteNewsPost(actorId: string, postId: string): Promise<ServiceResult<null>> {
    const actor = await readActor(actorId);
    if (!actor) return accessFailure();
    const existing = await prisma.news.findUnique({
        where: { id: postId },
        select: { id: true, slug: true, title: true, type: true, createdById: true },
    });
    if (!existing) return { ok: false, message: "Post not found." };
    if (!canAccess(actor, existing.createdById)) return accessFailure();

    await prisma.$transaction(async (tx) => {
        await tx.news.delete({ where: { id: existing.id } });
        await createAudit(tx, actor, "NEWS_DELETED", existing);
    });
    return { ok: true, data: null };
}

async function setNewsStatus(actorId: string, postId: string, status: NewsStatus): Promise<ServiceResult<{ id: string; slug: string }>> {
    const actor = await readActor(actorId);
    if (!actor) return accessFailure();
    const existing = await prisma.news.findUnique({
        where: { id: postId },
        select: { id: true, slug: true, title: true, type: true, status: true, createdById: true },
    });
    if (!existing) return { ok: false, message: "Post not found." };
    if (!canAccess(actor, existing.createdById)) return accessFailure();
    if (existing.status === status) return { ok: true, data: { id: existing.id, slug: existing.slug } };

    const action = status === "PUBLISHED" ? "NEWS_PUBLISHED" : "NEWS_UNPUBLISHED";
    const post = await prisma.$transaction(async (tx) => {
        const updated = await tx.news.update({
            where: { id: existing.id },
            data: {
                status,
                ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
                updatedById: actor.id,
            },
            select: { id: true, slug: true, title: true, type: true },
        });
        await createAudit(tx, actor, action, updated);
        return updated;
    });
    return { ok: true, data: { id: post.id, slug: post.slug } };
}

export async function publishNewsPost(actorId: string, postId: string) {
    return setNewsStatus(actorId, postId, "PUBLISHED");
}

export async function unpublishNewsPost(actorId: string, postId: string) {
    return setNewsStatus(actorId, postId, "PREVIEW");
}

export async function getNewsPostForActor(actorId: string, postId: string) {
    const actor = await readActor(actorId);
    if (!actor || !can(actor.role, "news:manage") || !actor.isActive) return null;
    const post = await prisma.news.findUnique({
        where: { id: postId },
        include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!post || !canAccess(actor, post.createdById)) return null;
    return post;
}

export async function listNewsForActor(actorId: string): Promise<ServiceResult<Array<{
    id: string;
    title: string;
    slug: string;
    type: NewsType;
    status: NewsStatus;
    publishedAt: Date;
    createdAt: Date;
    eventStartsAt: Date | null;
    createdBy: { id: string; name: string };
}>>> {
    const actor = await readActor(actorId);
    if (!actor || !canAccess(actor, actor.id)) return accessFailure();
    const posts = await prisma.news.findMany({
        where: actor.role === "ADMIN" ? {} : { createdById: actor.id },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            status: true,
            publishedAt: true,
            createdAt: true,
            eventStartsAt: true,
            createdBy: { select: { id: true, name: true } },
        },
    });
    return { ok: true, data: posts };
}