import { prisma } from "../../../lib/prisma.ts";

export async function getActiveBranches() {
    return prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, location: true },
    });
}