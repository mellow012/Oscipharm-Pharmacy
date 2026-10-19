"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { commitSalesImportSlice, previewSalesImport } from "@/features/inventory/lib/import-actions";
import type { SalesImportPreview } from "@/features/inventory/lib/sales-import-preview";

type SalesHistoryRun = {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  committedAt: string | null;
  counts: unknown;
  uploadedBy: string;
};

type ResumeRun = { id: string; filename: string; counts: unknown } | null;
type ActiveRun = { id: string; filename: string; processed: number; total: number };
type PreviewState = { runId: string; filename: string; preview: SalesImportPreview };

function money(value: number) {
  return new Intl.NumberFormat("en-MW", { style: "currency", currency: "MWK", maximumFractionDigits: 2 }).format(value);
}

function objectCounts(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function SalesImportPanel({ branchId, salesRuns, committingRun }: { branchId: string; salesRuns: SalesHistoryRun[]; committingRun: ResumeRun }) {
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
      setActiveRun({ id: result.runId, filename: result.filename, processed: result.processed, total: result.total });
      setProgress({ processed: result.processed, total: result.total });
      setMessage("A sales import is already in progress. Continue it with this workbook.");
      return;
    }
    setPreview({ runId: result.runId, filename: result.filename, preview: result.preview });
  }

  async function runSlices(runId: string, selectedFile: File) {
    setBusy(true);
    setError("");
    setActiveRun((current) => current?.id === runId ? current : { id: runId, filename: selectedFile.name, processed: progress.processed, total: progress.total });
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
      setActiveRun({ id: runId, filename: selectedFile.name, processed: result.processed, total: result.total });
      if (done) {
        setMessage("Sales import completed.");
        setActiveRun(null);
        setPreview(null);
        router.refresh();
      }
    }
    setBusy(false);
  }

  const percent = progress.total > 0 ? Math.min(100, Math.round(progress.processed / progress.total * 100)) : 0;

  return <div className="py-6">
    {committingRun ? <section className="mb-6 border-l-4 border-warn bg-warn-bg/40 p-4"><h2 className="font-semibold text-ink">A sales import needs to be resumed</h2><p className="mt-1 text-sm text-muted">Choose the same Sales Item workbook to resume {committingRun.filename}.</p><label className="mt-3 block text-sm text-muted">Resume workbook<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" /></label><button type="button" disabled={busy || !file} onClick={() => void runSlices(committingRun.id, file!)} className="mt-3 bg-primary px-4 py-2 font-medium text-primary-fg disabled:opacity-50">Resume sales import</button></section> : null}

    <section className="border-y border-border py-6"><h2 className="text-2xl text-ink">Upload Sales Item list</h2><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block flex-1 text-sm text-muted">.xlsx file<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError(""); }} className="mt-2 block w-full border border-border bg-white p-2 text-ink" /></label><button type="button" disabled={busy || !file || !branchId} onClick={() => void loadPreview()} className="bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50">Preview sales</button></div></section>
    {error ? <p role="alert" className="mt-5 border-l-4 border-danger bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p> : null}
    {message ? <p role="status" className="mt-5 border-l-4 border-primary bg-chip px-4 py-3 text-sm text-primary">{message}</p> : null}

    {activeRun ? <section className="mt-6" aria-live="polite"><div className="mb-2 flex justify-between text-sm"><span className="text-ink">Importing {activeRun.filename}</span><span className="font-mono text-muted">{percent}%</span></div><progress value={progress.processed} max={Math.max(1, progress.total)} className="h-3 w-full accent-primary"/><p className="mt-1 text-xs text-muted">{progress.processed} of {progress.total} documents processed</p>{!busy && file ? <button type="button" onClick={() => void runSlices(activeRun.id, file)} className="mt-3 border border-primary px-4 py-2 text-sm font-medium text-primary">Continue import</button> : null}</section> : null}

    {preview ? <SalesPreviewView preview={preview.preview} filename={preview.filename} busy={busy} onConfirm={() => void runSlices(preview.runId, file!)} /> : null}

    <section className="mt-10 border-t border-border pt-6"><h2 className="text-2xl text-ink">Sales import history</h2><div className="mt-4 overflow-x-auto border-y border-border"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="px-3 py-3 font-normal">Imported</th><th className="px-3 py-3 font-normal">File</th><th className="px-3 py-3 font-normal">Status</th><th className="px-3 py-3 font-normal">Counts</th><th className="px-3 py-3 font-normal">Receipts</th><th className="px-3 py-3 font-normal">Run by</th></tr></thead><tbody className="divide-y divide-border">{salesRuns.map((run) => { const counts = objectCounts(run.counts); return <tr key={run.id} className="group relative cursor-pointer transition-colors hover:bg-surface focus-within:bg-surface"><td className="px-3 py-3 text-sm text-muted">{new Date(run.committedAt ?? run.createdAt).toLocaleString("en-MW")}</td><td className="px-3 py-3 text-sm text-ink">{run.status === "COMMITTED" ? <Link className="text-primary after:absolute after:inset-0 after:z-0 after:content-[''] group-hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/staff/sales?importRunId=${run.id}`}>{run.filename}</Link> : run.filename}</td><td className="px-3 py-3 text-sm text-ink">{run.status}</td><td className="px-3 py-3 text-xs text-muted">{String(counts.importedDocuments ?? counts.totalDocuments ?? 0)} imported · {String(counts.alreadyImportedDocuments ?? 0)} already imported · {String(counts.historyOnlyDocuments ?? 0)} history only · {String(counts.refundsWithoutOriginal ?? 0)} refunds without original</td><td className="px-3 py-3 text-sm">{run.status === "COMMITTED" ? <span className="pointer-events-none relative z-10 text-primary">Browse</span> : "—"}</td><td className="px-3 py-3 text-sm text-muted">{run.uploadedBy}</td></tr>; })}{!salesRuns.length ? <tr><td colSpan={6} className="px-3 py-6 text-sm text-muted">No sales imports for this branch.</td></tr> : null}</tbody></table></div></section>
  </div>;
}

function SalesPreviewView({ preview, filename, busy, onConfirm }: { preview: SalesImportPreview; filename: string; busy: boolean; onConfirm: () => void }) {
  const skipGroups = preview.skipped.reduce<Record<string, number>>((groups, item) => { groups[item.reason] = (groups[item.reason] ?? 0) + 1; return groups; }, {});
  return <section className="mt-8 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4"><div><p className="font-mono text-xs uppercase text-warn">Sales preview · {preview.dateRange.from ?? "No dates"} to {preview.dateRange.to ?? "No dates"}</p><h2 className="mt-1 text-2xl text-ink">{filename}</h2></div><button type="button" disabled={busy || preview.counts.newDocuments === 0} onClick={onConfirm} className="bg-primary px-5 py-3 font-semibold text-primary-fg disabled:opacity-50">Confirm sales import</button></header>
    {preview.warning ? <p className="border-l-4 border-warn bg-warn-bg/40 px-4 py-3 text-sm text-ink">{preview.warning}</p> : null}
    <div className="grid grid-cols-2 gap-4 border-y border-border sm:grid-cols-4"><Metric label="New documents" value={preview.counts.newDocuments}/><Metric label="Already imported" value={preview.counts.alreadyImportedDocuments}/><Metric label="Before stock as-of" value={preview.counts.historyOnlyDocuments}/><Metric label="Refund original found / missing" value={`${preview.counts.refundsWithOriginal} / ${preview.counts.refundsWithoutOriginal}`}/></div>
    <div className="grid gap-4 border-b border-border pb-5 sm:grid-cols-3"><Metric label="Sales" value={money(preview.totals.sales)}/><Metric label="Refunds" value={money(preview.totals.refunds)}/><Metric label="Net" value={money(preview.totals.net)}/></div>
    <div className="grid gap-8 lg:grid-cols-2"><section><h3 className="mb-3 text-lg font-semibold text-ink">Skipped rows</h3>{Object.keys(skipGroups).length ? Object.entries(skipGroups).map(([reason, count]) => <p key={reason} className="border-t border-border py-2 text-sm text-muted">{reason} · {count}</p>) : <p className="text-sm text-muted">No skipped rows.</p>}</section><section><h3 className="mb-3 text-lg font-semibold text-ink">Flagged lines</h3>{preview.flaggedRows.length ? preview.flaggedRows.map((row) => <p key={row.lineKey} className="border-t border-border py-2 text-xs text-warn">{row.documentNumber} · {row.code} · {row.flags.join("; ")}</p>) : <p className="text-sm text-muted">No flagged lines.</p>}</section></div>
    <section><h3 className="mb-3 text-lg font-semibold text-ink">Products to create</h3>{preview.newProducts.length ? preview.newProducts.map((product) => <p key={product.code} className="border-t border-border py-2 text-sm text-ink"><span className="font-mono">{product.code}</span> · {product.product} · {product.uom}</p>) : <p className="text-sm text-muted">All product codes are already linked.</p>}</section>
    <section><h3 className="mb-3 text-lg font-semibold text-ink">Documents</h3><div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[700px] text-left"><thead className="border-b border-border text-xs uppercase text-muted"><tr><th className="px-3 py-2 font-normal">Date</th><th className="px-3 py-2 font-normal">Type</th><th className="px-3 py-2 font-normal">Document</th><th className="px-3 py-2 font-normal">Original</th><th className="px-3 py-2 font-normal">Status</th><th className="px-3 py-2 font-normal">Total</th></tr></thead><tbody>{preview.documents.map((document) => <tr key={`${document.documentType}-${document.documentNumber}`} className="border-t border-border"><td className="px-3 py-2 text-sm text-muted">{document.businessDay}</td><td className="px-3 py-2 text-sm">{document.documentType}</td><td className="px-3 py-2 font-mono text-sm">{document.documentNumber}</td><td className="px-3 py-2 text-sm">{document.refNumber ? document.originalFound ? "Found" : "Not found" : "—"}</td><td className="px-3 py-2 text-sm">{document.importStatus === "ALREADY_IMPORTED" ? "Already imported" : document.historyOnly ? "History only" : "New"}</td><td className="px-3 py-2 font-mono text-sm">{money(document.totalAmount)}</td></tr>)}</tbody></table></div></section>
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="border-b border-border px-3 py-4"><p className="text-xs uppercase text-muted">{label}</p><p className="mt-2 font-mono text-xl text-ink">{value}</p></div>; }
