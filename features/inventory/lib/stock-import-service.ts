import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { ImportRun, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.ts";
import { lockImportBranch, processChunkSlice } from "./stock-import-slices.ts";
import { parseStockExport, type StockRow } from "./stock-parser.ts";

const CHUNK_SIZE = 50;
const OPENING_EXPIRY = new Date("2100-01-01T00:00:00.000Z");

type DatabaseClient = PrismaClient;
type FileBuffer = Buffer | Uint8Array | ArrayBuffer;
type SkipReason = string;

type SkippedRow = {
  rowNumber: number;
  code: string;
  reason: SkipReason;
};

type FlaggedRow = {
  rowNumber: number;
  code: string;
  name: string;
  warnings: string[];
};

export type PreviewCounts = {
  totalRows: number;
  completedRows?: number;
  committedRows?: number;
  newProducts: number;
  existingProducts: number;
  skippedRowCount: number;
  skipReasons: Record<string, number>;
  flaggedRowCount: number;
  groupRows: number;
  totals: { quantity: number; cost: number; value: number };
};

export type ImportPreviewRow = StockRow & { productStatus: "NEW" | "EXISTING"; variantId: string | null };

export type ImportPreview = {
  layout: "A" | "B";
  rows: ImportPreviewRow[];
  skipped: SkippedRow[];
  flagged: FlaggedRow[];
  counts: PreviewCounts;
};

if (typeof window !== "undefined") {
  throw new Error("Stock import service is server-only.");
}

export type CreatePreviewInput = {
  branchId: string;
  userId: string;
  filename: string;
  buffer: FileBuffer;
  asOf: Date;
};

export type ChunkProgress = { completedRows: number; totalRows: number; chunk: number; queryCount: number };

export type CommitImportOptions = {
  onChunkCommitted?: (progress: ChunkProgress) => void | Promise<void>;
  timeLimitMs?: number;
};

export type StockImportSliceResult = { processed: number; total: number; done: boolean };

export type CreatePreviewResult =
  | { status: "PREVIEW"; run: ImportRun; preview: ImportPreview }
  | { status: "COMMITTING"; run: ImportRun; resume: { completedRows: number; totalRows: number } };

function asBuffer(buffer: FileBuffer): Buffer {
  if (Buffer.isBuffer(buffer)) return buffer;
  if (buffer instanceof ArrayBuffer) return Buffer.from(new Uint8Array(buffer));
  return Buffer.from(buffer);
}

function sha256(buffer: FileBuffer): string {
  return createHash("sha256").update(asBuffer(buffer)).digest("hex");
}

function dateLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function runDate(run: ImportRun): string {
  return dateLabel(run.committedAt ?? run.createdAt);
}

function openingBatchNumber(date = new Date()): string {
  return `OPENING-${dateLabel(date)}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseSkippedRows(parserSkipped: { rowNumber: number; reason: string }[]) {
  return parserSkipped.map((row) => ({ rowNumber: row.rowNumber, code: "", reason: row.reason }));
}

function prepareRows(rows: StockRow[], parserSkipped: { rowNumber: number; reason: string }[]) {
  const skippedRows = parseSkippedRows(parserSkipped);
  const eligibleRows: StockRow[] = [];
  const seenCodes = new Set<string>();

  for (const row of rows) {
    const code = row.code.trim();
    if (!code) {
      skippedRows.push({ rowNumber: row.rowNumber, code, reason: "missing Aronium product code" });
      continue;
    }
    if (seenCodes.has(code)) {
      skippedRows.push({ rowNumber: row.rowNumber, code, reason: "duplicate code; first row kept" });
      continue;
    }
    seenCodes.add(code);
    if (!Number.isInteger(row.quantity) || row.quantity < 0) {
      skippedRows.push({ rowNumber: row.rowNumber, code, reason: "quantity must be a non-negative whole number of packs" });
      continue;
    }
    eligibleRows.push(row);
  }

  return { eligibleRows, skippedRows };
}

function countsForRows(
  rows: StockRow[],
  skippedRows: SkippedRow[],
  existingLinks: Map<string, { variantId: string }>,
): { preview: ImportPreview; counts: PreviewCounts } {
  const flaggedRows = rows
    .filter((row) => row.warnings.length > 0)
    .map(({ rowNumber, code, name, warnings }) => ({ rowNumber, code, name, warnings }));
  const importable = rows.filter((row) => row.code.trim() && Number.isInteger(row.quantity) && row.quantity >= 0);
  const previewRows = importable.map((row) => {
    const link = existingLinks.get(row.code);
    return { ...row, productStatus: link ? "EXISTING" as const : "NEW" as const, variantId: link?.variantId ?? null };
  });
  const totals = importable.reduce(
    (sum, row) => {
      sum.quantity += row.quantity;
      sum.cost += row.lineCost ?? (row.unitCost ?? 0) * row.quantity;
      sum.value += row.totalValueInclTax ?? row.totalValue ?? row.lineCostInclTax ?? row.lineCost ?? 0;
      return sum;
    },
    { quantity: 0, cost: 0, value: 0 },
  );
  const counts: PreviewCounts = {
    totalRows: importable.length,
    newProducts: previewRows.filter((row) => row.productStatus === "NEW").length,
    existingProducts: previewRows.filter((row) => row.productStatus === "EXISTING").length,
    skippedRowCount: skippedRows.length,
    skipReasons: skippedRows.reduce<Record<string, number>>((reasons, row) => {
      reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
      return reasons;
    }, {}),
    flaggedRowCount: flaggedRows.length,
    groupRows: rows.filter((row) => Boolean(row.group?.trim())).length,
    totals: { quantity: totals.quantity, cost: roundMoney(totals.cost), value: roundMoney(totals.value) },
  };

  return {
    counts,
    preview: {
      layout: "A",
      rows: previewRows,
      skipped: skippedRows,
      flagged: flaggedRows,
      counts,
    },
  };
}

async function assertImportPermission(db: DatabaseClient, branchId: string, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, branchId: true } });
  if (!user || (user.role !== "ADMIN" && !(user.role === "BRANCH_MANAGER" && user.branchId === branchId))) {
    throw new Error("Only an Admin or the Branch Manager for this branch can import stock.");
  }
  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) throw new Error("Choose a valid branch.");
}

async function findExistingLinks(db: DatabaseClient, codes: string[]) {
  const links = await db.aroniumProductLink.findMany({
    where: { aroniumCode: { in: codes } },
    select: { aroniumCode: true, variantId: true },
  });
  return new Map(links.map((link) => [link.aroniumCode, { variantId: link.variantId }]));
}

function stockConflict(run: ImportRun, sameFile = false): Error {
  if (sameFile) return new Error(`This file was already imported on ${runDate(run)}.`);
  return new Error(`Opening stock was already imported on ${runDate(run)}.`);
}

async function createPreviewWith(
  db: DatabaseClient,
  input: CreatePreviewInput,
  resolveActorId: () => Promise<string | null>,
): Promise<CreatePreviewResult> {
  if (!(input.asOf instanceof Date) || !Number.isFinite(input.asOf.getTime())) throw new Error("Enter a valid stock as-of date and time.");
  const actorId = await resolveActorId();
  if (!actorId || actorId !== input.userId) throw new Error("You must be signed in to preview a stock import.");
  await assertImportPermission(db, input.branchId, actorId);
  const fileSha256 = sha256(input.buffer);
  let existingRun = await db.importRun.findFirst({ where: { branchId: input.branchId, kind: "STOCK", fileSha256 } });

  if (existingRun?.status === "COMMITTED") throw stockConflict(existingRun, true);
  if (existingRun?.status === "COMMITTING") {
    const counts = existingRun.counts as Partial<PreviewCounts> | null;
    return {
      status: "COMMITTING",
      run: existingRun,
      resume: { completedRows: Number(counts?.completedRows ?? 0), totalRows: Number(counts?.totalRows ?? 0) },
    };
  }
  if (existingRun?.status === "UNDONE") existingRun = null;

  const activeRun = await db.importRun.findFirst({
    where: { branchId: input.branchId, kind: "STOCK", status: { in: ["COMMITTING", "COMMITTED"] }, ...(existingRun ? { id: { not: existingRun.id } } : {}) },
    orderBy: { createdAt: "asc" },
  });
  if (activeRun) throw stockConflict(activeRun);

  const parsed = await parseStockExport(input.buffer, input.filename);
  const { eligibleRows, skippedRows } = prepareRows(parsed.rows, parsed.skipped);
  const existingLinks = await findExistingLinks(db, eligibleRows.map((row) => row.code));
  const { preview, counts } = countsForRows(eligibleRows, skippedRows, existingLinks);
  preview.layout = parsed.layout;
  const countsJson = counts as unknown as Prisma.InputJsonValue;

  let run: ImportRun;
  try {
    run = existingRun
        ? await db.importRun.update({ where: { id: existingRun.id }, data: { filename: input.filename, asOf: input.asOf, counts: countsJson } })
      : await db.importRun.create({
          data: { kind: "STOCK", branchId: input.branchId, filename: input.filename, fileSha256, uploadedById: input.userId, status: "PREVIEW", counts: countsJson, asOf: input.asOf },
        });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const racedRun = await db.importRun.findFirst({ where: { branchId: input.branchId, kind: "STOCK", status: { in: ["COMMITTING", "COMMITTED"] } }, orderBy: { createdAt: "asc" } });
      if (racedRun) throw stockConflict(racedRun);
    }
    throw error;
  }

  return { status: "PREVIEW", run, preview };
}

function jsonCounts(run: ImportRun): Record<string, unknown> {
  const counts = run.counts;
  return typeof counts === "object" && counts !== null && !Array.isArray(counts) ? counts as Record<string, unknown> : {};
}

async function commitImportWith(
  db: DatabaseClient,
  runId: string,
  buffer: FileBuffer,
  resolveActorId: () => Promise<string | null>,
  options: CommitImportOptions = {},
) {
  const run = await db.importRun.findUnique({ where: { id: runId } });
  if (!run || run.kind !== "STOCK") throw new Error("Stock import run was not found.");
  if (sha256(buffer) !== run.fileSha256) throw new Error("The uploaded file does not match this import preview.");
  if (run.status === "COMMITTED") throw stockConflict(run, true);
  if (run.status === "UNDONE") throw new Error("This import run has been undone and cannot be committed.");
  if (!run.asOf) throw new Error("Stock import is missing its as-of date and time.");

  const actorId = await resolveActorId();
  if (!actorId) throw new Error("You must be signed in to commit a stock import.");
  await assertImportPermission(db, run.branchId, actorId);
  if (run.status === "PREVIEW") {
    const updated = await db.importRun.updateMany({ where: { id: run.id, status: "PREVIEW" }, data: { status: "COMMITTING" } });
    if (updated.count === 0) {
      const refreshed = await db.importRun.findUniqueOrThrow({ where: { id: run.id } });
      if (refreshed.status !== "COMMITTING") throw new Error("Import run is no longer available to commit.");
    }
  }

  const parsed = await parseStockExport(buffer, run.filename);
  const { eligibleRows } = prepareRows(parsed.rows, parsed.skipped);
  const rowGroups = [] as StockRow[][];
  for (let start = 0; start < eligibleRows.length; start += CHUNK_SIZE) {
    rowGroups.push(eligibleRows.slice(start, start + CHUNK_SIZE));
  }
  const persistedCounts = jsonCounts(run);
  const skippedRows = prepareRows(parsed.rows, parsed.skipped).skippedRows;
  const finalCounts = {
    ...persistedCounts,
    totalRows: eligibleRows.length,
    groupRows: parsed.rows.filter((row) => Boolean(row.group?.trim())).length,
    completedRows: eligibleRows.length,
    committedRows: eligibleRows.length,
    skippedRowCount: skippedRows.length,
    skipReasons: skippedRows.reduce<Record<string, number>>((reasons, row) => {
      reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
      return reasons;
    }, {}),
    flaggedRowCount: parsed.rows.filter((row) => row.warnings.length > 0).length,
    totals: countsForRows(eligibleRows, skippedRows, new Map()).counts.totals,
  };
  const initialCounts = jsonCounts(run);
  const startAt = Math.min(Number(initialCounts.completedChunks ?? 0), rowGroups.length);
  const slice = await processChunkSlice({
    chunks: rowGroups,
    startAt,
    timeLimitMs: options.timeLimitMs ?? 8_000,
    async processChunk(chunk, chunkIndex) {
      const codes = chunk.map((row) => row.code);
      let queryCount = 0;
      await db.$transaction(async (tx) => {
        await lockImportBranch(tx, run.branchId);
        queryCount += 1;
        const prefetchedLinks = await tx.aroniumProductLink.findMany({ where: { aroniumCode: { in: codes } }, select: { aroniumCode: true, variantId: true } });
        queryCount += 1;
        const prefetchedLinkByCode = new Map(prefetchedLinks.map((link) => [link.aroniumCode, link.variantId]));
        const linkedVariantIds = prefetchedLinks.map((link) => link.variantId);
        const [prefetchedVariants, prefetchedPrices, prefetchedBatches] = linkedVariantIds.length
          ? await Promise.all([
              tx.variant.findMany({ where: { id: { in: linkedVariantIds } }, select: { id: true, packSize: true } }),
              tx.branchPrice.findMany({ where: { branchId: run.branchId, variantId: { in: linkedVariantIds } }, select: { variantId: true } }),
              tx.batch.findMany({ where: { importRunId: run.id, variantId: { in: linkedVariantIds } }, select: { variantId: true } }),
            ])
          : [[], [], []];
        queryCount += linkedVariantIds.length ? 3 : 0;
        const variantById = new Map(prefetchedVariants.map((variant) => [variant.id, variant]));
        const pricedVariantIds = new Set(prefetchedPrices.map((price) => price.variantId));
        const existingBatchVariantIds = new Set(prefetchedBatches.map((batch) => batch.variantId));
        const missingRows = chunk.filter((row) => !prefetchedLinkByCode.has(row.code));
        const createdVariants = missingRows.map((row) => ({ id: randomUUID(), brandName: row.name, strength: null, packSize: 1, unitLabel: row.uom || "unit", allowsLooseSale: false }));
        if (createdVariants.length) {
          await tx.variant.createMany({ data: createdVariants });
          queryCount += 1;
        }
        const variantIdByCode = new Map<string, string>();
        missingRows.forEach((row, index) => variantIdByCode.set(row.code, createdVariants[index].id));
        const newLinks = missingRows.map((row) => ({ aroniumCode: row.code, variantId: variantIdByCode.get(row.code)!, mode: "PACK" as const, createdById: actorId }));
        if (newLinks.length) {
          await tx.aroniumProductLink.createMany({ data: newLinks });
          queryCount += 1;
        }

        const priceCreates: Prisma.BranchPriceCreateManyInput[] = [];
        const batchCreates: Prisma.BatchCreateManyInput[] = [];
        for (const row of chunk) {
          const variantId = prefetchedLinkByCode.get(row.code) ?? variantIdByCode.get(row.code)!;
          const variant = variantById.get(variantId) ?? { id: variantId, packSize: 1 };
          if (row.quantity > 0) {
            const value = row.totalValueInclTax ?? row.totalValue;
            if (!pricedVariantIds.has(variantId) && value !== null && value !== undefined) {
              priceCreates.push({
                variantId,
                branchId: run.branchId,
                pricePerPack: new Prisma.Decimal(value).div(row.quantity).toDecimalPlaces(2),
                pricePerUnit: new Prisma.Decimal(0),
                updatedById: actorId,
              });
              pricedVariantIds.add(variantId);
            }
            if (!existingBatchVariantIds.has(variantId)) {
              batchCreates.push({
                variantId,
                branchId: run.branchId,
                importRunId: run.id,
                batchNumber: openingBatchNumber(run.asOf!),
                quantityReceived: row.quantity,
                quantityRemaining: row.quantity * variant.packSize,
                expiryDate: OPENING_EXPIRY,
                expiryDateKnown: false,
                receivedAt: run.asOf!,
                receivedById: actorId,
              });
              existingBatchVariantIds.add(variantId);
            }
          }
        }
        if (priceCreates.length) {
          await tx.branchPrice.createMany({ data: priceCreates, skipDuplicates: true });
          queryCount += 1;
        }
        if (batchCreates.length) {
          await tx.batch.createMany({ data: batchCreates, skipDuplicates: true });
          queryCount += 1;
        }

        const completedRows = Math.min((chunkIndex + 1) * CHUNK_SIZE, eligibleRows.length);
        await tx.importRun.update({
          where: { id: run.id },
          data: { counts: { ...finalCounts, completedRows, completedChunks: chunkIndex + 1 } as Prisma.InputJsonValue },
        });
        queryCount += 1;
      }, { timeout: 30_000, maxWait: 10_000 });

      await options.onChunkCommitted?.({
        completedRows: Math.min((chunkIndex + 1) * CHUNK_SIZE, eligibleRows.length),
        totalRows: eligibleRows.length,
        chunk: chunkIndex + 1,
        queryCount,
      });
    },
  });

  if (!slice.done) {
    return {
      processed: Math.min(slice.processed * CHUNK_SIZE, eligibleRows.length),
      total: eligibleRows.length,
      done: false,
    } satisfies StockImportSliceResult;
  }

  const committed = await db.$transaction(async (tx) => {
    const updatedRun = await tx.importRun.update({
      where: { id: run.id },
      data: { status: "COMMITTED", committedAt: new Date(), counts: finalCounts as Prisma.InputJsonValue },
    });
    await tx.auditLog.create({
      data: {
        action: "IMPORT_COMMITTED",
        branchId: run.branchId,
        userId: actorId,
        details: { importRunId: run.id, ...finalCounts },
      },
    });
    return updatedRun;
  }, { timeout: 30_000, maxWait: 10_000 });

  return { run: committed, counts: finalCounts, processed: eligibleRows.length, total: eligibleRows.length, done: true };
}

async function currentActorId(): Promise<string | null> {
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import("next-auth"),
    import("../../../lib/auth.ts"),
  ]);
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export function createStockImportService(
  db: DatabaseClient = prisma,
  resolveActorId: () => Promise<string | null> = currentActorId,
) {
  return {
    createPreview: (input: CreatePreviewInput) => createPreviewWith(db, input, resolveActorId),
    commitImport: (runId: string, buffer: FileBuffer, options?: CommitImportOptions) => commitImportWith(db, runId, buffer, resolveActorId, options),
  };
}

const stockImportService = createStockImportService();
export const createPreview = stockImportService.createPreview;
export const commitImport = stockImportService.commitImport;
