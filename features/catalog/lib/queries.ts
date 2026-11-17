import { prisma } from "@/lib/prisma";
import { getPublicAvailability, type AvailabilityBranchInput } from "@/features/catalog/lib/public-availability";

const activeBranchWhere = { isActive: true, archivedAt: null } as const;
const publicContactFallback = "+265996621085";

export type PublicBranch = {
  id: string;
  name: string;
  location: string;
  contactNumber: string | null;
};

export type PublicCatalogVariant = {
  id: string;
  brandName: string;
  strength: string | null;
  packSize: number;
  unitLabel: string;
  ingredientName: string | null;
  branches: Array<PublicBranch & {
    status: "out-of-stock" | "low-stock" | "in-stock";
    pricePerPack: number | null;
  }>;
};

function availabilityInput(
  branches: Array<{ id: string; isActive: boolean; archivedAt: Date | null }>,
  batches: Array<{ branchId: string; quantityRemaining: number; expiryDate: Date; expiryDateKnown: boolean }>,
  prices: Array<{ branchId: string; reorderThreshold: number | null }>,
): AvailabilityBranchInput[] {
  return branches.map((branch) => ({
    ...branch,
    reorderThreshold: prices.find((price) => price.branchId === branch.id)?.reorderThreshold ?? null,
    batches: batches.filter((batch) => batch.branchId === branch.id),
  }));
}

function lowestPackPrice(prices: Array<{ pricePerPack: { toString(): string } }>) {
  const amounts = prices.map((price) => Number(price.pricePerPack.toString())).filter(Number.isFinite);
  return amounts.length ? Math.min(...amounts) : null;
}

export async function getPublicBranches(): Promise<PublicBranch[]> {
  return prisma.branch.findMany({
    where: activeBranchWhere,
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true, contactNumber: true },
  });
}

export async function getCatalogBrowserData() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true },
  });
  const branches = await prisma.branch.findMany({
    where: activeBranchWhere,
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true, contactNumber: true, isActive: true, archivedAt: true },
  });
  const variants = await prisma.variant.findMany({
    where: { isActive: true },
    orderBy: [{ ingredient: { name: "asc" } }, { brandName: "asc" }],
    select: {
      id: true,
      brandName: true,
      strength: true,
      packSize: true,
      unitLabel: true,
      ingredient: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
      batches: { select: { branchId: true, quantityRemaining: true, expiryDate: true, expiryDateKnown: true } },
      branchPrices: {
        where: { branch: activeBranchWhere },
        orderBy: { pricePerPack: "asc" },
        select: { branchId: true, pricePerPack: true, reorderThreshold: true },
      },
    },
  });
  const latestImport = await prisma.importRun.findFirst({
    where: {
      kind: "STOCK",
      status: "COMMITTED",
      committedAt: { not: null },
      branch: activeBranchWhere,
    },
    orderBy: { committedAt: "desc" },
    select: { committedAt: true },
  });

  const products = variants.map((variant) => {
      const availability = getPublicAvailability(
        availabilityInput(branches, variant.batches, variant.branchPrices),
      );
      const ingredient = variant.ingredient;

      return {
        id: variant.id,
        brandName: variant.brandName,
        strength: variant.strength,
        packSize: variant.packSize,
        unitLabel: variant.unitLabel,
        form: variant.unitLabel,
        packLabel: `Pack of ${variant.packSize} ${variant.unitLabel}`,
        ingredientName: ingredient?.name ?? null,
        categoryName: ingredient?.category?.name ?? null,
        availability: availability.status,
        pricePerPack: lowestPackPrice(variant.branchPrices),
        hasMultiplePrices: variant.branchPrices.length > 1,
        branches: branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          location: branch.location,
          contactNumber: branch.contactNumber ?? publicContactFallback,
          status: availability.branches.find((item) => item.branchId === branch.id)?.status ?? "out-of-stock",
          pricePerPack: variant.branchPrices.find((price) => price.branchId === branch.id)?.pricePerPack.toNumber() ?? null,
        })),
      };
    }).filter((product) => product.availability !== "out-of-stock");

  return {
    categories: categories.filter((category) => products.some((product) => product.categoryName === category.name && product.availability !== "out-of-stock")),
    products,
    branches: branches.map(({ id, name, location, contactNumber }) => ({ id, name, location, contactNumber: contactNumber ?? publicContactFallback })),
    availabilityUpdatedAt: latestImport?.committedAt ?? null,
  };
}

export async function getIngredients(categoryId: string) {
  return prisma.ingredient.findMany({
    where: { categoryId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getPublicVariants(ingredientId: string): Promise<PublicCatalogVariant[]> {
  const branches = await prisma.branch.findMany({
    where: activeBranchWhere,
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true, contactNumber: true, isActive: true, archivedAt: true },
  });
  const variants = await prisma.variant.findMany({
    where: { ingredientId, isActive: true },
    orderBy: [{ brandName: "asc" }, { strength: "asc" }],
    select: {
      id: true,
      brandName: true,
      strength: true,
      packSize: true,
      unitLabel: true,
      batches: { where: { branchId: { in: branches.map((branch) => branch.id) } }, select: { branchId: true, quantityRemaining: true, expiryDate: true, expiryDateKnown: true } },
      branchPrices: {
        where: { branchId: { in: branches.map((branch) => branch.id) } },
        select: { branchId: true, pricePerPack: true, reorderThreshold: true },
      },
    },
  });

  return variants.map((variant) => {
    const availability = getPublicAvailability(
      availabilityInput(branches, variant.batches, variant.branchPrices),
    );

    return {
      id: variant.id,
      brandName: variant.brandName,
      strength: variant.strength,
      packSize: variant.packSize,
      unitLabel: variant.unitLabel,
      ingredientName: null,
      branches: branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        location: branch.location,
        contactNumber: branch.contactNumber ?? publicContactFallback,
        status: availability.branches.find((item) => item.branchId === branch.id)?.status ?? "out-of-stock",
        pricePerPack: variant.branchPrices.find((price) => price.branchId === branch.id)?.pricePerPack.toNumber() ?? null,
      })),
    };
  });
}

export async function getPublicProduct(variantId: string): Promise<PublicCatalogVariant | null> {
  const branches = await prisma.branch.findMany({
    where: activeBranchWhere,
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true, contactNumber: true, isActive: true, archivedAt: true },
  });
  const variant = await prisma.variant.findFirst({
    where: { id: variantId, isActive: true },
    select: {
      id: true,
      brandName: true,
      strength: true,
      packSize: true,
      unitLabel: true,
      ingredient: { select: { name: true } },
      batches: { where: { branchId: { in: branches.map((branch) => branch.id) } }, select: { branchId: true, quantityRemaining: true, expiryDate: true, expiryDateKnown: true } },
      branchPrices: {
        where: { branchId: { in: branches.map((branch) => branch.id) } },
        select: { branchId: true, pricePerPack: true, reorderThreshold: true },
      },
    },
  });

  if (!variant) return null;
  const availability = getPublicAvailability(availabilityInput(branches, variant.batches, variant.branchPrices));

  return {
    id: variant.id,
    brandName: variant.brandName,
    strength: variant.strength,
    packSize: variant.packSize,
    unitLabel: variant.unitLabel,
    ingredientName: variant.ingredient?.name ?? null,
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      location: branch.location,
      contactNumber: branch.contactNumber ?? publicContactFallback,
      status: availability.branches.find((item) => item.branchId === branch.id)?.status ?? "out-of-stock",
      pricePerPack: variant.branchPrices.find((price) => price.branchId === branch.id)?.pricePerPack.toNumber() ?? null,
    })),
  };
}