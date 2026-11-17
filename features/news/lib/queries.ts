import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "../../../lib/prisma.ts";
import { eventEffectiveEnd, isUpcomingEvent, orderAll, orderPastEvents, orderUpcomingEvents, type NewsTab } from "./news-feed.ts";
import { publicAnyNewsWhere, publicNewsWhere } from "./news-rules.ts";
import { NEWS_CACHE_TAG } from "./news-cache.ts";

const publicInclude = {
    images: {
        orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
        select: { id: true, url: true, altText: true, caption: true, sortOrder: true },
    },
    createdBy: { select: { id: true, name: true } },
};

type PublicPost = Prisma.NewsGetPayload<{ include: typeof publicInclude }>;

const getCachedLatestPublishedAt = unstable_cache(
    async () => {
        const latestPost = await prisma.news.findFirst({
            where: { status: "PUBLISHED" },
            orderBy: { publishedAt: "desc" },
            select: { publishedAt: true },
        });
        return latestPost?.publishedAt.toISOString() ?? null;
    },
    ["latest-published-news-timestamp"],
    { tags: [NEWS_CACHE_TAG] },
);

export function getLatestPublishedAt(): Promise<string | null> {
    return getCachedLatestPublishedAt();
}

export function getPublicFeed(tab: "news", now: Date): Promise<{ items: PublicPost[] }>;
export function getPublicFeed(tab: "events", now: Date): Promise<{ upcoming: PublicPost[]; past: PublicPost[] }>;
export function getPublicFeed(tab: "all", now: Date): Promise<{ items: PublicPost[] }>;
export function getPublicFeed(tab: "news" | "all", now: Date): Promise<{ items: PublicPost[] }>;
export async function getPublicFeed(tab: NewsTab, now: Date): Promise<{ items: PublicPost[] } | { upcoming: PublicPost[]; past: PublicPost[] }> {
    if (tab === "news") {
        const items = await prisma.news.findMany({
            where: publicNewsWhere("NEWS"),
            orderBy: { publishedAt: "desc" },
            include: publicInclude,
        });
        return { items };
    }

    if (tab === "events") {
        const events = await prisma.news.findMany({
            where: { ...publicAnyNewsWhere(), type: "EVENT" },
            include: publicInclude,
        });
        const upcoming = orderUpcomingEvents(events.filter((event) => isUpcomingEvent(event, now)));
        const past = orderPastEvents(events.filter((event) => {
            const effectiveEnd = eventEffectiveEnd(event);
            return effectiveEnd !== null && effectiveEnd < now;
        }));
        return { upcoming, past };
    }

    const posts = await prisma.news.findMany({
        where: publicAnyNewsWhere(),
        include: publicInclude,
    });
    const items = posts.filter((post) => post.type === "NEWS" || post.type === "EVENT");
    return { items: orderAll(items, now) };
}

export async function getNewsBySlug(slug: string) {
    return prisma.news.findFirst({
        where: { slug, ...publicAnyNewsWhere() },
        include: publicInclude,
    });
}
