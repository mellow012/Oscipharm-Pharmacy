"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  commitSalesImportSlice,
  previewSalesImport,
} from "@/features/inventory/lib/import-actions";
import type { SalesImportPreview as SalesPreview } from "@/features/inventory/lib/sales-import-preview";
import {
  ImportStepSequence,
  type ImportStep,
} from "@/features/inventory/components/ImportStepSequence";
import {
  SalesImportHistory,
  type ImportHistoryRun,
} from "@/features/inventory/components/ImportRunHistory";
import { ConfirmImportAction } from "@/features/inventory/components/ConfirmImportAction";
import { SalesImportPreview } from "@/features/inventory/components/SalesImportPreview";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

type ResumeRun = { id: string; filename: string; counts: unknown } | null;
type ActiveRun = { id: string; filename: string; processed: number; total: number };
type PreviewState = { runId: string; filename: string; preview: SalesPreview };

export function SalesImportPanel({
  branchId,
  salesRuns,
  committingRun,
}: {
  branchId: string;
  salesRuns: ImportHistoryRun[];
  committingRun: ResumeRun;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPreview() {
    setError("");
    setMessage("");
    if (!file || !file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Please export the Sales Item list with Aronium's Excel button.");
      return;
    }
    const formData = new FormData();
    formData.set("branchId", branchId);
    formData.set("file", file);
    const result = await previewSalesImport(formData);
    if (!result.ok) return setError(result.error);
    if (result.status === "COMMITTING") {
      setActiveRun({
        id: result.runId,
        filename: result.filename,
        processed: result.processed,
        total: result.total,
      });
      setProgress({ processed: result.processed, total: result.total });
      setMessage("A sales import is already in progress. Continue it with this workbook.");
      return;
    }
    setPreview({ runId: result.runId, filename: result.filename, preview: result.preview });
  }

  async function runSlices(runId: string, selectedFile: File) {
    setBusy(true);
    setError("");
    setActiveRun((current) =>
      current?.id === runId
        ? current
        : {
            id: runId,
            filename: selectedFile.name,
            processed: progress.processed,
            total: progress.total,
          },
    );
    let done = false;
    while (!done) {
      const formData = new FormData();
      formData.set("runId", runId);
      formData.set("file", selectedFile);
      const result = await commitSalesImportSlice(formData);
      if (!result.ok) {
        setError(result.error);
        break;
      }
      done = result.done;
      setProgress({ processed: result.processed, total: result.total });
      setActiveRun({
        id: runId,
        filename: selectedFile.name,
        processed: result.processed,
        total: result.total,
      });
      if (done) {
        setMessage("Sales import completed.");
        setActiveRun(null);
        setPreview(null);
        router.refresh();
      }
    }
    setBusy(false);
  }

  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;
  const currentStep: ImportStep = message.includes("completed")
    ? "result"
    : activeRun
      ? "result"
      : preview
        ? "confirm"
        : file
          ? "preview"
          : "file";

  return (
    <div className="min-w-0 space-y-space-lg py-space-md">
      <ImportStepSequence current={currentStep} />
      {committingRun ? (
        <section className="border border-outline-variant bg-surface-container-lowest p-space-md">
          <h2 className="font-headline-sm text-headline-sm text-primary">
            A sales import needs to be resumed
          </h2>
          <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
            Choose the same Sales Item workbook to resume {committingRun.filename}.
          </p>
          <div className="mt-space-md">
            <FormField
              id="sales-resume-file"
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
              label="Resume sales import"
              title="Resume sales import?"
              description={`Continue the in-progress import for ${committingRun.filename} using the selected workbook.`}
              disabled={busy || !file}
              onConfirm={() => void runSlices(committingRun.id, file!)}
            />
          </div>
        </section>
      ) : null}

      <section className="grid min-w-0 gap-space-md border border-outline-variant bg-surface-container-lowest p-space-md sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <FormField
          id="sales-import-file"
          label=".xlsx file"
          helperText="Please export the Sales Item list with Aronium's Excel button."
        >
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setError("");
              }}
            />
          )}
        </FormField>
        <button
          type="button"
          disabled={busy || !file || !branchId}
          onClick={() => void loadPreview()}
          className="min-h-11 bg-primary px-space-md font-label-md text-label-md text-on-primary disabled:opacity-50"
        >
          Preview sales
        </button>
      </section>

      {error ? <NoticeBanner tone="danger">{error}</NoticeBanner> : null}
      {message ? (
        <NoticeBanner tone={message.includes("completed") ? "info" : "warning"}>
          {message}
        </NoticeBanner>
      ) : null}
      {activeRun ? (
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
            {progress.processed} of {progress.total} documents processed
          </p>
          {!busy && file ? (
            <ConfirmImportAction
              label="Continue import"
              title="Continue sales import?"
              description={`Continue the in-progress import for ${activeRun.filename}.`}
              onConfirm={() => void runSlices(activeRun.id, file)}
            />
          ) : null}
        </section>
      ) : null}
      {preview ? (
        <SalesImportPreview
          preview={preview.preview}
          filename={preview.filename}
          busy={busy}
          onConfirm={() => void runSlices(preview.runId, file!)}
        />
      ) : null}
      <SalesImportHistory runs={salesRuns} />
    </div>
  );
}
