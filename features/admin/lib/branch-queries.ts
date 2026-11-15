import { prisma } from "../../../lib/prisma.ts";

export async function getActiveBranches() {
    return prisma.branch.findMany({
        where: { isActive: true, archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, location: true },
    });
}

export async function getBranchesForAdmin() {
    return prisma.branch.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            location: true,
            contactNumber: true,
            isActive: true,
            archivedAt: true,
            _count: { select: { users: true, batches: true } },
        },
    });
}