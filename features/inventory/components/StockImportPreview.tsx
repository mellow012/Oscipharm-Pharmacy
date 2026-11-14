import type { ImportPreview } from "@/features/inventory/lib/stock-import-service";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
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

export function StockImportPreview({
  preview,
  filename,
  actorRole,
  busy,
  onConfirm,
}: {
  preview: ImportPreview;
  filename: string;
  actorRole: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <section className="min-w-0 space-y-space-lg">
      <header className="flex min-w-0 flex-col gap-space-md border-b border-outline-variant pb-space-md sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-eyebrow text-eyebrow uppercase text-secondary">
            Preview · Layout {preview.layout}
          </p>
          <h2 className="mt-space-xs break-words font-headline-md text-headline-md text-primary">
            {filename}
          </h2>
        </div>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={busy}
              className="min-h-11 shrink-0 bg-primary px-space-md font-label-md text-label-md text-on-primary disabled:opacity-50"
            >
              Confirm import
            </button>
          }
          title="Confirm stock import?"
          description={`Commit ${preview.counts.totalRows} accepted rows from ${filename} into this branch.`}
          confirmLabel="Confirm import"
          onConfirm={onConfirm}
        />
      </header>

      <section
        aria-label="Stock import preview totals"
        className="grid min-w-0 grid-cols-2 gap-px border border-outline-variant bg-outline-variant sm:grid-cols-4"
      >
        <StatCard label="New products" value={preview.counts.newProducts} />
        <StatCard label="Existing products" value={preview.counts.existingProducts} />
        <StatCard
          label="Skipped rows"
          value={preview.counts.skippedRowCount}
          tone={preview.counts.skippedRowCount ? "warning" : "neutral"}
        />
        <StatCard
          label="Flagged rows"
          value={preview.counts.flaggedRowCount}
          tone={preview.counts.flaggedRowCount ? "warning" : "neutral"}
        />
      </section>
      <section className="grid min-w-0 grid-cols-1 gap-space-sm sm:grid-cols-3">
        <StatCard label="Quantity" value={`${preview.counts.totals.quantity} packs`} />
        {actorRole !== "POS" ? (
          <>
            <StatCard label="Cost" value={money(preview.counts.totals.cost)} />
            <StatCard label="Value" value={money(preview.counts.totals.value)} />
          </>
        ) : null}
      </section>

      <div className="grid min-w-0 gap-space-lg lg:grid-cols-2">
        <TableFrame
          ariaLabel="Skipped stock rows"
          header={<h3 className="font-headline-sm text-headline-sm text-primary">Skipped rows</h3>}
          tableClassName="min-w-[420px]"
        >
          <TableHead>
            <tr>
              <TableHeaderCell align="right">Row</TableHeaderCell>
              <TableHeaderCell>Code</TableHeaderCell>
              <TableHeaderCell>Reason</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {preview.skipped.map((row, index) => (
              <TableRow key={`${row.rowNumber}-${row.reason}-${index}`}>
                <TableCell numeric nowrap>
                  {row.rowNumber}
                </TableCell>
                <TableCell nowrap>{row.code || "—"}</TableCell>
                <TableCell className="min-w-52">{row.reason}</TableCell>
              </TableRow>
            ))}
            {!preview.skipped.length ? (
              <TableRow>
                <TableCell colSpan={3}>No skipped rows.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </TableFrame>

        <TableFrame
          ariaLabel="Flagged stock rows"
          header={<h3 className="font-headline-sm text-headline-sm text-primary">Flagged rows</h3>}
          tableClassName="min-w-[520px]"
        >
          <TableHead>
            <tr>
              <TableHeaderCell align="right">Row</TableHeaderCell>
              <TableHeaderCell>Code</TableHeaderCell>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Warnings</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {preview.flagged.map((row) => (
              <TableRow key={row.rowNumber}>
                <TableCell numeric nowrap>
                  {row.rowNumber}
                </TableCell>
                <TableCell nowrap>{row.code}</TableCell>
                <TableCell className="min-w-36">{row.name}</TableCell>
                <TableCell className="min-w-56">{row.warnings.join("; ")}</TableCell>
              </TableRow>
            ))}
            {!preview.flagged.length ? (
              <TableRow>
                <TableCell colSpan={4}>No value warnings.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </TableFrame>
      </div>

      <TableFrame
        ariaLabel="Stock products in preview"
        header={<h3 className="font-headline-sm text-headline-sm text-primary">Products</h3>}
        tableClassName="min-w-[680px]"
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Code</TableHeaderCell>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell align="right">Quantity</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {preview.rows.map((row) => (
            <TableRow key={`${row.rowNumber}-${row.code}`}>
              <TableCell
                nowrap
                className="font-table-cell text-table-cell tabular-nums text-on-surface"
              >
                {row.code}
              </TableCell>
              <TableCell className="min-w-64 text-on-surface">{row.name}</TableCell>
              <TableCell numeric nowrap className="text-on-surface">
                {row.quantity} {row.uom}
              </TableCell>
              <TableCell>
                <StatusBadge tone={row.productStatus === "NEW" ? "success" : "neutral"}>
                  {row.productStatus === "NEW" ? "New product" : "Existing product"}
                </StatusBadge>
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
