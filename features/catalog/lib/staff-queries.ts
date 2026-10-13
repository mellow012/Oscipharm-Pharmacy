import { prisma } from "@/lib/prisma";
import type { StaffCatalogCategory } from "@/features/catalog/types";

export async function getStaffCatalogBranches() {
    return prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function getStaffCatalogData(branchId: string): Promise<StaffCatalogCategory[]> {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            ingredients: {
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    variants: {
                        orderBy: [{ brandName: "asc" }, { strength: "asc" }],
                        select: {
                            id: true,
                            brandName: true,
                            strength: true,
                            packSize: true,
                            unitLabel: true,
                            allowsLooseSale: true,
                            isActive: true,
                            branchPrices: { where: { branchId }, select: { pricePerPack: true, pricePerUnit: true } },
                            batches: { where: { branchId }, select: { quantityRemaining: true } },
                            aroniumProductLinks: {
                                orderBy: [{ mode: "asc" }, { aroniumCode: "asc" }],
                                select: { id: true, aroniumCode: true, mode: true },
                            },
                        },
                    },
                },
            },
        },
    });

    return categories.map((category) => ({
        ...category,
        ingredients: category.ingredients.map((ingredient) => ({
            ...ingredient,
            variants: ingredient.variants.map((variant) => ({
                id: variant.id,
                brandName: variant.brandName,
                strength: variant.strength,
                packSize: variant.packSize,
                unitLabel: variant.unitLabel,
                allowsLooseSale: variant.allowsLooseSale,
                isActive: variant.isActive,
                pricePerPack: variant.branchPrices[0]?.pricePerPack.toString() ?? null,
                pricePerUnit: variant.allowsLooseSale ? variant.branchPrices[0]?.pricePerUnit.toString() ?? null : null,
                stock: variant.batches.reduce((total, batch) => total + batch.quantityRemaining, 0),
                aroniumProductLinks: variant.aroniumProductLinks,
            })),
        })),
    }));
}