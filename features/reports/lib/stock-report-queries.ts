import { Prisma } from "@prisma/client";

export function buildLowStockQuery(branchId?: string | null) {
    const branchScope = branchId ? Prisma.sql` AND bp."branchId" = ${branchId}` : Prisma.empty;
    return Prisma.sql`
        SELECT
          bp."branchId",
          b.name AS "branchName",
          COALESCE(ingredient.name, 'Uncategorized') AS "ingredientName",
          v."brandName",
          v."strength",
          COALESCE(SUM(CASE WHEN batch."quantityRemaining" > 0 AND (batch."expiryDateKnown" = false OR batch."expiryDate" >= ((NOW() AT TIME ZONE 'Africa/Blantyre')::date)) THEN batch."quantityRemaining" ELSE 0 END), 0)::int AS "availableUnits",
          bp."reorderThreshold"
        FROM "BranchPrice" bp
        JOIN "Branch" b ON b.id = bp."branchId"
        JOIN "Variant" v ON v.id = bp."variantId"
        LEFT JOIN "Ingredient" ingredient ON ingredient.id = v."ingredientId"
        LEFT JOIN "Batch" batch ON batch."variantId" = bp."variantId" AND batch."branchId" = bp."branchId"
        WHERE bp."reorderThreshold" IS NOT NULL
          ${branchScope}
        GROUP BY bp."branchId", b.name, COALESCE(ingredient.name, 'Uncategorized'), v."brandName", v."strength", bp."reorderThreshold"
        ORDER BY b.name ASC, COALESCE(ingredient.name, 'Uncategorized') ASC, v."brandName" ASC
    `;
}

export function buildExpiryQuery(branchId?: string | null) {
    const branchScope = branchId ? Prisma.sql` AND batch."branchId" = ${branchId}` : Prisma.empty;
    return Prisma.sql`
        SELECT
          b.name AS "branchName",
          COALESCE(ingredient.name, 'Uncategorized') AS "ingredientName",
          v."brandName",
          batch."batchNumber",
          batch."expiryDate",
          batch."quantityRemaining" AS "remainingUnits",
          CASE
            WHEN batch."expiryDateKnown" = false THEN 'Expiry not recorded'
            WHEN batch."expiryDate" < ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) THEN 'Expired'
            WHEN batch."expiryDate" <= ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) + INTERVAL '30 days' THEN 'Expiring soon'
            ELSE 'In date'
          END AS status
        FROM "Batch" batch
        JOIN "Branch" b ON b.id = batch."branchId"
        JOIN "Variant" v ON v.id = batch."variantId"
        LEFT JOIN "Ingredient" ingredient ON ingredient.id = v."ingredientId"
        WHERE batch."quantityRemaining" > 0
          AND batch."expiryDateKnown" = true
          AND (
            batch."expiryDate" < ((NOW() AT TIME ZONE 'Africa/Blantyre')::date) + INTERVAL '30 days'
            OR batch."expiryDate" < ((NOW() AT TIME ZONE 'Africa/Blantyre')::date)
          )
          ${branchScope}
        ORDER BY batch."expiryDate" ASC, b.name ASC
    `;
}