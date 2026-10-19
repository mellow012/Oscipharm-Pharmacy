import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { endOfMalawiDate, parseMalawiDate } from "@/lib/timezone";
import { calculateSalesFreshness } from "./sales-freshness";
import type { SalesListFilters } from "./sales-filter";

export const SALES_PAGE_SIZE = 25;

type AccessScope = { role: Role; branchId: string | null };

function branchFilter(access: AccessScope) {
  if (access.role === "ADMIN") return {};
  if (!access.branchId) return { branchId: "__no_branch_access__" };
  return { branchId: access.branchId };
}

function filteredWhere(access: AccessScope, filters: SalesListFilters): Prisma.SaleWhereInput {
  const base = branchFilter(access);
  const search = filters.search ? {
    OR: [
      { sourceDocumentNumber: { contains: filters.search, mode: "insensitive" as const } },
      { items: { some: { variant: { OR: [
        { brandName: { contains: filters.search, mode: "insensitive" as const } },
        { ingredient: { name: { contains: filters.search, mode: "insensitive" as const } } },
      ] } } } },
    ],
  } : {};
  const type = filters.type === "all" ? {} : { isRefund: filters.type === "refund" };
  return {
    ...base,
    ...(filters.importRunId ? { importRunId: filters.importRunId } : {}),
    ...type,
    voidedAt: null,
    createdAt: { gte: parseMalawiDate(filters.from), lt: endOfMalawiDate(filters.to) },
    ...search,
  };
}

export async function getSalesListData(access: AccessScope, filters: SalesListFilters) {
  const where = filteredWhere(access, filters);
  const [totalCount, sales, rangeTotals, freshness] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (filters.page - 1) * SALES_PAGE_SIZE,
      take: SALES_PAGE_SIZE,
      select: {
        id: true,
        sourceDocumentNumber: true,
        isRefund: true,
        createdAt: true,
        totalAmount: true,
        branch: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.sale.aggregate({
      where: filteredWhere(access, { ...filters, type: "all", page: 1 }),
      _sum: { totalAmount: true },
    }),
    getSalesFreshness(access),
  ]);
  const [salesTotal, refundsTotal] = await Promise.all([
    prisma.sale.aggregate({ where: { ...filteredWhere(access, { ...filters, type: "sale", page: 1 }), isRefund: false }, _sum: { totalAmount: true } }),
    prisma.sale.aggregate({ where: { ...filteredWhere(access, { ...filters, type: "refund", page: 1 }), isRefund: true }, _sum: { totalAmount: true } }),
  ]);
  return {
    sales: sales.map((sale) => ({ ...sale, totalAmount: sale.totalAmount.toString() })),
    totalCount,
    pageCount: Math.max(1, Math.ceil(totalCount / SALES_PAGE_SIZE)),
    totals: {
      sales: salesTotal._sum.totalAmount?.toString() ?? "0",
      refunds: refundsTotal._sum.totalAmount?.toString() ?? "0",
      net: rangeTotals._sum.totalAmount?.toString() ?? "0",
    },
    freshness,
  };
}

export async function getSaleDetail(access: AccessScope, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, ...branchFilter(access), voidedAt: null },
    select: {
      id: true,
      sourceDocumentNumber: true,
      refDocumentNumber: true,
      isRefund: true,
      stockAffected: true,
      paymentMethod: true,
      createdAt: true,
      subtotalAmount: true,
      totalAmount: true,
      branchId: true,
      branch: { select: { name: true } },
      importRun: { select: { id: true, filename: true } },
      items: {
        select: {
          id: true,
          quantityUnits: true,
          unallocatedUnits: true,
          unitPriceAtSale: true,
          subtotal: true,
          variant: { select: { brandName: true, strength: true, unitLabel: true, ingredient: { select: { name: true } } } },
          batch: { select: { batchNumber: true, expiryDate: true, expiryDateKnown: true } },
        },
      },
    },
  });
  if (!sale) return null;
  const original = sale.isRefund && sale.refDocumentNumber
    ? await prisma.sale.findFirst({ where: { ...branchFilter(access), sourceDocumentNumber: sale.refDocumentNumber, isRefund: false }, select: { id: true, sourceDocumentNumber: true } })
    : null;
  return {
    ...sale,
    totalAmount: sale.totalAmount.toString(),
    original,
    items: sale.items.map((item) => ({ ...item, unitPriceAtSale: item.unitPriceAtSale.toString(), subtotal: item.subtotal.toString() })),
  };
}

export async function getImportRunSaleCount(access: AccessScope, importRunId: string) {
  return prisma.sale.count({ where: { importRunId, ...branchFilter(access), voidedAt: null } });
}

export async function getSalesFreshness(access: AccessScope) {
  const scope = branchFilter(access);
  const [stockImport, salesImport, latestSale] = await Promise.all([
    prisma.importRun.findFirst({ where: { ...scope, kind: "STOCK", status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { committedAt: true } }),
    prisma.importRun.findFirst({ where: { ...scope, kind: "SALES", status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { committedAt: true } }),
    prisma.sale.findFirst({ where: { ...scope, voidedAt: null }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  return calculateSalesFreshness({
    lastStockImportAt: stockImport?.committedAt ?? null,
    lastSalesImportAt: salesImport?.committedAt ?? null,
    latestSaleAt: latestSale?.createdAt ?? null,
  });
}
