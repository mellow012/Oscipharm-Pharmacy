import Link from "next/link";
import { formatMwk } from "@/lib/format";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import type { UnallocatedProduct } from "@/features/inventory/lib/sales-shortfall";
import {
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/features/shared/components/TableFrame";

export type ImportHistoryRun = {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  committedAt: string | null;
  asOf: string | null;
  counts: unknown;
  uploadedBy: string;
  shortfalls?: UnallocatedProduct[];
};

function countsOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function LastImportNotice({
  stockRuns,
  salesRuns,
}: {
  stockRuns: ImportHistoryRun[];
  salesRuns: ImportHistoryRun[];
}) {
  const stock = stockRuns.find((run) => run.status === "COMMITTED" && run.committedAt);
  const sales = salesRuns.find((run) => run.status === "COMMITTED" && run.committedAt);
  if (!stock && !sales) return null;
  const format = (value: string) =>
    new Date(value).toLocaleString("en-MW", {
      timeZone: "Africa/Blantyre",
      dateStyle: "medium",
      timeStyle: "short",
    });
  return (
    <NoticeBanner tone="info" title="Last committed imports">
      <div className="grid min-w-0 gap-space-xs sm:grid-cols-2">
        {stock?.committedAt ? (
          <p>
            <span className="font-label-md text-label-md">Stock: </span>
            {format(stock.committedAt)}
          </p>
        ) : null}
        {sales?.committedAt ? (
          <p>
            <span className="font-label-md text-label-md">Sales: </span>
            {format(sales.committedAt)}
          </p>
        ) : null}
      </div>
    </NoticeBanner>
  );
}

export function StockImportHistory({
  runs,
  actorRole,
}: {
  runs: ImportHistoryRun[];
  actorRole: string;
}) {
  return (
    <TableFrame
      ariaLabel="Stock import history"
      header={<h2 className="font-headline-md text-headline-md text-primary">Import history</h2>}
      tableClassName="min-w-[900px]"
    >
      <TableHead>
        <tr>
          <TableHeaderCell>Imported</TableHeaderCell>
          <TableHeaderCell>Stock as of</TableHeaderCell>
          <TableHeaderCell>File</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Counts</TableHeaderCell>
          <TableHeaderCell>Run by</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {runs.map((run) => {
          const counts = countsOf(run.counts);
          return (
            <TableRow key={run.id}>
              <TableCell nowrap>
                {new Date(run.committedAt ?? run.createdAt).toLocaleString("en-MW", {
                  timeZone: "Africa/Blantyre",
                })}
              </TableCell>
              <TableCell nowrap>
                {run.asOf
                  ? new Date(run.asOf).toLocaleString("en-MW", { timeZone: "Africa/Blantyre" })
                  : "—"}
              </TableCell>
              <TableCell className="min-w-44 text-on-surface">{run.filename}</TableCell>
              <TableCell>
                <StatusBadge
                  tone={
                    run.status === "COMMITTED"
                      ? "success"
                      : run.status === "COMMITTING"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {run.status}
                </StatusBadge>
              </TableCell>
              <TableCell className="min-w-64">
                {String(counts.committedRows ?? counts.totalRows ?? 0)} rows ·{" "}
                {String(counts.newProducts ?? 0)} new · {String(counts.existingProducts ?? 0)}{" "}
                existing · {String(counts.skippedRowCount ?? 0)} skipped
                {actorRole !== "POS"
                  ? ` · ${formatMwk(Number(counts.totals && typeof counts.totals === "object" ? ((counts.totals as Record<string, unknown>).value ?? 0) : 0))} value`
                  : ""}
              </TableCell>
              <TableCell nowrap>{run.uploadedBy}</TableCell>
            </TableRow>
          );
        })}
        {!runs.length ? (
          <TableRow>
            <TableCell colSpan={6} className="py-space-lg text-left">
              No stock imports for this branch.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </TableFrame>
  );
}

export function SalesImportHistory({ runs }: { runs: ImportHistoryRun[] }) {
  return (
    <TableFrame
      ariaLabel="Sales import history"
      header={
        <h2 className="font-headline-md text-headline-md text-primary">Sales import history</h2>
      }
      tableClassName="min-w-[900px]"
    >
      <TableHead>
        <tr>
          <TableHeaderCell>Imported</TableHeaderCell>
          <TableHeaderCell>File</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Counts</TableHeaderCell>
          <TableHeaderCell>Receipts</TableHeaderCell>
          <TableHeaderCell>Run by</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {runs.map((run) => {
          const counts = countsOf(run.counts);
          const committed = run.status === "COMMITTED";
          return (
            <TableRow key={run.id}>
              <TableCell nowrap>
                {new Date(run.committedAt ?? run.createdAt).toLocaleString("en-MW", {
                  timeZone: "Africa/Blantyre",
                })}
              </TableCell>
              <TableCell className="min-w-44 text-on-surface">{run.filename}</TableCell>
              <TableCell>
                <StatusBadge
                  tone={committed ? "success" : run.status === "COMMITTING" ? "warning" : "neutral"}
                >
                  {run.status}
                </StatusBadge>
              </TableCell>
              <TableCell className="min-w-72">
                {String(counts.importedDocuments ?? counts.totalDocuments ?? 0)} imported ·{" "}
                {String(counts.alreadyImportedDocuments ?? 0)} already imported ·{" "}
                {String(counts.historyOnlyDocuments ?? 0)} history only ·{" "}
                {String(counts.refundsWithoutOriginal ?? 0)} refunds without original
              </TableCell>
              <TableCell nowrap>
                {committed ? (
                  <Link
                    href={`/staff/sales?importRunId=${run.id}`}
                    className="relative z-10 text-primary underline underline-offset-2"
                  >
                    Browse
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell nowrap>{run.uploadedBy}</TableCell>
            </TableRow>
          );
        })}
        {!runs.length ? (
          <TableRow>
            <TableCell colSpan={6} className="py-space-lg text-left">
              No sales imports for this branch.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </TableFrame>
  );
}
