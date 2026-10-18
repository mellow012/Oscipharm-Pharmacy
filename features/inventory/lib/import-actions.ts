"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPreview, commitImport } from "@/features/inventory/lib/stock-import-service";

const IMPORT_XLSX_MESSAGE = "Please export the Stock report with Aronium's Excel button";

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

function fileFrom(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error(IMPORT_XLSX_MESSAGE);
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error(IMPORT_XLSX_MESSAGE);
  return file;
}

export async function loadImportPageData(requestedBranchId?: string) {
  const actor = await getImportActor();
  try {
    const branches = actor.role === "ADMIN"
      ? await prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : [];
    const branchId = await resolveBranch(actor, requestedBranchId ?? branches[0]?.id);
    const [branch, runs] = await Promise.all([
      prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true } }),
      prisma.importRun.findMany({
        where: { branchId, kind: "STOCK" },
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
      actorRole: actor.role,
    };
  } catch (error) {
    return { error: plainError(error), branches: [], branch: null, runs: [], committingRun: null, actorRole: actor.role };
  }
}

export async function previewStockImport(formData: FormData) {
  try {
    const actor = await getImportActor();
    const branchId = await resolveBranch(actor, String(formData.get("branchId") ?? ""));
    const file = fileFrom(formData);
    const result = await createPreview({ branchId, userId: actor.id, filename: file.name, buffer: Buffer.from(await file.arrayBuffer()) });
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
