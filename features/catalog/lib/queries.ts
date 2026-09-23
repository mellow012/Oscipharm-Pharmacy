import { prisma } from "@/lib/prisma";
import { Category, Ingredient, Variant, BranchPrice } from "@prisma/client";

export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getCatalogBrowserData() {
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
    products: variants.map((variant) => ({
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

export async function getIngredients(categoryId: string): Promise<Ingredient[]> {
  return prisma.ingredient.findMany({
    where: { categoryId },
    orderBy: { name: "asc" },
  });
}

export async function getVariants(ingredientId: string): Promise<Variant[]> {
  return prisma.variant.findMany({
    where: { ingredientId },
    orderBy: { brandName: "asc" }, // Fixed based on schema
  });
}

export async function getBranchPrices(
  variantId: string,
  branchId: string,
): Promise<BranchPrice | null> {
  return prisma.branchPrice.findFirst({
    where: { variantId, branchId },
  });
}
