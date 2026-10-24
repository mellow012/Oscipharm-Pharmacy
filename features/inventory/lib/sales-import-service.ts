import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { ImportRun, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.ts";
import { INACTIVE_BRANCH_WRITE_ERROR, lockActiveBranch } from "../../../lib/branch-write-guard.ts";
import { allocateFefoBatches } from "../../pos/lib/checkout-core.ts";
import { getMalawiDateKey } from "../../../lib/timezone.ts";
import { lockImportBranch, processChunkSlice } from "./stock-import-slices.ts";
import { buildSalesImportPreview, isHistoryOnlySalesDocument, type SalesImportPreview } from "./sales-import-preview.ts";
import { parseSalesExport, type SalesDocument, type SalesExportRow } from "./sales-parser.ts";

const DOCUMENT_SLICE_MS = 8_000;
const DOCUMENT_CHUNK_SIZE = 50;
const RETURN_EXPIRY = new Date("2100-01-01T00:00:00.000Z");
type Db = PrismaClient;
type FileBuffer = Buffer | Uint8Array | ArrayBuffer;

if (typeof window !== "undefined") throw new Error("Sales import service is server-only.");

export type SalesPreviewInput = { branchId: string; userId: string; filename: string; buffer: FileBuffer };
export type SalesSliceResult = { processed: number; total: number; done: boolean; counts?: Record<string, unknown> };

type SalesDocumentWithLines = SalesDocument & { lines: SalesExportRow[]; historyOnly: boolean };

function toBuffer(buffer: FileBuffer) {
  if (Buffer.isBuffer(buffer)) return buffer;
  if (buffer instanceof ArrayBuffer) return Buffer.from(new Uint8Array(buffer));
  return Buffer.from(buffer);
}

function hash(buffer: FileBuffer) {
  return createHash("sha256").update(toBuffer(buffer)).digest("hex");
}

function jsonObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function plainRunDate(run: ImportRun) {
  return (run.committedAt ?? run.createdAt).toISOString().slice(0, 10);
}

function runDuplicate(run: ImportRun, sameFile: boolean) {
  return new Error(sameFile ? `This file was already imported on ${plainRunDate(run)}.` : `Sales have already been imported for this branch.`);
}

async function actorIdFromSession(): Promise<string | null> {
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import("next-auth"),
    import("../../../lib/auth.ts"),
  ]);
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

async function assertActor(db: Db, branchId: string, userId: string) {
  const [user, branch] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { role: true, branchId: true } }),
    db.branch.findUnique({ where: { id: branchId }, select: { id: true, isActive: true } }),
  ]);
  if (!branch) throw new Error("Choose a valid branch.");
  if (!branch.isActive) throw new Error(INACTIVE_BRANCH_WRITE_ERROR);
  if (!user || (user.role !== "ADMIN" && !(user.role === "BRANCH_MANAGER" && user.branchId === branchId))) {
    throw new Error("Only an Admin or the Branch Manager for this branch can import sales.");
  }
}

export function groupLines(documents: SalesDocument[], rows: SalesExportRow[], stockAsOf: Date | null): SalesDocumentWithLines[] {
  const lineMap = new Map<string, SalesExportRow>();
  for (const row of rows) lineMap.set(row.lineKey, row);
  return documents.map((document) => ({
    ...document,
    lines: document.lineKeys.map((key) => lineMap.get(key)).filter((row): row is SalesExportRow => Boolean(row)),
    historyOnly: isHistoryOnlySalesDocument(document, stockAsOf),
  }));
}

function sortDocuments(documents: SalesDocumentWithLines[]): SalesDocumentWithLines[] {
  const ordered = documents.slice().sort((left, right) => left.businessDay.localeCompare(right.businessDay) || left.createdAt.localeCompare(right.createdAt) || left.documentNumber.localeCompare(right.documentNumber));
  const pending = new Map(ordered.map((document) => [document.documentNumber, document]));
  const sorted: SalesDocumentWithLines[] = [];
  while (pending.size) {
    const ready = ordered.filter((document) => pending.has(document.documentNumber) && (
      document.documentType !== "Refund" || !document.refNumber || !pending.has(document.refNumber)
    ));
    const next = ready.length ? ready[0] : ordered.find((document) => pending.has(document.documentNumber))!;
    pending.delete(next.documentNumber);
    sorted.push(next);
  }
  return sorted;
}

async function previewSalesWith(db: Db, input: SalesPreviewInput, resolveActor: () => Promise<string | null>) {
  const actorId = await resolveActor();
  if (!actorId || actorId !== input.userId) throw new Error("You must be signed in to preview a sales import.");
  await assertActor(db, input.branchId, actorId);
  const fileSha256 = hash(input.buffer);
  let existingRun = await db.importRun.findFirst({ where: { branchId: input.branchId, kind: "SALES", fileSha256 } });
  if (existingRun?.status === "COMMITTED") throw runDuplicate(existingRun, true);
  if (existingRun?.status === "COMMITTING") {
    const counts = jsonObject(existingRun.counts);
    return { status: "COMMITTING" as const, run: existingRun, resume: { processed: Number(counts.completedDocuments ?? 0), total: Number(counts.totalDocuments ?? 0) } };
  }
  if (existingRun?.status === "UNDONE") existingRun = null;

  const parsed = await parseSalesExport(input.buffer, input.filename);
  const [imported, links, stockRun] = await Promise.all([
    db.sale.findMany({ where: { branchId: input.branchId, sourceDocumentNumber: { in: parsed.documents.map((document) => document.documentNumber) } }, select: { sourceDocumentNumber: true } }),
    db.aroniumProductLink.findMany({ where: { aroniumCode: { in: parsed.rows.map((row) => row.code) } }, select: { aroniumCode: true } }),
    db.importRun.findFirst({ where: { branchId: input.branchId, kind: "STOCK", status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { asOf: true } }),
  ]);
  const refNumbers = parsed.documents.filter((document) => document.documentType === "Refund" && document.refNumber).map((document) => document.refNumber!);
  const originalSales = refNumbers.length
    ? await db.sale.findMany({ where: { branchId: input.branchId, sourceDocumentNumber: { in: refNumbers }, isRefund: false }, select: { sourceDocumentNumber: true } })
    : [];
  const preview = buildSalesImportPreview({
    parsed,
    importedDocumentNumbers: new Set(imported.map((sale) => sale.sourceDocumentNumber).filter((value): value is string => Boolean(value))),
    catalogCodes: new Set(links.map((link) => link.aroniumCode)),
    originalDocumentNumbers: new Set(originalSales.map((sale) => sale.sourceDocumentNumber).filter((value): value is string => Boolean(value))),
    stockAsOf: stockRun?.asOf ?? null,
  });

  const previewCounts = preview.counts as unknown as Prisma.InputJsonValue;
  const run = existingRun
    ? await db.importRun.update({ where: { id: existingRun.id }, data: { filename: input.filename, counts: previewCounts } })
    : await db.importRun.create({ data: { kind: "SALES", branchId: input.branchId, filename: input.filename, fileSha256, uploadedById: actorId, status: "PREVIEW", counts: previewCounts } });
  return { status: "PREVIEW" as const, run, preview };
}

function asDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function itemSubtotal(subtotal: Prisma.Decimal, allocated: number, totalUnits: number, isLast: boolean, running: Prisma.Decimal) {
  return isLast ? subtotal.minus(running) : subtotal.times(allocated).div(totalUnits).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

type VariantSnapshot = { variantId: string; packSize: number; mode: "PACK" | "UNIT" };
type BatchSnapshot = { id: string; variantId: string; batchNumber: string | null; quantityRemaining: number; expiryDate: Date; expiryDateKnown: boolean };
type SaleItemSnapshot = { variantId: string; batchId: string | null; quantityUnits: number; unallocatedUnits: number };
type SaleSnapshot = { id: string; sourceDocumentNumber: string | null; isRefund: boolean; items: SaleItemSnapshot[] };
type SalesChunkContext = {
  importedDocuments: Set<string>;
  variantsByCode: Map<string, VariantSnapshot>;
  batchesById: Map<string, BatchSnapshot>;
  originalSales: Map<string, SaleSnapshot>;
  returnedByBatch: Map<string, number>;
  returnBatchByKey: Map<string, BatchSnapshot>;
  queryCount: number;
};

async function prefetchSalesChunk(db: Db | Prisma.TransactionClient, run: ImportRun, documents: SalesDocumentWithLines[]): Promise<SalesChunkContext> {
  const codes = Array.from(new Set(documents.flatMap((document) => document.lines.map((line) => line.code))));
  const documentNumbers = Array.from(new Set(documents.map((document) => document.documentNumber)));
  const refs = Array.from(new Set(documents.map((document) => document.refNumber).filter((value): value is string => Boolean(value))));
  const links = await db.aroniumProductLink.findMany({
    where: { aroniumCode: { in: codes } },
    select: { aroniumCode: true, variantId: true, mode: true, variant: { select: { packSize: true, branchPrices: { where: { branchId: run.branchId }, select: { id: true } } } } },
  });
  const variantIds = Array.from(new Set(links.map((link) => link.variantId)));
  const batches = variantIds.length
    ? await db.batch.findMany({ where: { branchId: run.branchId, variantId: { in: variantIds } }, select: { id: true, variantId: true, batchNumber: true, quantityRemaining: true, expiryDate: true, expiryDateKnown: true } })
    : [];
  const salesToFind = Array.from(new Set([...documentNumbers, ...refs]));
  const foundSales = salesToFind.length
    ? await db.sale.findMany({ where: { branchId: run.branchId, sourceDocumentNumber: { in: salesToFind } }, select: { id: true, sourceDocumentNumber: true, isRefund: true, items: { select: { variantId: true, batchId: true, quantityUnits: true, unallocatedUnits: true } } } })
    : [];
  const priorRefunds = refs.length
    ? await db.sale.findMany({ where: { branchId: run.branchId, refDocumentNumber: { in: refs }, isRefund: true }, select: { refDocumentNumber: true, items: { select: { variantId: true, batchId: true, quantityUnits: true, unallocatedUnits: true } } } })
    : [];
  const variantsByCode = new Map<string, VariantSnapshot>(links.map((link) => [link.aroniumCode, { variantId: link.variantId, packSize: link.variant.packSize, mode: link.mode }]));
  const importedDocuments = new Set(foundSales.map((sale) => sale.sourceDocumentNumber).filter((value): value is string => documentNumbers.includes(value ?? "")));
  const originalSales = new Map(foundSales.filter((sale) => !sale.isRefund && sale.sourceDocumentNumber).map((sale) => [sale.sourceDocumentNumber!, sale]));
  const returnedByBatch = new Map<string, number>();
  const originalIdByDocument = new Map(foundSales.filter((sale) => !sale.isRefund && sale.sourceDocumentNumber).map((sale) => [sale.sourceDocumentNumber!, sale.id]));
  for (const refund of priorRefunds) for (const item of refund.items) {
    const originalId = refund.refDocumentNumber ? originalIdByDocument.get(refund.refDocumentNumber) : null;
    if (originalId && item.batchId && item.quantityUnits < 0) {
      const key = `${originalId}|${item.batchId}`;
      returnedByBatch.set(key, (returnedByBatch.get(key) ?? 0) + Math.abs(item.quantityUnits));
    }
  }
  const batchesById = new Map(batches.map((batch) => [batch.id, { ...batch }]));
  const returnBatchByKey = new Map<string, BatchSnapshot>();
  for (const batch of batches) {
    if (batch.batchNumber?.startsWith("RETURN-")) returnBatchByKey.set(`${batch.variantId}|${batch.batchNumber}`, { ...batch });
  }
  return { importedDocuments, variantsByCode, batchesById, originalSales, returnedByBatch, returnBatchByKey, queryCount: 1 + Number(variantIds.length > 0) + Number(salesToFind.length > 0) + Number(refs.length > 0) };
}

async function commitDocument(tx: Prisma.TransactionClient, input: {
  run: ImportRun;
  actorId: string;
  document: SalesDocumentWithLines;
  todayKey: string;
  context: SalesChunkContext;
}) {
  const { run, actorId, document, todayKey, context } = input;
  if (context.importedDocuments.has(document.documentNumber)) {
    return { imported: false, unallocatedUnits: 0, returnBatchLines: 0, missingOriginal: 0, queryCount: 0 };
  }

  const original = document.documentType === "Refund" && document.refNumber ? context.originalSales.get(document.refNumber) ?? null : null;
  const missingCodes = Array.from(new Set(document.lines.map((row) => row.code).filter((code) => !context.variantsByCode.has(code))));
  let queryCount = 0;
  if (missingCodes.length) {
    const firstRowByCode = new Map<string, SalesExportRow>();
    for (const row of document.lines) if (!firstRowByCode.has(row.code)) firstRowByCode.set(row.code, row);
    const newVariants = missingCodes.map((code) => {
      const row = firstRowByCode.get(code)!;
      return { id: randomUUID(), brandName: row.product, packSize: 1, unitLabel: row.uom || "unit", allowsLooseSale: false };
    });
    await tx.variant.createMany({ data: newVariants });
    queryCount += 1;
    const links = missingCodes.map((code, index) => ({ aroniumCode: code, variantId: newVariants[index].id, mode: "PACK" as const, createdById: actorId }));
    await tx.aroniumProductLink.createMany({ data: links });
    queryCount += 1;
    missingCodes.forEach((code, index) => context.variantsByCode.set(code, { variantId: newVariants[index].id, packSize: 1, mode: "PACK" }));
  }
  const resolvedLines: Array<{ row: SalesExportRow; variantId: string; packSize: number; mode: "PACK" | "UNIT"; unitQuantity: number }> = [];
  for (const row of document.lines) {
    const product = context.variantsByCode.get(row.code)!;
    const sign = Math.sign(row.quantity);
    const units = Math.abs(row.quantity) * (product.mode === "PACK" ? product.packSize : 1);
    resolvedLines.push({ row, variantId: product.variantId, packSize: product.packSize, mode: product.mode, unitQuantity: sign * units });
  }

  const saleItems: Array<{ variantId: string; batchId: string | null; saleMode: "PACK" | "UNIT"; quantityUnits: number; unallocatedUnits: number; unitPriceAtSale: Prisma.Decimal; subtotal: Prisma.Decimal }> = [];
  let unallocatedUnits = 0;
  let returnBatchLines = 0;
  const stockAffected = !document.historyOnly;
  const previousOriginalItems = original?.items ?? [];
  const refund = document.documentType === "Refund";

  for (const line of resolvedLines) {
    const signedUnits = line.unitQuantity;
    const magnitude = Math.abs(signedUnits);
    const sign = refund ? -1 : signedUnits < 0 ? -1 : 1;
    const lineSubtotal = asDecimal(refund ? -Math.abs(line.row.subtotal) : line.row.subtotal);
    const allocations: Array<{ batchId: string | null; units: number; unallocatedUnits: number }> = [];

    if (!stockAffected || (document.documentType === "Sales" && signedUnits <= 0)) {
      allocations.push({ batchId: null, units: magnitude, unallocatedUnits: 0 });
    } else if (!refund) {
      const available = Array.from(context.batchesById.values()).filter((batch) => batch.variantId === line.variantId);
      for (const chunk of allocateFefoBatches(magnitude, available, todayKey)) {
        if (chunk.batchId) {
          const changed = await tx.batch.updateMany({ where: { id: chunk.batchId, quantityRemaining: { gte: chunk.units } }, data: { quantityRemaining: { decrement: chunk.units } } });
          queryCount += 1;
          if (changed.count === 1) {
            allocations.push(chunk);
            context.batchesById.get(chunk.batchId)!.quantityRemaining -= chunk.units;
          } else {
            allocations.push({ batchId: null, units: chunk.units, unallocatedUnits: chunk.units });
            unallocatedUnits += chunk.units;
          }
        } else {
          allocations.push(chunk);
          unallocatedUnits += chunk.unallocatedUnits;
        }
      }
    } else {
      const originalLines = previousOriginalItems.filter((item) => item.variantId === line.variantId);
      const originalBatchLines = originalLines.filter((item) => item.batchId && item.quantityUnits > 0);
      const originalHasAllocatedBatch = originalBatchLines.length > 0;
      const originalHasOnlyUnallocated = originalLines.length > 0 && originalLines.every((item) => !item.batchId && item.unallocatedUnits > 0);
      let remaining = magnitude;

      if (!original || (!originalLines.length && !originalHasAllocatedBatch)) {
        const returnDate = getMalawiDateKey(new Date(document.createdAt));
        const returnKey = `${line.variantId}|RETURN-${returnDate}`;
        let returnBatch = context.returnBatchByKey.get(returnKey);
        if (returnBatch) {
          await tx.batch.update({ where: { id: returnBatch.id }, data: { quantityRemaining: { increment: remaining }, quantityReceived: { increment: Math.ceil(remaining / line.packSize) } } });
          returnBatch.quantityRemaining += remaining;
          queryCount += 1;
        } else {
          const created = await tx.batch.create({
            data: { branchId: run.branchId, variantId: line.variantId, batchNumber: `RETURN-${returnDate}`, quantityReceived: Math.ceil(remaining / line.packSize), quantityRemaining: remaining, expiryDate: RETURN_EXPIRY, expiryDateKnown: false, receivedAt: new Date(document.createdAt), receivedById: actorId },
            select: { id: true },
          });
          returnBatch = { id: created.id, variantId: line.variantId, batchNumber: `RETURN-${returnDate}`, quantityRemaining: remaining, expiryDate: RETURN_EXPIRY, expiryDateKnown: false };
          context.returnBatchByKey.set(returnKey, returnBatch);
          queryCount += 1;
        }
        allocations.push({ batchId: returnBatch.id, units: remaining, unallocatedUnits: 0 });
        returnBatchLines += 1;
        remaining = 0;
      } else if (originalHasAllocatedBatch) {
        const originallyTakenByBatch = new Map<string, number>();
        for (const item of originalBatchLines) originallyTakenByBatch.set(item.batchId!, (originallyTakenByBatch.get(item.batchId!) ?? 0) + item.quantityUnits);
        for (const [batchId, originallyTaken] of Array.from(originallyTakenByBatch.entries())) {
          if (!remaining) break;
          const returnLedgerKey = `${original.id}|${batchId}`;
          const availableReturn = Math.max(0, originallyTaken - (context.returnedByBatch.get(returnLedgerKey) ?? 0));
          const quantity = Math.min(remaining, availableReturn);
          if (!quantity) continue;
          await tx.batch.update({ where: { id: batchId }, data: { quantityRemaining: { increment: quantity } } });
          queryCount += 1;
          const batch = context.batchesById.get(batchId);
          if (batch) batch.quantityRemaining += quantity;
          allocations.push({ batchId, units: quantity, unallocatedUnits: 0 });
          context.returnedByBatch.set(returnLedgerKey, (context.returnedByBatch.get(returnLedgerKey) ?? 0) + quantity);
          remaining -= quantity;
        }
      } else if (originalHasOnlyUnallocated) {
        allocations.push({ batchId: null, units: remaining, unallocatedUnits: 0 });
        remaining = 0;
      }

      if (remaining > 0) allocations.push({ batchId: null, units: remaining, unallocatedUnits: 0 });
    }

    if (!allocations.length) allocations.push({ batchId: null, units: 0, unallocatedUnits: 0 });
    let subtotalAssigned = new Prisma.Decimal(0);
    for (let index = 0; index < allocations.length; index += 1) {
      const allocation = allocations[index];
      const subtotal = itemSubtotal(lineSubtotal, allocation.units, Math.max(magnitude, 1), index === allocations.length - 1, subtotalAssigned);
      subtotalAssigned = subtotalAssigned.plus(subtotal);
      saleItems.push({
        variantId: line.variantId,
        batchId: allocation.batchId,
        saleMode: line.mode,
        quantityUnits: sign * allocation.units,
        unallocatedUnits: allocation.unallocatedUnits,
        unitPriceAtSale: allocation.units > 0 ? subtotal.div(allocation.units) : new Prisma.Decimal(0),
        subtotal,
      });
    }
  }

  const subtotalAmount = asDecimal(refund ? -Math.abs(document.subtotalAmount) : document.subtotalAmount);
  const totalAmount = asDecimal(refund ? -Math.abs(document.totalAmount) : document.totalAmount);
  const sale = await tx.sale.create({
    data: {
      branchId: run.branchId,
      soldById: actorId,
      paymentMethod: "UNKNOWN",
      subtotalAmount,
      discountAmount: new Prisma.Decimal(0),
      membershipDiscountPercent: new Prisma.Decimal(0),
      totalAmount,
      importRunId: run.id,
      sourceDocumentNumber: document.documentNumber,
      refDocumentNumber: refund ? document.refNumber : null,
      isRefund: refund,
      stockAffected,
      sourceCashier: document.user,
      createdAt: new Date(document.createdAt),
      items: { createMany: { data: saleItems } },
    },
    select: { id: true },
  });
  queryCount += 1;
  context.importedDocuments.add(document.documentNumber);
  if (!refund) {
    context.originalSales.set(document.documentNumber, { id: sale.id, sourceDocumentNumber: document.documentNumber, isRefund: false, items: saleItems.map((item) => ({ variantId: item.variantId, batchId: item.batchId, quantityUnits: item.quantityUnits, unallocatedUnits: item.unallocatedUnits })) });
  }
  return { imported: true, unallocatedUnits, returnBatchLines, missingOriginal: refund && !original ? 1 : 0, queryCount };
}

export type SalesCommitOptions = {
  timeLimitMs?: number;
  onDocumentCommitted?: (index: number) => void | Promise<void>;
  onChunkCommitted?: (progress: { chunk: number; processedDocuments: number; totalDocuments: number; queryCount: number }) => void | Promise<void>;
};

async function commitSalesWith(db: Db, runId: string, buffer: FileBuffer, resolveActor: () => Promise<string | null>, options: SalesCommitOptions = {}): Promise<SalesSliceResult> {
  const run = await db.importRun.findUnique({ where: { id: runId } });
  if (!run || run.kind !== "SALES") throw new Error("Sales import run was not found.");
  if (hash(buffer) !== run.fileSha256) throw new Error("The uploaded file does not match this import preview.");
  if (run.status === "COMMITTED") {
    const counts = jsonObject(run.counts);
    return { processed: Number(counts.totalDocuments ?? 0), total: Number(counts.totalDocuments ?? 0), done: true, counts };
  }
  if (run.status === "UNDONE") throw new Error("This import run has been undone and cannot be committed.");
  const actorId = await resolveActor();
  if (!actorId) throw new Error("You must be signed in to commit a sales import.");
  await assertActor(db, run.branchId, actorId);
  if (run.status === "PREVIEW") {
    const changed = await db.importRun.updateMany({ where: { id: run.id, status: "PREVIEW" }, data: { status: "COMMITTING" } });
    if (!changed.count) {
      const current = await db.importRun.findUniqueOrThrow({ where: { id: run.id } });
      if (current.status !== "COMMITTING") throw new Error("This import run is no longer available to commit.");
    }
  }

  const parsed = await parseSalesExport(buffer, run.filename);
  const stockRun = await db.importRun.findFirst({ where: { branchId: run.branchId, kind: "STOCK", status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { asOf: true } });
  const documents = sortDocuments(groupLines(parsed.documents, parsed.rows, stockRun?.asOf ?? null));
  const persisted = jsonObject(run.counts);
  const documentGroups: SalesDocumentWithLines[][] = [];
  for (let start = 0; start < documents.length; start += DOCUMENT_CHUNK_SIZE) documentGroups.push(documents.slice(start, start + DOCUMENT_CHUNK_SIZE));
  const completedBefore = Number(persisted.completedDocuments ?? 0);
  const startAt = Math.min(Math.floor(completedBefore / DOCUMENT_CHUNK_SIZE), documentGroups.length);
  const counters: Record<string, unknown> = {
    ...persisted,
    totalDocuments: documents.length,
    completedDocuments: completedBefore,
    importedDocuments: Number(persisted.importedDocuments ?? 0),
    alreadyImportedDocuments: Number(persisted.alreadyImportedDocuments ?? 0),
    historyOnlyDocuments: documents.filter((document) => document.historyOnly).length,
    refundsWithoutOriginal: Number(persisted.refundsWithoutOriginal ?? 0),
    returnBatchLines: Number(persisted.returnBatchLines ?? 0),
    unallocatedUnits: Number(persisted.unallocatedUnits ?? 0),
  };
  const sliceStartedAt = Date.now();
  const slice = await processChunkSlice({
    chunks: documentGroups,
    startAt,
    timeLimitMs: options.timeLimitMs ?? DOCUMENT_SLICE_MS,
    async processChunk(documentChunk, chunkIndex) {
      let queryCount = 0;
      let processedAnyDocument = false;
      for (let offset = 0; offset < documentChunk.length; offset += 1) {
        const document = documentChunk[offset];
        const globalIndex = chunkIndex * DOCUMENT_CHUNK_SIZE + offset;
        if (globalIndex < completedBefore) continue;
        if (processedAnyDocument && Date.now() - sliceStartedAt >= (options.timeLimitMs ?? DOCUMENT_SLICE_MS)) return false;
        const transactionResult = await db.$transaction(async (tx) => {
          if (!(await lockActiveBranch(tx, run.branchId))) throw new Error(INACTIVE_BRANCH_WRITE_ERROR);
          await lockImportBranch(tx, run.branchId);
          const context = await prefetchSalesChunk(tx, run, [document]);
          const result = await commitDocument(tx, { run, actorId, document, todayKey: getMalawiDateKey(new Date()), context });
          const next = { ...counters };
          if (result.imported) next.importedDocuments = Number(next.importedDocuments) + 1;
          else next.alreadyImportedDocuments = Number(next.alreadyImportedDocuments) + 1;
          next.refundsWithoutOriginal = Number(next.refundsWithoutOriginal) + result.missingOriginal;
          next.returnBatchLines = Number(next.returnBatchLines) + result.returnBatchLines;
          next.unallocatedUnits = Number(next.unallocatedUnits) + result.unallocatedUnits;
          next.completedDocuments = globalIndex + 1;
          await tx.importRun.update({ where: { id: run.id }, data: { counts: { ...next, completedChunks: chunkIndex, completedDocuments: globalIndex + 1 } as Prisma.InputJsonValue } });
          return { result, next, contextQueryCount: context.queryCount };
        }, { timeout: 30_000, maxWait: 10_000 });
        Object.assign(counters, transactionResult.next);
        queryCount += transactionResult.result.queryCount + 1;
        queryCount += 1 + transactionResult.contextQueryCount;
        processedAnyDocument = true;
        await options.onDocumentCommitted?.(globalIndex + 1);
      }
      await options.onChunkCommitted?.({
        chunk: chunkIndex + 1,
        processedDocuments: Math.min((chunkIndex + 1) * DOCUMENT_CHUNK_SIZE, documents.length),
        totalDocuments: documents.length,
        queryCount,
      });
      return true;
    },
  });

  const processedDocuments = Math.min(Number(counters.completedDocuments), documents.length);
  if (!slice.done) return { processed: processedDocuments, total: documents.length, done: false };
  const finalCounts = { ...counters, completedDocuments: documents.length, completedChunks: documents.length };
  await db.$transaction(async (tx) => {
    if (!(await lockActiveBranch(tx, run.branchId))) throw new Error(INACTIVE_BRANCH_WRITE_ERROR);
    await tx.importRun.update({ where: { id: run.id }, data: { status: "COMMITTED", committedAt: new Date(), counts: finalCounts as Prisma.InputJsonValue } });
    await tx.auditLog.create({ data: { action: "IMPORT_COMMITTED", branchId: run.branchId, userId: actorId, details: { importRunId: run.id, kind: "SALES", ...finalCounts } } });
  }, { timeout: 30_000, maxWait: 10_000 });
  return { processed: documents.length, total: documents.length, done: true, counts: finalCounts };
}

export function createSalesImportService(db: Db = prisma, resolveActor: () => Promise<string | null> = actorIdFromSession) {
  return {
    createPreview: (input: SalesPreviewInput) => previewSalesWith(db, input, resolveActor),
    commitSlice: (runId: string, buffer: FileBuffer, timeLimitMs?: number) => commitSalesWith(db, runId, buffer, resolveActor, { timeLimitMs }),
    commitSliceWithOptions: (runId: string, buffer: FileBuffer, options?: SalesCommitOptions) => commitSalesWith(db, runId, buffer, resolveActor, options),
  };
}

const service = createSalesImportService();
export const createSalesPreview = service.createPreview;
export const commitSalesSlice = service.commitSlice;
