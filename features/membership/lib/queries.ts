import { prisma } from "@/lib/prisma";

export async function getMembershipApplications() {
    return prisma.membershipApplication.findMany({
        orderBy: [{ createdAt: "desc" }],
    });
}
