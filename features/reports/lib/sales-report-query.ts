import { Prisma } from "@prisma/client";

export function buildSalesReportQuery(input: { branchId?: string | null; from: Date; to: Date }) {
  const branchScope = input.branchId ? Prisma.sql` AND s."branchId" = ${input.branchId}` : Prisma.empty;
  return Prisma.sql`
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
    WHERE s."createdAt" >= ${input.from}
      AND s."createdAt" < ${input.to}
      AND s."voidedAt" IS NULL
      ${branchScope}
    GROUP BY ((s."createdAt" AT TIME ZONE 'Africa/Blantyre')::date), s."paymentMethod", COALESCE(ingredient.name || ' · ' || v."brandName", 'Unspecified product')
    ORDER BY day DESC, "paymentMethod" ASC, product ASC
  `;
}
