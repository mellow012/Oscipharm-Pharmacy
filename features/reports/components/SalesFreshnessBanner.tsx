import type { SalesFreshness } from "@/features/reports/lib/sales-freshness";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

function formatTimestamp(value: Date | string | null) {
  return value
    ? new Intl.DateTimeFormat("en-MW", {
        timeZone: "Africa/Blantyre",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not recorded";
}

export function SalesFreshnessBanner({ freshness }: { freshness: SalesFreshness }) {
  const tone =
    freshness.level === "critical" ? "danger" : freshness.level === "warning" ? "warning" : "info";
  const title = freshness.level === "none" ? "No imports yet" : "Data freshness";
  return (
    <NoticeBanner tone={tone} title={title} className="border-x-0">
      <>
        {freshness.level === "warning" ? <p>Import data is over 24 hours old</p> : null}
        {freshness.level === "critical" ? <p>Import data is over 48 hours old</p> : null}
        <dl className="mt-space-sm grid gap-x-space-lg gap-y-space-xs text-body-sm sm:grid-cols-3">
          <div>
            <dt className="inline text-on-surface-variant">Last stock import: </dt>
            <dd className="inline">{formatTimestamp(freshness.lastStockImportAt)}</dd>
          </div>
          <div>
            <dt className="inline text-on-surface-variant">Last sales import: </dt>
            <dd className="inline">{formatTimestamp(freshness.lastSalesImportAt)}</dd>
          </div>
          <div>
            <dt className="inline text-on-surface-variant">Latest sale: </dt>
            <dd className="inline">{formatTimestamp(freshness.latestSaleAt)}</dd>
          </div>
        </dl>
      </>
    </NoticeBanner>
  );
}
