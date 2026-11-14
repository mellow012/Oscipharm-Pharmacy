import type { ImportPreview } from "@/features/inventory/lib/stock-import-service";
import type { ImportHistoryRun } from "@/features/inventory/components/ImportRunHistory";
import { ConfirmImportAction } from "@/features/inventory/components/ConfirmImportAction";
import {
  ImportStepSequence,
  type ImportStep,
} from "@/features/inventory/components/ImportStepSequence";
import { StockImportHistory } from "@/features/inventory/components/ImportRunHistory";
import { StockImportPreview } from "@/features/inventory/components/StockImportPreview";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

export type StockImportPageData = {
  branches: { id: string; name: string }[];
  branch: { id: string; name: string } | null;
  runs: ImportHistoryRun[];
  committingRun: { id: string; filename: string; counts: unknown } | null;
  salesRuns: ImportHistoryRun[];
  salesCommittingRun: { id: string; filename: string; counts: unknown } | null;
  actorRole: string;
};

export type StockPreviewState = { runId: string; filename: string; preview: ImportPreview };
export type ActiveStockRun = { id: string; filename: string; processed: number; total: number };

export function StockImportFlowView({
  data,
  branchId,
  file,
  setFile,
  onSelectFile,
  asOf,
  setAsOf,
  busy,
  error,
  message,
  currentStep,
  activeRun,
  progress,
  percent,
  preview,
  onPreview,
  onConfirm,
  onResume,
}: {
  data: StockImportPageData;
  branchId: string;
  file: File | null;
  setFile: (file: File | null) => void;
  onSelectFile: (file: File | null) => void;
  asOf: string;
  setAsOf: (value: string) => void;
  busy: boolean;
  error: string;
  message: string;
  currentStep: ImportStep;
  activeRun: ActiveStockRun | null;
  progress: { processed: number; total: number } | null;
  percent: number;
  preview: StockPreviewState | null;
  onPreview: () => void;
  onConfirm: () => void;
  onResume: (runId: string, file: File) => void;
}) {
  const branchCounts =
    data.committingRun &&
    typeof data.committingRun.counts === "object" &&
    data.committingRun.counts !== null
      ? (data.committingRun.counts as Record<string, unknown>)
      : {};

  return (
    <>
      <ImportStepSequence current={currentStep} />
      {data.committingRun ? (
        <section
          className="border border-outline-variant bg-surface-container-lowest p-space-md"
          aria-live="polite"
        >
          <h2 className="font-headline-sm text-headline-sm text-primary">
            An import needs to be resumed
          </h2>
          <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
            Select the same workbook, then resume {data.committingRun.filename}.
          </p>
          <div className="mt-space-md">
            <FormField
              id="stock-resume-file"
              label="Resume workbook"
              helperText="Use the same .xlsx workbook."
            >
              {(fieldProps) => (
                <FormInput
                  {...fieldProps}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              )}
            </FormField>
          </div>
          <div className="mt-space-md">
            <ConfirmImportAction
              label="Resume import"
              title="Resume stock import?"
              description={`Continue the in-progress import for ${data.committingRun.filename} using the selected workbook.`}
              disabled={busy || !file}
              onConfirm={() => file && onResume(data.committingRun!.id, file)}
            />
          </div>
          {Number(branchCounts.totalRows) > 0 ? (
            <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
              Previously processed {Number(branchCounts.completedRows ?? 0)} of{" "}
              {Number(branchCounts.totalRows)} rows.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="grid min-w-0 gap-space-md border border-outline-variant bg-surface-container-lowest p-space-md sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-end">
        <FormField id="stock-as-of" label="Stock as of (Africa/Blantyre)" required>
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              type="datetime-local"
              value={asOf}
              onChange={(event) => setAsOf(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          id="stock-file"
          label=".xlsx file"
          helperText="Please export the Stock report with Aronium's Excel button"
        >
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
            />
          )}
        </FormField>
        <button
          type="button"
          disabled={busy || !file || !branchId}
          onClick={onPreview}
          className="min-h-11 bg-primary px-space-md font-label-md text-label-md text-on-primary disabled:opacity-50"
        >
          Preview workbook
        </button>
      </section>

      {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
      {message ? (
        <NoticeBanner tone={message.includes("completed") ? "info" : "warning"}>
          {message}
        </NoticeBanner>
      ) : null}
      {activeRun && progress ? (
        <section className="space-y-space-sm" aria-live="polite">
          <div className="flex flex-wrap justify-between gap-space-sm font-body-sm text-body-sm">
            <span>Importing {activeRun.filename}</span>
            <span className="font-table-cell text-table-cell tabular-nums">{percent}%</span>
          </div>
          <progress
            value={progress.processed}
            max={Math.max(1, progress.total)}
            className="h-3 w-full accent-primary"
          />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {progress.processed} of {progress.total} rows processed
          </p>
          {!busy && file && !error ? (
            <ConfirmImportAction
              label="Continue import"
              title="Continue stock import?"
              description={`Continue the in-progress import for ${activeRun.filename}.`}
              onConfirm={() => onResume(activeRun.id, file)}
            />
          ) : null}
          {error && file ? (
            <ConfirmImportAction
              label="Continue import"
              title="Continue stock import?"
              description={`Retry the in-progress import for ${activeRun.filename}.`}
              disabled={busy}
              onConfirm={() => onResume(activeRun.id, file)}
            />
          ) : null}
        </section>
      ) : null}
      {preview ? (
        <StockImportPreview
          preview={preview.preview}
          filename={preview.filename}
          actorRole={data.actorRole}
          busy={busy}
          onConfirm={onConfirm}
        />
      ) : null}
      <StockImportHistory runs={data.runs} actorRole={data.actorRole} />
    </>
  );
}
