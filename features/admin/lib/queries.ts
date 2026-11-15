import { prisma } from "@/lib/prisma";

export async function getAdminDashboardData() {
    const [userCount, branchCount, variantCount, batchCount, branches, users] = await prisma.$transaction([
        prisma.user.count({ where: { isActive: true, archivedAt: null } }),
        prisma.branch.count({ where: { archivedAt: null } }),
        prisma.variant.count(),
        prisma.batch.count(),
        prisma.branch.findMany({
            where: { archivedAt: null },
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { users: true, batches: true, sales: true },
                },
            },
        }),
        prisma.user.findMany({
            where: { archivedAt: null },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                branch: { select: { name: true } },
            },
        }),
    ]);

    return {
        stats: { userCount, branchCount, variantCount, batchCount },
        branches,
        users,
    };
}