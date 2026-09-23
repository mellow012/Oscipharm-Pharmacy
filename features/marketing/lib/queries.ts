import { prisma } from "@/lib/prisma";

export async function getBranches() {
    return prisma.branch.findMany({
        select: { name: true, location: true },
        orderBy: { name: "asc" },
    });
}

export async function getHomepageCatalog() {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
    });
    const variants = await prisma.variant.findMany({
        orderBy: [{ ingredient: { name: "asc" } }, { brandName: "asc" }],
        select: {
            id: true,
            brandName: true,
            strength: true,
            unitLabel: true,
            ingredient: { select: { name: true, categoryId: true } },
            batches: { select: { quantityRemaining: true } },
            branchPrices: { select: { pricePerPack: true }, orderBy: { pricePerPack: "asc" }, take: 1 },
        },
    });

    return {
        categories,
        variants: variants.map((variant) => ({
            id: variant.id,
            brandName: variant.brandName,
            strength: variant.strength,
            unitLabel: variant.unitLabel,
            ingredientName: variant.ingredient.name,
            categoryId: variant.ingredient.categoryId,
            stock: variant.batches.reduce((total, batch) => total + batch.quantityRemaining, 0),
            pricePerPack: variant.branchPrices[0]?.pricePerPack.toString() ?? null,
        })),
    };
}
