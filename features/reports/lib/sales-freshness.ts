export const SALES_FRESHNESS_WARNING_MS = 24 * 60 * 60 * 1000;
export const SALES_FRESHNESS_CRITICAL_MS = 48 * 60 * 60 * 1000;

export type SalesFreshnessInput = {
  lastStockImportAt: Date | string | null;
  lastSalesImportAt: Date | string | null;
  latestSaleAt: Date | string | null;
};

export type SalesFreshness = SalesFreshnessInput & {
  level: "none" | "fresh" | "warning" | "critical";
};

export function calculateSalesFreshness(input: SalesFreshnessInput, now = new Date()): SalesFreshness {
  if (input.latestSaleAt === null) return { ...input, level: "none" };
  const latestSaleAt = new Date(input.latestSaleAt).getTime();
  if (!Number.isFinite(latestSaleAt)) return { ...input, level: "none" };
  const age = now.getTime() - latestSaleAt;
  return {
    ...input,
    level: age > SALES_FRESHNESS_CRITICAL_MS ? "critical" : age > SALES_FRESHNESS_WARNING_MS ? "warning" : "fresh",
  };
}
