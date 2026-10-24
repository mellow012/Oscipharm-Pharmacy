import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { createStockImportService } from "./stock-import-service.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } }, log: [{ emit: "event", level: "query" }] });
let observedQueryCount = 0;
prisma.$on("query", () => { observedQueryCount += 1; });
let lastLoggedQueryCount = 0;

async function createWorkbook(rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Stock");
  rows.forEach((row, index) => {
    worksheet.addRow([
      index + 1,
      row.code,
      row.group ?? "(none)",
      row.name,
      row.quantity,
      row.uom ?? "pack",
      row.unitCost ?? 100,
      (row.unitCost ?? 100) * row.quantity,
      (row.unitCost ?? 100) * row.quantity,
      (row.value ?? (row.unitCost ?? 100) * row.quantity),
      (row.value ?? (row.unitCost ?? 100) * row.quantity),
    ]);
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function setup() {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const branch = await prisma.branch.create({ data: { name: `Import Test ${unique}` } });
  const user = await prisma.user.create({
    data: {
      name: `Import Manager ${unique}`,
      email: `import-manager-${unique}@local.test`,
      passwordHash: "test-only",
      role: "BRANCH_MANAGER",
      branchId: branch.id,
    },
  });
  return { branch, user, unique, service: createStockImportService(prisma, async () => user.id) };
}

async function cleanup(context) {
  if (!context) return;
  try {
    const links = await prisma.aroniumProductLink.findMany({
      where: { createdById: context.user.id },
      select: { variantId: true },
    });
    const variantIds = [...new Set(links.map((link) => link.variantId))];
    await prisma.auditLog.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.batch.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.branchPrice.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.importRun.deleteMany({ where: { branchId: context.branch.id } });
    await prisma.aroniumProductLink.deleteMany({ where: { createdById: context.user.id } });
    if (variantIds.length) await prisma.variant.deleteMany({ where: { id: { in: variantIds } } });
    await prisma.user.deleteMany({ where: { id: context.user.id } });
    await prisma.branch.deleteMany({ where: { id: context.branch.id } });
  } catch (error) {
    console.error("Stock import test cleanup failed:", error);
  }
}

async function preview(context, buffer) {
  return context.service.createPreview({
    branchId: context.branch.id,
    userId: context.user.id,
    filename: "stock.xlsx",
    buffer,
    asOf: new Date("2026-10-17T10:00:00.000Z"),
  });
}

test("stock import previews and commits counts with one audit entry", async () => {
  const context = await setup();
  try {
    const buffer = await createWorkbook([
      { code: "fresh-1", name: "Test Product One", quantity: 4, unitCost: 125, value: 600, group: "Pain Relief" },
      { code: "fresh-2", name: "Test Product Two", quantity: 2, unitCost: 50, value: 120 },
    ]);
    const result = await preview(context, buffer);
    assert.equal(result.status, "PREVIEW");
    assert.equal(result.preview.counts.newProducts, 2);
    assert.equal(result.preview.counts.existingProducts, 0);
    assert.equal(result.preview.counts.groupRows, 1);
    assert.deepEqual(result.preview.counts.totals, { quantity: 6, cost: 600, value: 720 });

    lastLoggedQueryCount = observedQueryCount;
    const committed = await context.service.commitImport(result.run.id, buffer, {
      onChunkCommitted(progress) {
        const actualQueries = observedQueryCount - lastLoggedQueryCount;
        lastLoggedQueryCount = observedQueryCount;
        console.log(`stock import chunk ${progress.chunk}: ${actualQueries} SQL queries (${progress.queryCount} service calls counted)`);
      },
    });
    assert.equal(committed.run.status, "COMMITTED");
    assert.equal(committed.counts.committedRows, 2);
    assert.equal(await prisma.batch.count({ where: { importRunId: result.run.id } }), 2);
    assert.equal(await prisma.auditLog.count({ where: { branchId: context.branch.id, action: "IMPORT_COMMITTED" } }), 1);
  } finally {
    await cleanup(context);
  }
});

test("same committed stock file is blocked on re-upload", async () => {
  const context = await setup();
  try {
    const buffer = await createWorkbook([{ code: "same-file", name: "Same File Product", quantity: 1 }]);
    const result = await preview(context, buffer);
    await context.service.commitImport(result.run.id, buffer);
    await assert.rejects(() => preview(context, buffer), /already imported on \d{4}-\d{2}-\d{2}/);
  } finally {
    await cleanup(context);
  }
});

test("stock import commit is rejected after its branch is deactivated", async () => {
  const context = await setup();
  try {
    const buffer = await createWorkbook([{ code: `inactive-${context.unique}`, name: "Inactive Branch Product", quantity: 2 }]);
    const result = await preview(context, buffer);
    await prisma.branch.update({ where: { id: context.branch.id }, data: { isActive: false } });
    await assert.rejects(() => context.service.commitImport(result.run.id, buffer), /inactive/i);
    assert.equal(await prisma.batch.count({ where: { importRunId: result.run.id } }), 0);
  } finally {
    await cleanup(context);
  }
});

test("resume after a committed first chunk does not duplicate batches", async () => {
  const context = await setup();
  try {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      code: `resume-${index}`,
      name: `Resume Product ${index}`,
      quantity: 1,
      unitCost: 10,
      value: 10,
    }));
    const buffer = await createWorkbook(rows);
    const result = await preview(context, buffer);
    await assert.rejects(
      () => context.service.commitImport(result.run.id, buffer, {
        onChunkCommitted(progress) {
          if (progress.chunk === 1) throw new Error("simulated crash after first chunk");
        },
      }),
      /simulated crash/,
    );
    assert.equal(await prisma.batch.count({ where: { importRunId: result.run.id } }), 50);
    let resumed;
    do {
      resumed = await context.service.commitImport(result.run.id, buffer);
    } while (!resumed.done);
    assert.equal(resumed.run.status, "COMMITTED");
    assert.equal(await prisma.batch.count({ where: { importRunId: result.run.id } }), 51);
    assert.equal(await prisma.auditLog.count({ where: { branchId: context.branch.id, action: "IMPORT_COMMITTED" } }), 1);
  } finally {
    await cleanup(context);
  }
});

test("existing Aronium link reuses its variant", async () => {
  const context = await setup();
  try {
    const variant = await prisma.variant.create({
      data: { brandName: `Existing ${context.unique}`, packSize: 1, unitLabel: "pack", allowsLooseSale: false },
    });
    await prisma.aroniumProductLink.create({
      data: { aroniumCode: `existing-${context.unique}`, variantId: variant.id, mode: "PACK", createdById: context.user.id },
    });
    const buffer = await createWorkbook([
      { code: `existing-${context.unique}`, name: `Existing ${context.unique}`, quantity: 3, value: 300 },
    ]);
    const result = await preview(context, buffer);
    assert.equal(result.preview.counts.existingProducts, 1);
    assert.equal(result.preview.counts.newProducts, 0);
    await context.service.commitImport(result.run.id, buffer);
    assert.equal(await prisma.variant.count({ where: { brandName: `Existing ${context.unique}` } }), 1);
    assert.equal(await prisma.batch.count({ where: { importRunId: result.run.id, variantId: variant.id } }), 1);
  } finally {
    await cleanup(context);
  }
});

test("zero-stock product gets a variant without a batch or price", async () => {
  const context = await setup();
  try {
    const buffer = await createWorkbook([{ code: "zero-stock", name: "Zero Stock Product", quantity: 0, value: 0 }]);
    const result = await preview(context, buffer);
    await context.service.commitImport(result.run.id, buffer);
    const link = await prisma.aroniumProductLink.findUnique({ where: { aroniumCode: "zero-stock" } });
    assert.ok(link);
    assert.equal(await prisma.batch.count({ where: { importRunId: result.run.id } }), 0);
    assert.equal(await prisma.branchPrice.count({ where: { variantId: link.variantId, branchId: context.branch.id } }), 0);
  } finally {
    await cleanup(context);
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
