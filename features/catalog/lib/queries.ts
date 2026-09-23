import { prisma } from "@/lib/prisma";
import { Category, Ingredient, Variant, BranchPrice } from "@prisma/client";

export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
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
