"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { commitStockImportSlice, previewStockImport } from "@/features/inventory/lib/import-actions";
import { SalesImportPanel } from "@/features/inventory/components/SalesImportPanel";
import type { ImportPreview } from "@/features/inventory/lib/stock-import-service";

const uploadMessage = "Please export the Stock report with Aronium's Excel button";
type HistoryRun = {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  committedAt: string | null;
  asOf: string | null;
  counts: unknown;
  uploadedBy: string;
};
type ResumeRun = { id: string; filename: string; counts: unknown } | null;
type PageData = {
  branches: { id: string; name: string }[];
  branch: { id: string; name: string } | null;
  runs: HistoryRun[];
  committingRun: ResumeRun;
  salesRuns: HistoryRun[];
  salesCommittingRun: ResumeRun;
  actorRole: string;
};
type PreviewState = { runId: string; filename: string; preview: ImportPreview };

function malawiLocalNowValue() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Blantyre", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-MW", { style: "currency", currency: "MWK", maximumFractionDigits: 2 }).format(value);
}

function countsOf(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export function StockImportWorkspace({ data, requestedBranchId }: { data: PageData; requestedBranchId?: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<"STOCK" | "SALES">("STOCK");
  const [asOf, setAsOf] = useState(malawiLocalNowValue);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [activeRun, setActiveRun] = useState<{ id: string; filename: string; processed: number; total: number } | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const branchId = data.branch?.id ?? "";
  const branchCounts = data.committingRun ? countsOf(data.committingRun.counts) : {};

  async function requestPreview(selectedFile = file) {
    setError("");
    setMessage("");
    setPreview(null);
    if (!selectedFile) return setError(uploadMessage);
    if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) return setError(uploadMessage);

    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("branchId", branchId);
    formData.set("asOf", asOf);
    const result = await previewStockImport(formData);
    if (!result.ok) return setError(result.error);
    if (result.status === "COMMITTING") {
      setActiveRun({ id: result.runId, filename: result.filename, processed: result.processed, total: result.total });
      setProgress({ processed: result.processed, total: result.total });
      setMessage("This upload has a commit in progress. Continue it with the selected workbook.");
      return;
    }
    setPreview({ runId: result.runId, filename: result.filename, preview: result.preview });
  }

  async function confirmImport() {
    if (!file || !preview) return;
    setActiveRun({ id: preview.runId, filename: preview.filename, processed: 0, total: preview.preview.rows.length });
    setProgress({ processed: 0, total: preview.preview.rows.length });
    setBusy(true);
    setError("");
    let done = false;
    while (!done) {
      const formData = new FormData();
      formData.set("runId", preview.runId);
      formData.set("file", file);
      const result = await commitStockImportSlice(formData);
      if (!result.ok) {
        setError(result.error);
        break;
      }
      done = result.done;
      setProgress({ processed: result.processed, total: result.total });
      setActiveRun({ id: preview.runId, filename: preview.filename, processed: result.processed, total: result.total });
      if (done) {
        setMessage("Stock import completed.");
        setPreview(null);
        setActiveRun(null);
        router.refresh();
      }
    }
    setBusy(false);
  }

  async function continueResume(runId: string, selectedFile: File) {
    setBusy(true);
    setError("");
    let done = false;
    while (!done) {
      const formData = new FormData();
      formData.set("runId", runId);
      formData.set("file", selectedFile);
      const result = await commitStockImportSlice(formData);
      if (!result.ok) {
        setError(result.error);
        break;
      }
      done = result.done;
      setProgress({ processed: result.processed, total: result.total });
      if (done) {
        setMessage("Stock import completed.");
        setActiveRun(null);
        router.refresh();
      }
    }
    setBusy(false);
  }

  const percent = progress && progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;
  const previewCounts = preview?.preview.counts;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
      <StaffHeader />
      <header className="border-b border-border py-8">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Inventory workspace</p>
        <h1 className="mt-2 text-4xl text-ink">Stock import</h1>
        {data.branch ? <p className="mt-2 text-muted">{data.branch.name}</p> : null}
      </header>

      <nav aria-label="Import type" className="mt-5 flex border-b border-border">
        <button type="button" onClick={() => setTab("STOCK")} aria-pressed={tab === "STOCK"} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === "STOCK" ? "border-primary text-primary" : "border-transparent text-muted"}`}>Stock</button>
        <button type="button" onClick={() => setTab("SALES")} aria-pressed={tab === "SALES"} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === "SALES" ? "border-primary text-primary" : "border-transparent text-muted"}`}>Sales</button>
      </nav>

      {data.actorRole === "ADMIN" ? (
        <label className="mt-6 block max-w-sm text-sm text-muted">Branch
          <select value={branchId} onChange={(event) => router.push(`/staff/import?branchId=${event.target.value}`)} className="mt-2 w-full border border-border bg-white px-3 py-2 text-ink">
            {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
      ) : null}

      {tab === "STOCK" && data.committingRun ? (
        <section className="mt-6 border-l-4 border-warn bg-warn-bg/40 p-4" aria-live="polite">
          <h2 className="font-semibold text-ink">An import needs to be resumed</h2>
          <p className="mt-1 text-sm text-muted">Select the same workbook, then resume {data.committingRun.filename}.</p>
          <label className="mt-3 block text-sm text-muted">Resume workbook
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
          </label>
          <button type="button" disabled={busy || !file} onClick={() => void continueResume(data.committingRun!.id, file!)} className="mt-3 bg-primary px-4 py-2 font-medium text-primary-fg disabled:opacity-50">Resume import</button>
          {Number(branchCounts.totalRows) > 0 ? <p className="mt-2 text-xs text-muted">Previously processed {Number(branchCounts.completedRows ?? 0)} of {Number(branchCounts.totalRows)} rows.</p> : null}
        </section>
      ) : null}

      {tab === "STOCK" ? <>
      <section className="mt-8 border-y border-border py-6">
        <h2 className="text-2xl text-ink">Upload Stock workbook</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm text-muted">Stock as of (Africa/Blantyre)
            <input type="datetime-local" required value={asOf} onChange={(event) => setAsOf(event.target.value)} className="mt-2 block w-full border border-border bg-white p-2 text-ink" />
          </label>
          <label className="block flex-1 text-sm text-muted">.xlsx file
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError(""); }} className="mt-2 block w-full border border-border bg-white p-2 text-ink" />
          </label>
          <button type="button" disabled={busy || !file || !branchId} onClick={() => void requestPreview()} className="bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50">Preview workbook</button>
        </div>
      </section>

      {error ? <p role="alert" className="mt-5 border-l-4 border-danger bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p> : null}
      {message ? <p role="status" className="mt-5 border-l-4 border-primary bg-chip px-4 py-3 text-sm text-primary">{message}</p> : null}

      {activeRun && progress ? (
        <section className="mt-6" aria-live="polite">
          <div className="mb-2 flex justify-between text-sm"><span className="text-ink">Importing {activeRun.filename}</span><span className="font-mono text-muted">{percent}%</span></div>
          <progress value={progress.processed} max={Math.max(1, progress.total)} className="h-3 w-full accent-primary" />
          <p className="mt-1 text-xs text-muted">{progress.processed} of {progress.total} rows processed</p>
          {!busy && file && !error ? <button type="button" onClick={() => void continueResume(activeRun.id, file)} className="mt-3 border border-primary px-4 py-2 text-sm font-medium text-primary">Continue import</button> : null}
          {error && file ? <button type="button" disabled={busy} onClick={() => void continueResume(activeRun.id, file)} className="mt-3 border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50">Continue import</button> : null}
        </section>
      ) : null}

      {preview && previewCounts ? (
        <section className="mt-8 space-y-8">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div><p className="font-mono text-xs uppercase text-warn">Preview · Layout {preview.preview.layout}</p><h2 className="mt-1 text-2xl text-ink">{preview.filename}</h2></div>
            <button type="button" onClick={() => void confirmImport()} disabled={busy} className="bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50">Confirm import</button>
          </header>
          <div className="grid grid-cols-2 gap-4 border-y border-border sm:grid-cols-4">
            <Metric label="New products" value={previewCounts.newProducts} />
            <Metric label="Existing products" value={previewCounts.existingProducts} />
            <Metric label="Skipped rows" value={previewCounts.skippedRowCount} />
            <Metric label="Flagged rows" value={previewCounts.flaggedRowCount} />
          </div>
          <div className="grid gap-4 border-b border-border pb-6 sm:grid-cols-3">
            <Metric label="Quantity" value={`${previewCounts.totals.quantity} packs`} />
            <Metric label="Cost" value={money(previewCounts.totals.cost)} />
            <Metric label="Value" value={money(previewCounts.totals.value)} />
          </div>
          <RowsTable preview={preview.preview} />
        </section>
      ) : null}

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-2xl text-ink">Import history</h2>
        <div className="mt-4 overflow-x-auto border-y border-border">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="px-3 py-3 font-normal">Imported</th><th className="px-3 py-3 font-normal">Stock as of</th><th className="px-3 py-3 font-normal">File</th><th className="px-3 py-3 font-normal">Status</th><th className="px-3 py-3 font-normal">Counts</th><th className="px-3 py-3 font-normal">Run by</th></tr></thead>
            <tbody className="divide-y divide-border">{data.runs.map((run) => {
              const counts = countsOf(run.counts);
              return <tr key={run.id}><td className="px-3 py-3 text-sm text-muted">{new Date(run.committedAt ?? run.createdAt).toLocaleString("en-MW")}</td><td className="px-3 py-3 text-sm text-muted">{run.asOf ? new Date(run.asOf).toLocaleString("en-MW", { timeZone: "Africa/Blantyre" }) : "—"}</td><td className="px-3 py-3 text-sm text-ink">{run.filename}</td><td className="px-3 py-3 text-sm text-ink">{run.status}</td><td className="px-3 py-3 text-xs text-muted">{String(counts.committedRows ?? counts.totalRows ?? 0)} rows · {String(counts.newProducts ?? 0)} new · {String(counts.existingProducts ?? 0)} existing · {String(counts.skippedRowCount ?? 0)} skipped · {money(Number(counts.totals && typeof counts.totals === "object" ? (counts.totals as Record<string, unknown>).value ?? 0 : 0))} value</td><td className="px-3 py-3 text-sm text-muted">{run.uploadedBy}</td></tr>;
            })}{data.runs.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-sm text-muted">No stock imports for this branch.</td></tr> : null}</tbody>
          </table>
        </div>
      </section>
      </> : <SalesImportPanel branchId={branchId} salesRuns={data.salesRuns} committingRun={data.salesCommittingRun} />}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="border-b border-border px-3 py-4"><p className="text-xs uppercase text-muted">{label}</p><p className="mt-2 font-mono text-xl text-ink">{value}</p></div>;
}

function RowsTable({ preview }: { preview: ImportPreview }) {
  const skippedGroups = preview.skipped.reduce<Record<string, typeof preview.skipped>>((groups, row) => {
    (groups[row.reason] ??= []).push(row);
    return groups;
  }, {});

  return <div className="grid gap-8 lg:grid-cols-2">
    <section><h3 className="mb-3 text-lg font-semibold text-ink">Skipped rows</h3>{Object.entries(skippedGroups).length ? Object.entries(skippedGroups).map(([reason, rows]) => <div key={reason} className="mb-4 border-t border-border pt-3"><h4 className="text-sm text-ink">{reason} <span className="font-mono text-muted">({rows.length})</span></h4><p className="mt-1 text-xs text-muted">Rows {rows.map((row) => row.rowNumber).join(", ")}</p></div>) : <p className="text-sm text-muted">No skipped rows.</p>}</section>
    <section><h3 className="mb-3 text-lg font-semibold text-ink">Flagged rows</h3>{preview.flagged.length ? preview.flagged.map((row) => <div key={row.rowNumber} className="border-t border-border py-3"><p className="text-sm text-ink">Row {row.rowNumber} · {row.code} · {row.name}</p><ul className="mt-1 list-inside list-disc text-xs text-warn">{row.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>) : <p className="text-sm text-muted">No value warnings.</p>}</section>
    <section className="lg:col-span-2"><h3 className="mb-3 text-lg font-semibold text-ink">Products</h3><div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[600px] text-left"><thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="px-3 py-2 font-normal">Code</th><th className="px-3 py-2 font-normal">Product</th><th className="px-3 py-2 font-normal">Quantity</th><th className="px-3 py-2 font-normal">Status</th></tr></thead><tbody className="divide-y divide-border">{preview.rows.map((row) => <tr key={`${row.rowNumber}-${row.code}`}><td className="px-3 py-2 font-mono text-sm">{row.code}</td><td className="px-3 py-2 text-sm">{row.name}</td><td className="px-3 py-2 font-mono text-sm">{row.quantity} {row.uom}</td><td className="px-3 py-2 text-sm">{row.productStatus === "NEW" ? "New product" : "Existing product"}</td></tr>)}</tbody></table></div></section>
  </div>;
}
