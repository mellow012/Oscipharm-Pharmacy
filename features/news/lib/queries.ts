import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.ts";
import { eventEffectiveEnd, isUpcomingEvent, orderAll, orderPastEvents, orderUpcomingEvents, type NewsTab } from "./news-feed.ts";
import { publicAnyNewsWhere, publicNewsWhere } from "./news-rules.ts";

const publicInclude = {
    images: { orderBy: { sortOrder: "asc" as const } },
    createdBy: { select: { id: true, name: true } },
};

type PublicPost = Prisma.NewsGetPayload<{ include: typeof publicInclude }>;

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
    const items = posts.filter((post) => post.type === "NEWS" || isUpcomingEvent(post, now));
    return { items: orderAll(items) };
}

export async function getNewsBySlug(slug: string) {
    return prisma.news.findFirst({
        where: { slug, ...publicAnyNewsWhere() },
        include: publicInclude,
    });
}
