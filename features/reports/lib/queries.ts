import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { endOfMalawiDate, getMalawiDateKey, parseMalawiDate } from "@/lib/timezone";
import type { AuditRow, BranchOption, ExpiryRow, LowStockRow, ReportsData, SalesRow } from "@/features/reports/types";
import { buildExpiryQuery, buildLowStockQuery } from "@/features/reports/lib/stock-report-queries";
import { groupExpiryNotRecorded } from "@/features/reports/lib/expiry-watch";
import { filterLowStockRows } from "@/features/reports/lib/stock-availability";

function defaultRange() {
    const to = getMalawiDateKey(new Date());
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const from = getMalawiDateKey(fromDate);
    return { from, to };
}

function toDateRange(fromText?: string, toText?: string) {
    const safeRange = defaultRange();
    const from = fromText || safeRange.from;
    const to = toText || safeRange.to;
    return {
        from: parseMalawiDate(from),
        to: endOfMalawiDate(to),
        range: { from, to },
    };
}

function buildBranchScope(branchId?: string | null) {
    if (!branchId) return Prisma.empty;
    return Prisma.sql` AND s."branchId" = ${branchId}`;
}

function buildAuditScope(branchId?: string | null) {
    if (!branchId) return Prisma.empty;
    return Prisma.sql` AND al."branchId" = ${branchId}`;
}

export async function getReportBranches(): Promise<BranchOption[]> {
    return prisma.branch.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, location: true },
    });
}

export async function getReportsData({ branchId, from, to }: { branchId?: string | null; from?: string; to?: string }): Promise<ReportsData> {
    const range = toDateRange(from, to);

    const [branches, sales, membershipSales, lowStock, expiry, expiryNotRecordedRows, audit] = await Promise.all([
        getReportBranches(),
        prisma.$queryRaw<Array<SalesRow & { revenue: string; saleCount: bigint; lineCount: bigint }>>(Prisma.sql`
            SELECT
              ((s."createdAt" AT TIME ZONE 'Africa/Blantyre')::date)::text AS day,
              s."paymentMethod"::text AS "paymentMethod",
              COALESCE(ingredient.name || ' · ' || v."brandName", 'Unspecified product') AS product,
              SUM(si."subtotal")::text AS revenue,
              COUNT(DISTINCT s.id)::int AS "saleCount",
              COUNT(si.id)::int AS "lineCount"
            FROM "Sale" s
            LEFT JOIN "SaleItem" si ON si."saleId" = s.id
            LEFT JOIN "Variant" v ON v.id = si."variantId"
            LEFT JOIN "Ingredient" ingredient ON ingredient.id = v."ingredientId"
            WHERE s."createdAt" >= ${range.from}
              AND s."createdAt" < ${range.to}
              AND s."voidedAt" IS NULL
              ${buildBranchScope(branchId)}
            GROUP BY ((s."createdAt" AT TIME ZONE 'Africa/Blantyre')::date), s."paymentMethod", COALESCE(ingredient.name || ' · ' || v."brandName", 'Unspecified product')
            ORDER BY day DESC, "paymentMethod" ASC, product ASC
        `),
        prisma.$queryRaw<Array<{
            grossAmount: string;
            discountAmount: string;
            netAmount: string;
            memberSaleCount: number;
            chronicSaleCount: number;
            chronicDiscountAmount: string;
            generalSaleCount: number;
            generalDiscountAmount: string;
        }>>(Prisma.sql`
            SELECT
              COALESCE(SUM(s."subtotalAmount"), 0)::text AS "grossAmount",
              COALESCE(SUM(s."discountAmount"), 0)::text AS "discountAmount",
              COALESCE(SUM(s."totalAmount"), 0)::text AS "netAmount",
              COUNT(*) FILTER (WHERE s."membershipApplicationId" IS NOT NULL)::int AS "memberSaleCount",
              COUNT(*) FILTER (WHERE s."membershipDiscountPercent" = 20)::int AS "chronicSaleCount",
              COALESCE(SUM(s."discountAmount") FILTER (WHERE s."membershipDiscountPercent" = 20), 0)::text AS "chronicDiscountAmount",
              COUNT(*) FILTER (WHERE s."membershipDiscountPercent" = 15)::int AS "generalSaleCount",
              COALESCE(SUM(s."discountAmount") FILTER (WHERE s."membershipDiscountPercent" = 15), 0)::text AS "generalDiscountAmount"
            FROM "Sale" s
            WHERE s."createdAt" >= ${range.from}
              AND s."createdAt" < ${range.to}
              AND s."voidedAt" IS NULL
              ${buildBranchScope(branchId)}
        `),
        prisma.$queryRaw<Array<LowStockRow & { availableUnits: bigint }>>(buildLowStockQuery(branchId)),
        prisma.$queryRaw<Array<ExpiryRow & { expiryDate: Date }>>(buildExpiryQuery(branchId)),
        prisma.batch.findMany({
            where: { quantityRemaining: { gt: 0 }, expiryDateKnown: false, ...(branchId ? { branchId } : {}) },
            orderBy: [{ branch: { name: "asc" } }, { expiryDate: "asc" }],
            select: {
                id: true,
                branchId: true,
                batchNumber: true,
                quantityRemaining: true,
                branch: { select: { name: true } },
                variant: {
                    select: {
                        brandName: true,
                        ingredient: { select: { name: true } },
                    },
                },
            },
        }),
        prisma.$queryRaw<Array<AuditRow & { details: Prisma.JsonValue }>>(Prisma.sql`
            SELECT
              al."createdAt",
              al.action::text AS action,
              b.name AS "branchName",
              u.name AS "userName",
              al."saleId",
              al.details::text AS details
            FROM "AuditLog" al
            JOIN "Branch" b ON b.id = al."branchId"
            JOIN "User" u ON u.id = al."userId"
            WHERE al."createdAt" >= ${range.from}
              AND al."createdAt" < ${range.to}
              ${buildAuditScope(branchId)}
            ORDER BY al."createdAt" DESC
            LIMIT 200
        `),
    ]);

    return {
        branches,
        sales: sales.map((row) => ({
            day: row.day,
            paymentMethod: row.paymentMethod,
            product: row.product,
            revenue: row.revenue,
            saleCount: Number(row.saleCount),
            lineCount: Number(row.lineCount),
        })),
          membershipSales: membershipSales[0] ?? {
            grossAmount: "0",
            discountAmount: "0",
            netAmount: "0",
            memberSaleCount: 0,
            chronicSaleCount: 0,
            chronicDiscountAmount: "0",
            generalSaleCount: 0,
            generalDiscountAmount: "0",
          },
        lowStock: filterLowStockRows(lowStock.map((row) => ({
            branchId: row.branchId,
            branchName: row.branchName,
            ingredientName: row.ingredientName,
            brandName: row.brandName,
            strength: row.strength,
            availableUnits: Number(row.availableUnits),
            reorderThreshold: row.reorderThreshold,
        }))),
        expiry: expiry.map((row) => ({
            branchName: row.branchName,
            ingredientName: row.ingredientName,
            brandName: row.brandName,
            batchNumber: row.batchNumber,
            expiryDate: new Date(row.expiryDate).toISOString(),
            remainingUnits: Number(row.remainingUnits),
            status: row.status,
        })),
        expiryNotRecorded: groupExpiryNotRecorded(expiryNotRecordedRows.map((row) => ({
            batchId: row.id,
            branchId: row.branchId,
            branchName: row.branch.name,
            ingredientName: row.variant.ingredient?.name ?? "Uncategorized",
            brandName: row.variant.brandName,
            batchNumber: row.batchNumber,
            remainingUnits: row.quantityRemaining,
        }))),
        audit: audit.map((row) => ({
            createdAt: new Date(row.createdAt).toISOString(),
            action: row.action,
            branchName: row.branchName,
            userName: row.userName,
            saleId: row.saleId,
            details: typeof row.details === "string" ? row.details : JSON.stringify(row.details),
        })),
        range: { from: range.range.from, to: range.range.to },
    };
}
