import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { parseSalesExport } from "./sales-parser.ts";
import { buildSalesImportPreview, isHistoryOnlySalesDocument } from "./sales-import-preview.ts";

const fixture = path.resolve("features/inventory/lib/__fixtures__/sales-item-list.xlsx");

test("sales preview classifies imported/history documents, refunds, catalog codes and totals", async () => {
  const parsed = await parseSalesExport(fs.readFileSync(fixture));
  const preview = buildSalesImportPreview({
    parsed,
    importedDocumentNumbers: new Set(["26-200-000002"]),
    catalogCodes: new Set(["3", "4", "5", "1", "6"]),
    originalDocumentNumbers: new Set(["26-200-000001"]),
    stockAsOf: new Date("2026-10-14T01:25:00.000Z"),
  });

  assert.deepEqual(preview.documents.map(({ documentNumber, importStatus, historyOnly, originalFound }) => ({ documentNumber, importStatus, historyOnly, originalFound })), [
    { documentNumber: "26-200-000001", importStatus: "NEW", historyOnly: true, originalFound: null },
    { documentNumber: "26-200-000002", importStatus: "ALREADY_IMPORTED", historyOnly: true, originalFound: null },
    { documentNumber: "26-220-000001", importStatus: "NEW", historyOnly: true, originalFound: true },
    { documentNumber: "26-200-000003", importStatus: "NEW", historyOnly: true, originalFound: null },
  ]);
  assert.deepEqual(preview.newProducts, [{ code: "2", product: "Paracetamol 500mg x10", uom: "strip" }]);
  assert.equal(preview.counts.refundsWithOriginal, 1);
  assert.equal(preview.counts.refundsWithoutOriginal, 0);
  assert.deepEqual(preview.totals, { sales: 64680, refunds: -4080, net: 60600 });
  assert.equal(preview.counts.skippedRows, 0);
  assert.ok(preview.flaggedRows.every((row) => Array.isArray(row.flags)));
});

test("sales preview warns when opening-stock as-of is missing and flags external refund references", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales");
  sheet.addRow(["Document type", "Date", "Document number", "Ref. number", "Code", "Product", "Quantity", "UOM", "Total"]);
  sheet.addRow(["Refund", new Date("2026-10-15T00:00:00.000Z"), "R-1", "S-OLD", "0002", "Product", "-1", "pack", "-10"]);
  const parsed = await parseSalesExport(Buffer.from(await workbook.xlsx.writeBuffer()));
  const preview = buildSalesImportPreview({
    parsed,
    importedDocumentNumbers: new Set(),
    catalogCodes: new Set(),
    originalDocumentNumbers: new Set(),
    stockAsOf: null,
  });

  assert.match(preview.warning ?? "", /No committed opening stock run/);
  assert.equal(preview.documents[0].originalFound, false);
  assert.equal(preview.counts.refundsWithoutOriginal, 1);
  assert.ok(preview.flaggedRows[0].flags.includes("referenced sale is not in this file"));
});

test("same-day Create timestamps before and after stock as-of classify by instant", async () => {
  const parsed = await parseSalesExport(fs.readFileSync(fixture));
  const sameDayDocument = parsed.documents[0];
  assert.equal(sameDayDocument.businessDay, "2026-10-13");
  assert.equal(isHistoryOnlySalesDocument(sameDayDocument, new Date("2026-10-13T01:18:59.000Z")), true);
  assert.equal(isHistoryOnlySalesDocument(sameDayDocument, new Date("2026-10-13T01:18:57.000Z")), false);

  const missingCreateDate = { ...sameDayDocument, createDate: null, createdAt: sameDayDocument.date };
  assert.equal(isHistoryOnlySalesDocument(missingCreateDate, new Date("2026-10-13T02:00:00.000Z")), false);
  assert.equal(isHistoryOnlySalesDocument(missingCreateDate, new Date("2026-10-14T00:00:00.000Z")), true);
});

test("Create instant exactly equal to stock as-of is stock-affecting", async () => {
  const parsed = await parseSalesExport(fs.readFileSync(fixture));
  const document = parsed.documents[0];
  assert.equal(isHistoryOnlySalesDocument(document, new Date(document.createdAt)), false);
});
