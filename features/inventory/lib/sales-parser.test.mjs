import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { parseSalesExport } from "./sales-parser.ts";

const fixturePath = path.resolve("features/inventory/lib/__fixtures__/sales-item-list.xlsx");

async function workbookBuffer(headers, rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales");
  worksheet.addRow(headers);
  for (const row of rows) worksheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("parseSalesExport reads every fixture line and groups sale/refund documents", async () => {
  const buffer = fs.readFileSync(fixturePath);
  const result = await parseSalesExport(buffer, "sales-item-list.xlsx");
  const parsedRows = result.rows.map(({ documentType, documentNumber, refNumber, code, quantity, total, lineKey }) => ({
    documentType,
    documentNumber,
    refNumber,
    code,
    quantity,
    total,
    lineKey,
  }));
  console.log("Sales Item list fixture rows:", parsedRows);

  assert.deepEqual(parsedRows, [
    { documentType: "Sales", documentNumber: "26-200-000001", refNumber: null, code: "3", quantity: 2, total: 8000, lineKey: '["26-200-000001","3",1]' },
    { documentType: "Sales", documentNumber: "26-200-000001", refNumber: null, code: "4", quantity: 4, total: 36000, lineKey: '["26-200-000001","4",1]' },
    { documentType: "Sales", documentNumber: "26-200-000001", refNumber: null, code: "5", quantity: 3, total: 1800, lineKey: '["26-200-000001","5",1]' },
    { documentType: "Sales", documentNumber: "26-200-000001", refNumber: null, code: "1", quantity: 4, total: 18000, lineKey: '["26-200-000001","1",1]' },
    { documentType: "Sales", documentNumber: "26-200-000001", refNumber: null, code: "6", quantity: 1, total: 80, lineKey: '["26-200-000001","6",1]' },
    { documentType: "Sales", documentNumber: "26-200-000002", refNumber: null, code: "3", quantity: 2, total: 8000, lineKey: '["26-200-000002","3",1]' },
    { documentType: "Sales", documentNumber: "26-200-000002", refNumber: null, code: "4", quantity: 3, total: 27000, lineKey: '["26-200-000002","4",1]' },
    { documentType: "Sales", documentNumber: "26-200-000002", refNumber: null, code: "1", quantity: 1, total: 4500, lineKey: '["26-200-000002","1",1]' },
    { documentType: "Refund", documentNumber: "26-220-000001", refNumber: "26-200-000001", code: "3", quantity: -1, total: -4000, lineKey: '["26-220-000001","3",1]' },
    { documentType: "Refund", documentNumber: "26-220-000001", refNumber: "26-200-000001", code: "6", quantity: -1, total: -80, lineKey: '["26-220-000001","6",1]' },
    { documentType: "Sales", documentNumber: "26-200-000003", refNumber: null, code: "2", quantity: 1, total: 800, lineKey: '["26-200-000003","2",1]' },
  ]);
  assert.equal(result.rows[0].code, "3");
  assert.equal(typeof result.rows[0].code, "string");
  assert.equal(result.rows[0].businessDay, "2026-10-13");
  assert.equal(result.rows[0].createdAt, "2026-10-13T01:18:58.000Z");
  assert.equal(result.totals.rows, 11);
  assert.equal(result.totals.sales, 9);
  assert.equal(result.totals.refunds, 2);
  assert.equal(result.totals.quantity, 19);
  assert.equal(result.totals.total, 100100);
  assert.deepEqual(result.documents.map(({ documentType, documentNumber, refNumber, lineKeys }) => ({ documentType, documentNumber, refNumber, lines: lineKeys.length })), [
    { documentType: "Sales", documentNumber: "26-200-000001", refNumber: null, lines: 5 },
    { documentType: "Sales", documentNumber: "26-200-000002", refNumber: null, lines: 3 },
    { documentType: "Refund", documentNumber: "26-220-000001", refNumber: "26-200-000001", lines: 2 },
    { documentType: "Sales", documentNumber: "26-200-000003", refNumber: null, lines: 1 },
  ]);
});

test("same product twice on one document gets distinct occurrence line keys", async () => {
  const headers = ["Document type", "Date", "Document number", "Code", "Product", "Quantity", "UOM", "Total"];
  const date = new Date("2026-10-13T00:00:00.000Z");
  const result = await parseSalesExport(await workbookBuffer(headers, [
    ["Sales", date, "S-1", "001", "Product A", "1", "pack", "10"],
    ["Sales", date, "S-1", "001", "Product A", "2", "pack", "20"],
  ]));

  assert.deepEqual(result.rows.map((row) => row.lineKey), ['["S-1","001",1]', '["S-1","001",2]']);
  assert.equal(result.rows[0].code, "001");
  assert.equal(result.documents[0].lineKeys.length, 2);
});

test("header lookup tolerates changed order, case, whitespace, and extra columns", async () => {
  const headers = ["Extra", " TOTAL ", "uom", " Product ", "Code", "Document Number", "DATE", "Quantity", "Document Type", "Create date", "Ref. number", "User", "Customer"];
  const row = ["ignored", "-25", "pack", "Product Z", "0007", "R-1", new Date("2026-11-01T22:30:00.000Z"), "-1", "Refund", "02/11/2026 00:30:00", "S-OLD", "Staff", "Customer Z"];
  const result = await parseSalesExport(await workbookBuffer(headers, [row]));

  assert.equal(result.rows[0].code, "0007");
  assert.equal(result.rows[0].quantity, -1);
  assert.equal(result.rows[0].total, -25);
  assert.equal(result.rows[0].refNumber, "S-OLD");
  assert.equal(result.rows[0].businessDay, "2026-11-02");
  assert.equal(result.rows[0].createDate, "02/11/2026 00:30:00");
  assert.ok(result.rows[0].flags.includes("referenced sale is not in this file"));
});

test("flags quantity/type mismatches and zero-quantity rows without dropping them", async () => {
  const headers = ["Document type", "Date", "Document number", "Code", "Product", "Quantity", "UOM", "Total", "Ref. number"];
  const date = new Date("2026-10-13T00:00:00.000Z");
  const result = await parseSalesExport(await workbookBuffer(headers, [
    ["Refund", date, "R-1", "C1", "Product A", "1", "pack", "10", "S-1"],
    ["Sales", date, "S-2", "C2", "Product B", "-2", "pack", "-20", ""],
    ["Sales", date, "S-3", "C3", "Product C", "0", "pack", "0", ""],
  ]));

  assert.equal(result.rows.length, 3);
  assert.ok(result.rows[0].flags.includes("refund has a positive quantity"));
  assert.ok(result.rows[1].flags.includes("sale has a negative quantity"));
  assert.ok(result.rows[2].flags.includes("zero-quantity line"));
});

test("rejects fractional sales and refund quantities with the source row number", async () => {
  const headers = ["Document type", "Date", "Document number", "Code", "Product", "Quantity", "UOM", "Total"];
  const date = new Date("2026-10-13T00:00:00.000Z");
  for (const type of ["Sales", "Refund"]) {
    const buffer = await workbookBuffer(headers, [[type, date, `${type}-fractional`, "C1", "Product A", 1.5, "unit", 15]]);
    await assert.rejects(() => parseSalesExport(buffer), { message: "Sales row 2 quantity must be a whole unit." });
  }
});

test("skips blank and footer totals rows with reasons", async () => {
  const headers = ["Document type", "Date", "Document number", "Code", "Product", "Quantity", "UOM", "Total"];
  const date = new Date("2026-10-13T00:00:00.000Z");
  const buffer = await workbookBuffer(headers, [
    ["Sales", date, "S-1", "C1", "Product A", "1", "pack", "10"],
    [null, null, null, null, null, null, null, null],
    ["Total", null, null, null, null, null, null, "10"],
  ]);
  const result = await parseSalesExport(buffer);

  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.skipped.map(({ rowNumber, reason }) => ({ rowNumber, reason })), [
    { rowNumber: 3, reason: "blank row" },
    { rowNumber: 4, reason: "totals row" },
  ]);
});

test("rejects Stock exports and Refunds summaries with plain guidance", async () => {
  const actualStockBuffer = fs.readFileSync(path.resolve("features/inventory/lib/__fixtures__/stock-layout-a.xlsx"));
  const stockBuffer = await workbookBuffer(
    ["No.", "Code", "Group", "Name", "Qty", "UOM", "Cost", "Expiry Date"],
    [[1, "C1", "", "Product", "1", "pack", "10", "2100-01-01"]],
  );
  const refundsBuffer = await workbookBuffer(
    ["Refunds Summary", "Date", "Amount"],
    [["Refunds", "2026-10-13", 20]],
  );
  await assert.rejects(() => parseSalesExport(actualStockBuffer), { message: "This looks like a Stock export. Please export the Sales Item list instead" });
  await assert.rejects(() => parseSalesExport(stockBuffer), { message: "This looks like a Stock export. Please export the Sales Item list instead" });
  await assert.rejects(() => parseSalesExport(refundsBuffer), { message: "This looks like a Refunds summary. Please export the Sales Item list instead" });
  await assert.rejects(() => parseSalesExport(Buffer.from("%PDF-1.7"), "sales.pdf"), { message: "Please export the Sales Item list with Aronium's Excel button." });
});
