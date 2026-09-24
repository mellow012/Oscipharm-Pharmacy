import { prisma } from "@/lib/prisma";

export async function getPosProducts(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const variants = await prisma.variant.findMany({
        orderBy: [{ ingredient: { name: "asc" } }, { brandName: "asc" }],
        select: {
            id: true,
            brandName: true,
            strength: true,
            packSize: true,
            unitLabel: true,
            allowsLooseSale: true,
            ingredient: { select: { name: true } },
            batches: { where: { branchId, quantityRemaining: { gt: 0 }, expiryDate: { gte: today } }, select: { quantityRemaining: true } },
            branchPrices: { where: { branchId }, select: { pricePerPack: true, pricePerUnit: true } },
        },
    });

    return variants.map((variant) => {
        const price = variant.branchPrices[0];
        return {
            id: variant.id,
            ingredientName: variant.ingredient.name,
            brandName: variant.brandName,
            strength: variant.strength,
            packSize: variant.packSize,
            unitLabel: variant.unitLabel,
            allowsLooseSale: variant.allowsLooseSale,
            stockUnits: variant.batches.reduce((total, batch) => total + batch.quantityRemaining, 0),
            pricePerPack: price?.pricePerPack.toString() ?? null,
            pricePerUnit: price?.pricePerUnit.toString() ?? null,
        };
    });
}