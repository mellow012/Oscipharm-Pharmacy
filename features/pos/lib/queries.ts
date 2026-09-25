import { prisma } from "@/lib/prisma";
import { getMalawiDateKey } from "@/lib/timezone";

export async function getPosProducts(branchId: string) {
    const today = new Date();
    const todayKey = getMalawiDateKey(today);
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
            batches: { where: { branchId, quantityRemaining: { gt: 0 } }, select: { quantityRemaining: true, expiryDate: true } },
            branchPrices: { where: { branchId }, select: { pricePerPack: true, pricePerUnit: true } },
        },
    });

    return variants.map((variant) => {
        const price = variant.branchPrices[0];
        const sellableBatches = variant.batches.filter((batch) => getMalawiDateKey(new Date(batch.expiryDate)) >= todayKey);
        return {
            id: variant.id,
            ingredientName: variant.ingredient.name,
            brandName: variant.brandName,
            strength: variant.strength,
            packSize: variant.packSize,
            unitLabel: variant.unitLabel,
            allowsLooseSale: variant.allowsLooseSale,
            stockUnits: sellableBatches.reduce((total, batch) => total + batch.quantityRemaining, 0),
            pricePerPack: price?.pricePerPack.toString() ?? null,
            pricePerUnit: price?.pricePerUnit.toString() ?? null,
        };
    });
}