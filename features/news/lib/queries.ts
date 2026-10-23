import { prisma } from "../../../lib/prisma.ts";
import { publicNewsWhere } from "./news-rules.ts";

export async function getPublishedNews() {
    return prisma.news.findMany({
        where: publicNewsWhere("NEWS"),
        orderBy: { publishedAt: "desc" },
        include: { images: { orderBy: { sortOrder: "asc" } }, createdBy: { select: { id: true, name: true } } },
    });
}

export async function getNewsBySlug(slug: string) {
    return prisma.news.findFirst({
        where: { slug, ...publicNewsWhere("NEWS") },
        include: { images: { orderBy: { sortOrder: "asc" } }, createdBy: { select: { id: true, name: true } } },
    });
}
