import { prisma } from "@/lib/prisma";

export async function getAdminDashboardData() {
    const [userCount, branchCount, variantCount, batchCount, branches, users] = await prisma.$transaction([
        prisma.user.count(),
        prisma.branch.count(),
        prisma.variant.count(),
        prisma.batch.count(),
        prisma.branch.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { users: true, batches: true, sales: true },
                },
            },
        }),
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
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