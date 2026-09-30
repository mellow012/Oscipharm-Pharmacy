import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { endOfMalawiDate, getMalawiDateKey, parseMalawiDate } from "@/lib/timezone";
import type { AuditRow, BranchOption, ExpiryRow, LowStockRow, ReportsData, SalesRow } from "@/features/reports/types";

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

function buildBranchScopeForStock(branchId?: string | null) {
    if (!branchId) return Prisma.empty;
    return Prisma.sql` AND bp."branchId" = ${branchId}`;
}

function buildBatchBranchScope(branchId?: string | null) {
    if (!branchId) return Prisma.empty;
    return Prisma.sql` AND batch."branchId" = ${branchId}`;
}

export async function getReportBranches(): Promise<BranchOption[]> {
    return prisma.branch.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, location: true },
    });
}

export async function getReportsData({ branchId, from, to }: { branchId?: string | null; from?: string; to?: string }): Promise<ReportsData> {
    const range = toDateRange(from, to);

    const [branches, sales, membershipSales, lowStock, expiry, audit] = await Promise.all([
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
        prisma.$queryRaw<Array<LowStockRow & { availableUnits: bigint }>>(Prisma.sql`
            SELECT
              bp."branchId",
              b.name AS "branchName",
              ingredient.name AS "ingredientName",
              v."brandName",
              v."strength",
              COALESCE(SUM(CASE WHEN batch."quantityRemaining" > 0 AND batch."expiryDate" >= ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) THEN batch."quantityRemaining" ELSE 0 END), 0)::int AS "availableUnits",
              bp."reorderThreshold"
            FROM "BranchPrice" bp
            JOIN "Branch" b ON b.id = bp."branchId"
            JOIN "Variant" v ON v.id = bp."variantId"
            JOIN "Ingredient" ingredient ON ingredient.id = v."ingredientId"
            LEFT JOIN "Batch" batch ON batch."variantId" = bp."variantId" AND batch."branchId" = bp."branchId"
            WHERE bp."reorderThreshold" IS NOT NULL
              ${buildBranchScopeForStock(branchId)}
            GROUP BY bp."branchId", b.name, ingredient.name, v."brandName", v."strength", bp."reorderThreshold"
            HAVING COALESCE(SUM(CASE WHEN batch."quantityRemaining" > 0 AND batch."expiryDate" >= ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) THEN batch."quantityRemaining" ELSE 0 END), 0) <= bp."reorderThreshold"
            ORDER BY b.name ASC, ingredient.name ASC, v."brandName" ASC
        `),
        prisma.$queryRaw<Array<ExpiryRow & { expiryDate: Date }>>(Prisma.sql`
            SELECT
              b.name AS "branchName",
              ingredient.name AS "ingredientName",
              v."brandName",
              batch."batchNumber",
              batch."expiryDate",
              batch."quantityRemaining" AS "remainingUnits",
              CASE
                WHEN batch."expiryDate" < ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) THEN 'Expired'
                WHEN batch."expiryDate" <= ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) + INTERVAL '30 days' THEN 'Expiring soon'
                ELSE 'In date'
              END AS status
            FROM "Batch" batch
            JOIN "Branch" b ON b.id = batch."branchId"
            JOIN "Variant" v ON v.id = batch."variantId"
            JOIN "Ingredient" ingredient ON ingredient.id = v."ingredientId"
            WHERE batch."quantityRemaining" > 0
              AND (
                batch."expiryDate" < ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) + INTERVAL '30 days'
                OR batch."expiryDate" < ((NOW() AT TIME ZONE 'Africa/Blantyre')::date)
              )
              ${buildBatchBranchScope(branchId)}
            ORDER BY batch."expiryDate" ASC, b.name ASC
        `),
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
        lowStock: lowStock.map((row) => ({
            branchId: row.branchId,
            branchName: row.branchName,
            ingredientName: row.ingredientName,
            brandName: row.brandName,
            strength: row.strength,
            availableUnits: Number(row.availableUnits),
            reorderThreshold: row.reorderThreshold,
        })),
        expiry: expiry.map((row) => ({
            branchName: row.branchName,
            ingredientName: row.ingredientName,
            brandName: row.brandName,
            batchNumber: row.batchNumber,
            expiryDate: new Date(row.expiryDate).toISOString(),
            remainingUnits: Number(row.remainingUnits),
            status: row.status,
        })),
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
