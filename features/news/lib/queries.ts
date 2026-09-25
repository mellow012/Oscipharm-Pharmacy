import { prisma } from "@/lib/prisma";

export async function getPublishedNews() {
    return prisma.news.findMany({
        where: { publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
        include: { images: { orderBy: { sortOrder: "asc" } }, createdBy: { select: { id: true, name: true } } },
    });
}

export async function getNewsBySlug(slug: string) {
    return prisma.news.findUnique({
        where: { slug },
        include: { images: { orderBy: { sortOrder: "asc" } }, createdBy: { select: { id: true, name: true } } },
    });
}

export async function getNewsForAdmin() {
    return prisma.news.findMany({
        orderBy: { publishedAt: "desc" },
        include: { images: { orderBy: { sortOrder: "asc" } }, createdBy: { select: { id: true, name: true } } },
    });
}
