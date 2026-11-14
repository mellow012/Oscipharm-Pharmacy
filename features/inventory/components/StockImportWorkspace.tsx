"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  commitStockImportSlice,
  previewStockImport,
} from "@/features/inventory/lib/import-actions";
import { SalesImportPanel } from "@/features/inventory/components/SalesImportPanel";
import { LastImportNotice } from "@/features/inventory/components/ImportRunHistory";
import {
  StockImportFlowView,
  type ActiveStockRun,
  type StockImportPageData,
  type StockPreviewState,
} from "@/features/inventory/components/StockImportFlowView";
import { PageHeader } from "@/features/shared/components/PageHeader";
import { FormField, FormSelect } from "@/features/shared/components/FormField";

const uploadMessage = "Please export the Stock report with Aronium's Excel button";

function malawiLocalNowValue() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Blantyre",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function StockImportWorkspace({ data }: { data: StockImportPageData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<"STOCK" | "SALES">(() =>
    data.canImportStock ? "STOCK" : "SALES",
  );
  const [asOf, setAsOf] = useState(malawiLocalNowValue);
  const [preview, setPreview] = useState<StockPreviewState | null>(null);
  const [activeRun, setActiveRun] = useState<ActiveStockRun | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const branchId = data.branch?.id ?? "";

  async function requestPreview() {
    setError("");
    setMessage("");
    setPreview(null);
    if (!file) return setError(uploadMessage);
    if (!file.name.toLowerCase().endsWith(".xlsx")) return setError(uploadMessage);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("branchId", branchId);
    formData.set("asOf", asOf);
    const result = await previewStockImport(formData);
    if (!result.ok) return setError(result.error);
    if (result.status === "COMMITTING") {
      setActiveRun({
        id: result.runId,
        filename: result.filename,
        processed: result.processed,
        total: result.total,
      });
      setProgress({ processed: result.processed, total: result.total });
      setMessage("This upload has a commit in progress. Continue it with the selected workbook.");
      return;
    }
    setPreview({ runId: result.runId, filename: result.filename, preview: result.preview });
  }

  async function processSlices(
    runId: string,
    selectedFile: File,
    initialRun?: { filename: string; total: number },
  ) {
    if (initialRun) {
      setActiveRun({
        id: runId,
        filename: initialRun.filename,
        processed: 0,
        total: initialRun.total,
      });
      setProgress({ processed: 0, total: initialRun.total });
    }
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
      setActiveRun({
        id: runId,
        filename: initialRun?.filename ?? preview?.filename ?? selectedFile.name,
        processed: result.processed,
        total: result.total,
      });
      if (done) {
        setMessage("Stock import completed.");
        setActiveRun(null);
        router.refresh();
      }
    }
    setBusy(false);
  }

  const currentStep = message.includes("completed")
    ? "result"
    : activeRun
      ? "result"
      : preview
        ? "confirm"
        : file
          ? "preview"
          : "file";

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1440px] space-y-space-lg px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
      <PageHeader
        eyebrow={data.canImportStock ? "Inventory workspace" : "Sales workspace"}
        title={tab === "STOCK" && data.canImportStock ? "Stock import" : "Sales import"}
        description={data.branch?.name}
      />
      {data.canImportStock && data.canImportSales ? (
        <nav
          aria-label="Import type"
          className="flex min-w-0 gap-space-xs border-b border-outline-variant"
        >
          <button
            type="button"
            onClick={() => setTab("STOCK")}
            aria-pressed={tab === "STOCK"}
            className={`min-h-11 border-b-2 px-space-md font-label-md text-label-md ${tab === "STOCK" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}
          >
            Stock
          </button>
          <button
            type="button"
            onClick={() => setTab("SALES")}
            aria-pressed={tab === "SALES"}
            className={`min-h-11 border-b-2 px-space-md font-label-md text-label-md ${tab === "SALES" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}
          >
            Sales
          </button>
        </nav>
      ) : null}
      {data.actorRole === "ADMIN" ? (
        <FormField id="import-branch" label="Branch">
          {(fieldProps) => (
            <FormSelect
              {...fieldProps}
              value={branchId}
              disabled={isPending}
              onChange={(event) => {
                const nextBranchId = event.target.value;
                startTransition(() => router.push(`/staff/import?branchId=${nextBranchId}`));
              }}
            >
              {data.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </FormSelect>
          )}
        </FormField>
      ) : null}
      <LastImportNotice
        stockRuns={data.canImportStock ? data.runs : []}
        salesRuns={data.canImportSales ? data.salesRuns : []}
      />
      {tab === "STOCK" && data.canImportStock ? (
        <section id="stock-import-panel">
          <StockImportFlowView
          data={data}
          branchId={branchId}
          file={file}
          setFile={setFile}
          onSelectFile={(selectedFile) => {
            setFile(selectedFile);
            setPreview(null);
            setError("");
          }}
          asOf={asOf}
          setAsOf={setAsOf}
          busy={busy}
          error={error}
          message={message}
          currentStep={currentStep}
          activeRun={activeRun}
          progress={progress}
          percent={
            progress && progress.total > 0
              ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
              : 0
          }
          preview={preview}
          onPreview={() => void requestPreview()}
          onConfirm={() =>
            file &&
            preview &&
            void processSlices(preview.runId, file, {
              filename: preview.filename,
              total: preview.preview.rows.length,
            })
          }
          onResume={(runId, selectedFile) => void processSlices(runId, selectedFile)}
          />
        </section>
      ) : (
        <SalesImportPanel
          branchId={branchId}
          salesRuns={data.salesRuns}
          committingRun={data.salesCommittingRun}
          showOpeningStockInfo={data.canImportStock}
          hasOpeningStock={data.hasOpeningStock}
          onShowStockImport={() => setTab("STOCK")}
        />
      )}
    </div>
  );
}
