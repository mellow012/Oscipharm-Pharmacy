import { prisma } from "@/lib/prisma";

export async function getBranches() {
    return prisma.branch.findMany({
        select: { name: true, location: true },
        orderBy: { name: "asc" },
    });
}
