"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPreview, commitImport } from "@/features/inventory/lib/stock-import-service";
import { createSalesPreview, commitSalesSlice } from "@/features/inventory/lib/sales-import-service";

const IMPORT_XLSX_MESSAGE = "Please export the Stock report with Aronium's Excel button";
const SALES_XLSX_MESSAGE = "Please export the Sales Item list with Aronium's Excel button.";

type ImportActor = { id: string; role: string; branchId: string | null };

async function getImportActor(): Promise<ImportActor> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    throw new Error("You are not allowed to import stock.");
  }
  return { id: session.user.id, role: session.user.role, branchId: session.user.branchId };
}

async function resolveBranch(actor: ImportActor, requestedBranchId?: string) {
  const branchId = actor.role === "ADMIN" ? requestedBranchId : actor.branchId;
  if (!branchId) throw new Error("Choose a valid branch.");
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) throw new Error("Choose a valid branch.");
  return branch.id;
}

function plainError(error: unknown): string {
  const message = error instanceof Error ? error.message : "The stock import could not be completed.";
  const known = [
    IMPORT_XLSX_MESSAGE,
    "You are not allowed to import stock.",
    "Choose a valid branch.",
    "This file was already imported on ",
    "Opening stock was already imported on ",
    "This uploaded file does not match the import preview.",
    "This import run is no longer available to commit.",
    "This import run has been undone and cannot be committed.",
    "You must be signed in to preview a stock import.",
    "You must be signed in to commit a stock import.",
    "Stock import run was not found.",
  ];
  if (known.some((prefix) => message.startsWith(prefix))) return message;
  if (message.includes("Aronium Stock export") || message.includes("Excel button") || message.includes(".xlsx workbook")) return IMPORT_XLSX_MESSAGE;
  return "The stock import could not be completed. Check the workbook and try again.";
}

function fileFrom(formData: FormData, formatMessage = IMPORT_XLSX_MESSAGE): File {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error(formatMessage);
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error(formatMessage);
  return file;
}

function parseStockAsOf(value: FormDataEntryValue | null): Date {
  const raw = String(value ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!match) throw new Error("Enter a valid stock as-of date and time.");
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day || hour > 23 || minute > 59) {
    throw new Error("Enter a valid stock as-of date and time.");
  }
  return new Date(`${raw}:00+02:00`);
}

export async function loadImportPageData(requestedBranchId?: string) {
  const actor = await getImportActor();
  try {
    const branches = actor.role === "ADMIN"
      ? await prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : [];
    const branchId = await resolveBranch(actor, requestedBranchId ?? branches[0]?.id);
    const [branch, runs, salesRuns] = await Promise.all([
      prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true } }),
      prisma.importRun.findMany({
        where: { branchId, kind: "STOCK" },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { uploadedBy: { select: { name: true } } },
      }),
      prisma.importRun.findMany({
        where: { branchId, kind: "SALES" },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { uploadedBy: { select: { name: true } } },
      }),
    ]);
    return {
      error: null,
      branches,
      branch,
      runs: runs.map((run) => ({
        id: run.id,
        filename: run.filename,
        status: run.status,
        createdAt: run.createdAt.toISOString(),
        committedAt: run.committedAt?.toISOString() ?? null,
        asOf: run.asOf?.toISOString() ?? null,
        counts: run.counts,
        uploadedBy: run.uploadedBy.name,
      })),
      committingRun: runs.find((run) => run.status === "COMMITTING")
        ? {
            id: runs.find((run) => run.status === "COMMITTING")!.id,
            filename: runs.find((run) => run.status === "COMMITTING")!.filename,
            counts: runs.find((run) => run.status === "COMMITTING")!.counts,
          }
        : null,
      salesRuns: salesRuns.map((run) => ({
        id: run.id,
        filename: run.filename,
        status: run.status,
        createdAt: run.createdAt.toISOString(),
        committedAt: run.committedAt?.toISOString() ?? null,
        asOf: null,
        counts: run.counts,
        uploadedBy: run.uploadedBy.name,
      })),
      salesCommittingRun: salesRuns.find((run) => run.status === "COMMITTING")
        ? { id: salesRuns.find((run) => run.status === "COMMITTING")!.id, filename: salesRuns.find((run) => run.status === "COMMITTING")!.filename, counts: salesRuns.find((run) => run.status === "COMMITTING")!.counts }
        : null,
      actorRole: actor.role,
    };
  } catch (error) {
    return { error: plainError(error), branches: [], branch: null, runs: [], salesRuns: [], committingRun: null, salesCommittingRun: null, actorRole: actor.role };
  }
}

export async function previewStockImport(formData: FormData) {
  try {
    const actor = await getImportActor();
    const branchId = await resolveBranch(actor, String(formData.get("branchId") ?? ""));
    const file = fileFrom(formData);
    const result = await createPreview({ branchId, userId: actor.id, filename: file.name, buffer: Buffer.from(await file.arrayBuffer()), asOf: parseStockAsOf(formData.get("asOf")) });
    if (result.status === "COMMITTING") {
      return {
        ok: true as const,
        status: result.status,
        runId: result.run.id,
        filename: result.run.filename,
        processed: result.resume.completedRows,
        total: result.resume.totalRows,
      };
    }
    return {
      ok: true as const,
      status: result.status,
      runId: result.run.id,
      filename: result.run.filename,
      preview: result.preview,
    };
  } catch (error) {
    return { ok: false as const, error: plainError(error) };
  }
}

export async function previewSalesImport(formData: FormData) {
  try {
    const actor = await getImportActor();
    const branchId = await resolveBranch(actor, String(formData.get("branchId") ?? ""));
    const file = fileFrom(formData, SALES_XLSX_MESSAGE);
    const result = await createSalesPreview({ branchId, userId: actor.id, filename: file.name, buffer: Buffer.from(await file.arrayBuffer()) });
    if (result.status === "COMMITTING") return { ok: true as const, status: result.status, runId: result.run.id, filename: result.run.filename, processed: result.resume.processed, total: result.resume.total };
    return { ok: true as const, status: result.status, runId: result.run.id, filename: result.run.filename, preview: result.preview };
  } catch (error) {
    return { ok: false as const, error: salesPlainError(error) };
  }
}

export async function commitSalesImportSlice(formData: FormData) {
  try {
    await getImportActor();
    const runId = String(formData.get("runId") ?? "");
    if (!runId) throw new Error("Sales import run was not found.");
    const file = fileFrom(formData, SALES_XLSX_MESSAGE);
    const result = await commitSalesSlice(runId, Buffer.from(await file.arrayBuffer()), 8_000);
    return { ok: true as const, processed: result.processed, total: result.total, done: result.done, counts: result.counts ?? null };
  } catch (error) {
    return { ok: false as const, error: salesPlainError(error) };
  }
}

function salesPlainError(error: unknown): string {
  const message = error instanceof Error ? error.message : "The sales import could not be completed.";
  if (/^Sales row \d+ /.test(message)) return message;
  if (message.startsWith("This file was already imported on ") || message.startsWith("Only an Admin") || message.startsWith("Choose a valid branch.") || message.startsWith("You must be signed in") || message.startsWith("Sales import run was not found.") || message.startsWith("This upload does not match")) return message;
  if (message.includes("Stock export") || message.includes("Refunds summary") || message.includes("Excel button") || message.includes("Sales Item list")) return SALES_XLSX_MESSAGE;
  return "The sales import could not be completed. Check the workbook and try again.";
}

export async function commitStockImportSlice(formData: FormData) {
  try {
    await getImportActor();
    const runId = String(formData.get("runId") ?? "");
    if (!runId) throw new Error("Stock import run was not found.");
    const file = fileFrom(formData);
    const result = await commitImport(runId, Buffer.from(await file.arrayBuffer()), { timeLimitMs: 8_000 });
    if (!result.done) {
      return { ok: true as const, processed: result.processed, total: result.total, done: false };
    }
    return { ok: true as const, processed: result.processed, total: result.total, done: true };
  } catch (error) {
    return { ok: false as const, error: plainError(error) };
  }
}
