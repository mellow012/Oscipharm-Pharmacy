import { prisma } from "@/lib/prisma";
import { aggregateUnallocatedUnits } from "@/features/inventory/lib/sales-shortfall";
import { buildInventoryBatchWhereClause } from "@/features/inventory/lib/inventory-batch-filter";
export { parseInventoryEmptyToggle } from "@/features/inventory/lib/inventory-batch-filter";

export async function getInventoryBranches() {
    return prisma.branch.findMany({
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, location: true },
    });
}

export async function getInventoryData(branchId: string, includeZeroBatches = false) {
    const [branch, batches, negativeBatches, variants, latestSalesImport] = await prisma.$transaction([
        prisma.branch.findUnique({
            where: { id: branchId },
            select: { id: true, name: true, location: true },
        }),
        prisma.batch.findMany({
            where: buildInventoryBatchWhereClause(branchId, includeZeroBatches),
            orderBy: { expiryDate: "asc" },
            select: {
                id: true,
                batchNumber: true,
                quantityRemaining: true,
                expiryDate: true,
                expiryDateKnown: true,
                variant: {
                    select: {
                        brandName: true,
                        strength: true,
                        packSize: true,
                        unitLabel: true,
                        ingredient: { select: { name: true } },
                    },
                },
            },
        }),
        prisma.batch.findMany({
            where: { branchId, quantityRemaining: { lt: 0 } },
            orderBy: { expiryDate: "asc" },
            select: {
                id: true,
                batchNumber: true,
                quantityRemaining: true,
                expiryDate: true,
                expiryDateKnown: true,
                variant: {
                    select: {
                        brandName: true,
                        strength: true,
                        packSize: true,
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
        prisma.importRun.findFirst({
            where: { branchId, kind: "SALES", status: "COMMITTED" },
            orderBy: [{ committedAt: "desc" }, { createdAt: "desc" }],
            select: { id: true },
        }),
    ]);

    const unallocatedItems = latestSalesImport
        ? await prisma.saleItem.findMany({
            where: {
                unallocatedUnits: { gt: 0 },
                sale: { is: { branchId, importRunId: latestSalesImport.id, stockAffected: true } },
            },
            select: {
                variantId: true,
                unallocatedUnits: true,
                variant: {
                    select: {
                        brandName: true,
                        strength: true,
                        ingredient: { select: { name: true } },
                    },
                },
            },
        })
        : [];
    const salesImportShortfalls = aggregateUnallocatedUnits(unallocatedItems.map((item) => ({
        variantId: item.variantId,
        productName: [item.variant.ingredient?.name, item.variant.brandName, item.variant.strength]
            .filter(Boolean)
            .join(" · "),
        unallocatedUnits: item.unallocatedUnits,
    })));

    return {
        branch,
        salesImportShortfalls,
        batches: batches.map((batch) => ({
            ...batch,
            variant: {
                ...batch.variant,
                ingredient: batch.variant.ingredient ?? { name: "Uncategorized" },
            },
        })),
        negativeBatches: negativeBatches.map((batch) => ({
            ...batch,
            variant: {
                ...batch.variant,
                ingredient: batch.variant.ingredient ?? { name: "Uncategorized" },
            },
        })),
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