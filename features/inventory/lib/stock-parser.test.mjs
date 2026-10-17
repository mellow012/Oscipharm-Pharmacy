import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

import { parseStockExport } from "./stock-parser.ts";

test("parseStockExport accepts the layout A fixture", async () => {
  const buffer = fs.readFileSync(path.resolve("features/inventory/lib/__fixtures__/stock-layout-a.xlsx"));
  const result = await parseStockExport(buffer);

  assert.equal(result.layout, "A");
  assert.equal(result.rows.length, 6);
  assert.equal(result.rows[0].code, "3");
  assert.equal(result.rows[0].group, null);
  assert.equal(result.rows[0].name, "Amoxicillin 500mg x10");
  assert.equal(result.rows[0].quantity, 50);
  assert.equal(result.rows[0].unitCost, 2500);
  assert.equal(result.rows[0].warnings.length, 0);
  assert.equal(result.skipped.length, 0);
});

test("parseStockExport accepts a printed-layout B export and skips header blocks and totals", async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Stock");

  worksheet.addRow(["Branch:", "Town Branch", "", "", "", "", "", "", "", ""]);
  worksheet.addRow(["Report date:", "2026-10-17", "", "", "", "", "", "", "", ""]);
  worksheet.addRow(["No.", "code", "group", "name", "qty", "uom", "cost", "cost incl tax", "total", "total incl tax"]);
  worksheet.addRow([1, "A-100", "(none)", "Vitamin C 500mg", 12, "strip", 6000, 6600, 6000, 6600]);
  worksheet.addRow([2, "A-200", "Pain Relief", "Paracetamol 500mg", 20, "pack", 12000, 13200, 12000, 13200]);
  worksheet.addRow(["Total", "", "", "", "", "", "", "", 18000, 19800]);

  const buffer = await workbook.xlsx.writeBuffer();
  const result = await parseStockExport(buffer);

  assert.equal(result.layout, "B");
  assert.equal(result.rows.length, 2);
  assert.equal(result.skipped.some((item) => item.reason === "header block"), true);
  assert.equal(result.skipped.some((item) => item.reason === "totals row"), true);
  assert.equal(result.rows[0].code, "A-100");
  assert.equal(result.rows[0].group, null);
  assert.equal(result.rows[0].warnings.some((warning) => warning.includes("incl-tax and pre-tax")), true);
});

test("parseStockExport rejects a sales export", async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales");
  worksheet.addRow(["Sales Export", "2026-10-17"]);
  worksheet.addRow(["Item", "Qty", "Total"]);
  worksheet.addRow(["Paracetamol", 10, 3500]);

  const buffer = await workbook.xlsx.writeBuffer();
  await assert.rejects(() => parseStockExport(buffer), { message: "This doesn't look like an Aronium Stock export." });
});

test("parseStockExport rejects a Refunds summary", async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Refunds");
  worksheet.addRow(["Refunds Summary"]);
  worksheet.addRow(["Refund code", "Amount"]);
  worksheet.addRow(["R-001", 2500]);

  const buffer = await workbook.xlsx.writeBuffer();
  await assert.rejects(() => parseStockExport(buffer), { message: "This doesn't look like an Aronium Stock export." });
});
