import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { createStockImportService } from "./stock-import-service.ts";
import { createSalesImportService } from "./sales-import-service.ts";

const testUrl = requireTestDatabaseUrl();
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } }, log: [{ emit: "event", level: "query" }] });
let observedQueryCount = 0;
prisma.$on("query", () => { observedQueryCount += 1; });
let lastLoggedQueryCount = 0;
const stockService = createStockImportService(prisma, async () => process.env.TEST_ACTOR_ID ?? null);

async function workbook(headers, rows) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Sales");
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await book.xlsx.writeBuffer());
}

function headers() {
  return ["Document type", "Date", "Create date", "Document number", "Ref. number", "Code", "Product", "Quantity", "UOM", "Total before tax", "Total"];
}

async function setup() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const branch = await prisma.branch.create({ data: { name: `Sales Import ${suffix}` } });
  const user = await prisma.user.create({ data: { name: "Import Manager", email: `sales-import-${suffix}@test.local`, passwordHash: "test", role: "BRANCH_MANAGER", branchId: branch.id } });
  process.env.TEST_ACTOR_ID = user.id;
  const salesService = createSalesImportService(prisma, async () => user.id);
  return { branch, user, suffix, salesService };
}

async function createStock(context, productCode, options = {}) {
  const buffer = await workbook(["No.", "code", "group", "name", "qty", "uom", "cost", "cost incl tax", "total", "total incl tax"], [
    [1, productCode, "", `Product ${productCode}`, options.quantity ?? 10, "pack", 100, 100, 1000, 1000],
  ]);
  const result = await stockService.createPreview({ branchId: context.branch.id, userId: context.user.id, filename: `stock-${context.suffix}.xlsx`, buffer, asOf: new Date(options.asOf ?? "2026-10-01T08:00:00.000Z") });
  await stockService.commitImport(result.run.id, buffer);
  const link = await prisma.aroniumProductLink.findUniqueOrThrow({ where: { aroniumCode: productCode }, include: { variant: true } });
  return { run: result.run, link };
}

async function importSales(context, buffer, filename = "sales.xlsx") {
  const result = await context.salesService.createPreview({ branchId: context.branch.id, userId: context.user.id, filename, buffer });
  return result;
}

async function commitFully(context, run, buffer) {
  let result;
  do {
    lastLoggedQueryCount = observedQueryCount;
    result = await context.salesService.commitSliceWithOptions(run.id, buffer, {
      timeLimitMs: 8_000,
      onChunkCommitted(progress) {
        const actualQueries = observedQueryCount - lastLoggedQueryCount;
        lastLoggedQueryCount = observedQueryCount;
        console.log(`sales import chunk ${progress.chunk}: ${actualQueries} SQL queries (${progress.queryCount} service calls counted)`);
      },
    });
  } while (!result.done);
  return result;
}

async function cleanup(context) {
  if (!context) return;
  try {
    const saleIds = await prisma.sale.findMany({ where: { branchId: context.branch.id }, select: { id: true } });
    await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds.map((sale) => sale.id) } } });
    await prisma.auditLog.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.sale.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.batch.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.branchPrice.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.importRun.deleteMany({ where: { branchId: context.branch.id } });
    const links = await prisma.aroniumProductLink.findMany({ where: { createdById: context.user.id }, select: { variantId: true } });
    await prisma.aroniumProductLink.deleteMany({ where: { createdById: context.user.id } });
    const variantIds = Array.from(new Set(links.map((link) => link.variantId)));
    if (variantIds.length) await prisma.variant.deleteMany({ where: { id: { in: variantIds } } });
    await prisma.user.deleteMany({ where: { id: context.user.id } });
    await prisma.branch.deleteMany({ where: { id: context.branch.id } });
  } catch (error) {
    console.error("Sales import test cleanup failed:", error);
  }
}

test("sales import allocates across opening-stock batches in FEFO order", async () => {
  const context = await setup();
  try {
    const { link } = await createStock(context, `fefo-${context.suffix}`);
    const first = await prisma.batch.findFirstOrThrow({ where: { branchId: context.branch.id, variantId: link.variantId, importRunId: { not: null } } });
    await prisma.batch.update({ where: { id: first.id }, data: { expiryDate: new Date("2026-11-01T00:00:00Z"), expiryDateKnown: true, quantityRemaining: 3 } });
    const second = await prisma.batch.create({ data: { branchId: context.branch.id, variantId: link.variantId, batchNumber: "LATER", quantityReceived: 10, quantityRemaining: 10, expiryDate: new Date("2027-01-01T00:00:00Z"), receivedById: context.user.id } });
    const buffer = await workbook(headers(), [["Sales", new Date("2026-10-13T00:00:00Z"), "13/10/2026 09:00:00", `SALE-${context.suffix}-1`, "", `fefo-${context.suffix}`, "Product", "8", "pack", 800, 800]]);
    const preview = await importSales(context, buffer);
    await commitFully(context, preview.run, buffer);
    const items = await prisma.saleItem.findMany({ where: { sale: { branchId: context.branch.id } }, orderBy: { batchId: "asc" } });
    const quantities = new Map(items.map((item) => [item.batchId, item.quantityUnits]));
    assert.equal(quantities.get(first.id), 3);
    assert.equal(quantities.get(second.id), 5);
    assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: second.id } })).quantityRemaining, 5);
  } finally { await cleanup(context); }
});

test("same file is a no-op and overlapping re-export imports only new documents", async () => {
  const context = await setup();
  try {
    await createStock(context, `repeat-${context.suffix}`);
    const saleA = ["Sales", new Date("2026-10-13T00:00:00Z"), "13/10/2026 09:00:00", `A-${context.suffix}`, "", `repeat-${context.suffix}`, "Product", "1", "pack", 100, 100];
    const saleB = ["Sales", new Date("2026-10-13T00:00:00Z"), "13/10/2026 09:10:00", `B-${context.suffix}`, "", `repeat-${context.suffix}`, "Product", "1", "pack", 100, 100];
    const firstFile = await workbook(headers(), [saleA]);
    const first = await importSales(context, firstFile, `first-${context.suffix}.xlsx`);
    await commitFully(context, first.run, firstFile);
    await assert.rejects(() => importSales(context, firstFile, `first-${context.suffix}.xlsx`), /already imported/);

    const overlap = await workbook(headers(), [saleA, saleB]);
    const second = await importSales(context, overlap, `overlap-${context.suffix}.xlsx`);
    assert.equal(second.preview.counts.alreadyImportedDocuments, 1);
    assert.equal(second.preview.counts.newDocuments, 1);
    await commitFully(context, second.run, overlap);
    assert.equal(await prisma.sale.count({ where: { branchId: context.branch.id, sourceDocumentNumber: { in: [saleA[3], saleB[3]] } } }), 2);
  } finally { await cleanup(context); }
});

test("refund restores original allocated batch and missing original goes to RETURN batch", async () => {
  const context = await setup();
  try {
    const { link } = await createStock(context, `refund-${context.suffix}`, { quantity: 8 });
    const batch = await prisma.batch.findFirstOrThrow({ where: { branchId: context.branch.id, variantId: link.variantId, importRunId: { not: null } } });
    const originalDoc = `ORIG-${context.suffix}`;
    const saleBuffer = await workbook(headers(), [["Sales", new Date("2026-10-13T00:00:00Z"), "13/10/2026 09:00:00", originalDoc, "", `refund-${context.suffix}`, "Product", "3", "pack", 300, 300]]);
    const salePreview = await importSales(context, saleBuffer);
    await commitFully(context, salePreview.run, saleBuffer);
    const refundBuffer = await workbook(headers(), [["Refund", new Date("2026-10-14T00:00:00Z"), "14/10/2026 09:00:00", `REF-${context.suffix}`, originalDoc, `refund-${context.suffix}`, "Product", "-2", "pack", -200, -200]]);
    const refundPreview = await importSales(context, refundBuffer, `refund-${context.suffix}.xlsx`);
    await commitFully(context, refundPreview.run, refundBuffer);
    assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).quantityRemaining, 7);

    const missingBuffer = await workbook(headers(), [["Refund", new Date("2026-10-15T00:00:00Z"), "15/10/2026 09:00:00", `MISS-${context.suffix}`, "OLD-ORIGINAL", `refund-${context.suffix}`, "Product", "-1", "pack", -100, -100]]);
    const missing = await importSales(context, missingBuffer, `missing-${context.suffix}.xlsx`);
    await commitFully(context, missing.run, missingBuffer);
    assert.equal(await prisma.batch.count({ where: { branchId: context.branch.id, variantId: link.variantId, batchNumber: { startsWith: "RETURN-" }, expiryDateKnown: false } }), 1);
  } finally { await cleanup(context); }
});

test("history-only sales do not consume stock; shortfalls are stored unallocated; resumed chunks do not duplicate", async () => {
  const context = await setup();
  try {
    const { link, run: stockRun } = await createStock(context, `short-${context.suffix}`, { quantity: 2, asOf: "2026-10-15T12:00:00.000Z" });
    const batch = await prisma.batch.findFirstOrThrow({ where: { branchId: context.branch.id, variantId: link.variantId, importRunId: stockRun.id } });
    const old = ["Sales", new Date("2026-10-14T00:00:00Z"), "14/10/2026 09:00:00", `OLD-${context.suffix}`, "", `short-${context.suffix}`, "Product", "1", "pack", 100, 100];
    const sameDayBefore = ["Sales", new Date("2026-10-15T00:00:00Z"), "15/10/2026 13:59:00", `BEFORE-${context.suffix}`, "", `short-${context.suffix}`, "Product", "1", "pack", 100, 100];
    const sameDayAfter = ["Sales", new Date("2026-10-15T00:00:00Z"), "15/10/2026 14:01:00", `AFTER-${context.suffix}`, "", `short-${context.suffix}`, "Product", "1", "pack", 100, 100];
    const large = ["Sales", new Date("2026-10-16T00:00:00Z"), "16/10/2026 09:00:00", `LARGE-${context.suffix}`, "", `short-${context.suffix}`, "Product", "5", "pack", 500, 500];
    const data = await workbook(headers(), [old, sameDayBefore, sameDayAfter, large]);
    const preview = await importSales(context, data, `slice-${context.suffix}.xlsx`);
    assert.equal(preview.preview.counts.historyOnlyDocuments, 2);
    await assert.rejects(() => context.salesService.commitSliceWithOptions(preview.run.id, data, {
      timeLimitMs: 0,
      onDocumentCommitted(documentIndex) { if (documentIndex === 1) throw new Error("simulated crash"); },
    }), /simulated crash/);
    const run = await prisma.importRun.findUniqueOrThrow({ where: { id: preview.run.id } });
    let resumed;
    do { resumed = await context.salesService.commitSlice(run.id, data, 8_000); } while (!resumed.done);
    assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).quantityRemaining, 0);
    const largeSale = await prisma.sale.findFirstOrThrow({ where: { sourceDocumentNumber: large[3], branchId: context.branch.id }, include: { items: true } });
    assert.equal(largeSale.items.reduce((sum, item) => sum + item.unallocatedUnits, 0), 4);
    assert.equal(await prisma.sale.count({ where: { branchId: context.branch.id, sourceDocumentNumber: { in: [old[3], sameDayBefore[3]] }, stockAffected: false } }), 2);
    assert.equal(await prisma.sale.count({ where: { branchId: context.branch.id, sourceDocumentNumber: sameDayAfter[3], stockAffected: true } }), 1);
  } finally { await cleanup(context); }
});

test.after(async () => { await prisma.$disconnect(); });
