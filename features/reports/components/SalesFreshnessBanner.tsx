import type { SalesFreshness } from "@/features/reports/lib/sales-freshness";

function formatTimestamp(value: Date | string | null) {
  return value ? new Intl.DateTimeFormat("en-MW", { timeZone: "Africa/Blantyre", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
}

export function SalesFreshnessBanner({ freshness }: { freshness: SalesFreshness }) {
  const colors = freshness.level === "critical"
    ? "border-danger bg-danger-bg text-danger"
    : freshness.level === "warning"
      ? "border-warn bg-warn-bg/50 text-ink"
      : "border-border bg-surface text-ink";
  return <section aria-label="Data freshness" className={`border-l-4 px-4 py-3 ${colors}`}>
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-sm font-semibold">{freshness.level === "none" ? "No imports yet" : "Data freshness"}</h2>
      {freshness.level === "warning" ? <span className="text-xs">Import data is over 24 hours old</span> : null}
      {freshness.level === "critical" ? <span className="text-xs">Import data is over 48 hours old</span> : null}
    </div>
    <dl className="mt-2 grid gap-x-5 gap-y-1 text-xs sm:grid-cols-3">
      <div><dt className="inline text-muted">Last stock import: </dt><dd className="inline">{formatTimestamp(freshness.lastStockImportAt)}</dd></div>
      <div><dt className="inline text-muted">Last sales import: </dt><dd className="inline">{formatTimestamp(freshness.lastSalesImportAt)}</dd></div>
      <div><dt className="inline text-muted">Latest sale: </dt><dd className="inline">{formatTimestamp(freshness.latestSaleAt)}</dd></div>
    </dl>
  </section>;
}
