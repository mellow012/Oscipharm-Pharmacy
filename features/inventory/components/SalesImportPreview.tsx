import type { SalesImportPreview as SalesPreview } from "@/features/inventory/lib/sales-import-preview";
import { ImportIssueTable } from "@/features/inventory/components/ImportIssueTable";
import { ImportMatchSummary } from "@/features/inventory/components/ImportMatchSummary";
import { SalesImportShortfalls } from "@/features/inventory/components/SalesImportShortfalls";
import type { UnallocatedProduct } from "@/features/inventory/lib/sales-shortfall";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { StatCard } from "@/features/shared/components/StatCard";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import {
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/features/shared/components/TableFrame";

export function SalesImportPreview({
  preview,
  filename,
  branchId,
  busy,
  showOpeningStockInfo = true,
  resultShortfalls = [],
  result = false,
  onConfirm,
}: {
  preview: SalesPreview;
  filename: string;
  branchId: string;
  busy: boolean;
  showOpeningStockInfo?: boolean;
  resultShortfalls?: UnallocatedProduct[];
  result?: boolean;
  onConfirm: () => void;
}) {
  return (
    <section className="min-w-0 space-y-space-lg">
      <header className="flex min-w-0 flex-col gap-space-md border-b border-outline-variant pb-space-md sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-eyebrow text-eyebrow uppercase text-secondary">
            Sales preview · {preview.dateRange.from ?? "No dates"} to{" "}
            {preview.dateRange.to ?? "No dates"}
          </p>
          <h2 className="mt-space-xs break-words font-headline-md text-headline-md text-primary">
            {filename}
          </h2>
        </div>
        {result ? (
          <StatCard label="Result" value="Completed" tone="success" />
        ) : (
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={busy || preview.counts.newDocuments === 0}
                className="min-h-11 shrink-0 bg-primary px-space-md font-label-md text-label-md text-on-primary disabled:opacity-50"
              >
                Confirm sales import
              </button>
            }
            title="Confirm sales import?"
            description={`Import ${preview.counts.newDocuments} new documents from ${filename}. Already-imported documents will be skipped.`}
            confirmLabel="Confirm sales import"
            onConfirm={onConfirm}
          />
        )}
      </header>

      {showOpeningStockInfo && preview.warning ? (
        <NoticeBanner tone="warning">{preview.warning}</NoticeBanner>
      ) : null}
      {result ? <SalesImportShortfalls products={resultShortfalls} /> : null}
      <section
        aria-label="Sales import preview counts"
        className={`grid min-w-0 grid-cols-2 gap-px border border-outline-variant bg-outline-variant ${showOpeningStockInfo ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
      >
        <StatCard label="New documents" value={preview.counts.newDocuments} />
        <StatCard label="Already imported" value={preview.counts.alreadyImportedDocuments} />
        {showOpeningStockInfo ? (
          <StatCard label="Before stock as-of" value={preview.counts.historyOnlyDocuments} />
        ) : null}
        <StatCard
          label="Refund original found / missing"
          value={`${preview.counts.refundsWithOriginal} / ${preview.counts.refundsWithoutOriginal}`}
        />
      </section>
      <section
        aria-label="Sales import totals"
        className="grid min-w-0 grid-cols-1 gap-space-sm sm:grid-cols-3"
      >
        <StatCard label="Sales" value={money(preview.totals.sales)} tone="success" />
        <StatCard label="Refunds" value={money(preview.totals.refunds)} tone="danger" />
        <StatCard label="Net" value={money(preview.totals.net)} />
      </section>

      <div className="grid min-w-0 gap-space-lg lg:grid-cols-2">
        <div className="min-w-0 space-y-space-md">
          <ImportMatchSummary count={preview.unmatchedRows.length} branchId={branchId} />
          <ImportIssueTable
            ariaLabel="Skipped sales import rows"
            title="Skipped rows"
            rows={preview.skipped.map((row) => ({ ...row, code: null }))}
          />
          <ImportIssueTable
            ariaLabel="Unmatched sales import rows"
            title="Unmatched rows"
            rows={preview.unmatchedRows}
          />
        </div>
        <TableFrame
          ariaLabel="Flagged sales import lines"
          header={<h3 className="font-headline-sm text-headline-sm text-primary">Flagged lines</h3>}
          tableClassName="min-w-[620px]"
        >
          <TableHead>
            <tr>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Document</TableHeaderCell>
              <TableHeaderCell>Code</TableHeaderCell>
              <TableHeaderCell>Flags</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {preview.flaggedRows.map((row) => (
              <TableRow key={row.lineKey}>
                <TableCell nowrap>{row.businessDay}</TableCell>
                <TableCell nowrap className="font-table-cell text-table-cell">
                  {row.documentNumber}
                </TableCell>
                <TableCell nowrap>{row.code}</TableCell>
                <TableCell className="min-w-56">{row.flags.join("; ")}</TableCell>
              </TableRow>
            ))}
            {!preview.flaggedRows.length ? (
              <TableRow>
                <TableCell colSpan={4}>No flagged lines.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </TableFrame>
      </div>

      <TableFrame
        ariaLabel="Products to create from sales import"
        header={<h3 className="font-headline-sm text-headline-sm text-primary">Products to create</h3>}
        tableClassName="min-w-[520px]"
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Code</TableHeaderCell>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>UOM</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {preview.newProducts.map((product) => (
            <TableRow key={product.code}>
              <TableCell nowrap className="font-table-cell text-table-cell tabular-nums">
                {product.code}
              </TableCell>
              <TableCell>{product.product}</TableCell>
              <TableCell nowrap>{product.uom}</TableCell>
            </TableRow>
          ))}
          {!preview.newProducts.length ? (
            <TableRow>
              <TableCell colSpan={3}>All product codes are already linked.</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </TableFrame>

      <TableFrame
        ariaLabel="Sales documents in import preview"
        header={<h3 className="font-headline-sm text-headline-sm text-primary">Documents</h3>}
        tableClassName="min-w-[800px]"
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Document</TableHeaderCell>
            <TableHeaderCell>Original</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell align="right">Total</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {preview.documents.map((document) => (
            <TableRow key={`${document.documentType}-${document.documentNumber}`}>
              <TableCell nowrap>{document.businessDay}</TableCell>
              <TableCell>
                <StatusBadge tone={document.documentType === "Refund" ? "danger" : "success"}>
                  {document.documentType}
                </StatusBadge>
              </TableCell>
              <TableCell nowrap className="font-table-cell text-table-cell tabular-nums">
                {document.documentNumber}
              </TableCell>
              <TableCell nowrap>
                {document.refNumber ? (document.originalFound ? "Found" : "Not found") : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge
                  tone={
                    document.importStatus === "ALREADY_IMPORTED"
                      ? "neutral"
                      : document.historyOnly
                        ? "warning"
                        : "success"
                  }
                >
                  {document.importStatus === "ALREADY_IMPORTED"
                    ? "Already imported"
                    : document.historyOnly
                      ? "History only"
                      : "New"}
                </StatusBadge>
              </TableCell>
              <TableCell numeric nowrap className="text-on-surface">
                {money(document.totalAmount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </section>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 2,
  }).format(value);
}
