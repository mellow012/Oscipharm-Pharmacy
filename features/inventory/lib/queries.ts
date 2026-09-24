import { prisma } from "@/lib/prisma";

export async function getInventoryBranches() {
    return prisma.branch.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, location: true },
    });
}

export async function getInventoryData(branchId: string) {
    const [branch, batches, variants] = await prisma.$transaction([
        prisma.branch.findUnique({
            where: { id: branchId },
            select: { id: true, name: true, location: true },
        }),
        prisma.batch.findMany({
            where: { branchId, quantityRemaining: { gt: 0 } },
            orderBy: { expiryDate: "asc" },
            select: {
                id: true,
                batchNumber: true,
                quantityRemaining: true,
                expiryDate: true,
                variant: {
                    select: {
                        brandName: true,
                        strength: true,
                        unitLabel: true,
                        ingredient: { select: { name: true } },
                    },
                },
            },
        }),
        prisma.variant.findMany({
            orderBy: [{ ingredient: { name: "asc" } }, { brandName: "asc" }],
            select: {
                id: true,
                brandName: true,
                strength: true,
                packSize: true,
                unitLabel: true,
                allowsLooseSale: true,
                ingredient: { select: { name: true } },
                branchPrices: {
                    where: { branchId },
                    select: { pricePerPack: true, pricePerUnit: true, reorderThreshold: true },
                },
            },
        }),
    ]);

    return {
        branch,
        batches,
        variants: variants.map((variant) => ({
            id: variant.id,
            brandName: variant.brandName,
            strength: variant.strength,
            packSize: variant.packSize,
            unitLabel: variant.unitLabel,
            allowsLooseSale: variant.allowsLooseSale,
            ingredient: variant.ingredient,
            price: variant.branchPrices[0]
                ? {
                    pricePerPack: variant.branchPrices[0].pricePerPack.toString(),
                    pricePerUnit: variant.branchPrices[0].pricePerUnit.toString(),
                    reorderThreshold: variant.branchPrices[0].reorderThreshold,
                }
                : null,
        })),
    };
}