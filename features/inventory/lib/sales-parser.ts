import ExcelJS from "exceljs";
import { getMalawiDateKey } from "../../../lib/timezone.ts";

export type SalesDocumentType = "Sales" | "Refund";

export type SalesExportRow = {
  rowNumber: number;
  lineKey: string;
  documentType: SalesDocumentType;
  date: string;
  businessDay: string;
  createdAt: string;
  createDate: string | null;
  documentNumber: string;
  refNumber: string | null;
  user: string | null;
  customer: string | null;
  code: string;
  product: string;
  quantity: number;
  uom: string;
  subtotal: number;
  total: number;
  flags: string[];
};

export type SalesDocument = {
  documentType: SalesDocumentType;
  documentNumber: string;
  refNumber: string | null;
  date: string;
  businessDay: string;
  createdAt: string;
  createDate: string | null;
  user: string | null;
  customer: string | null;
  subtotalAmount: number;
  totalAmount: number;
  lineKeys: string[];
};

export type SalesExportSkip = {
  rowNumber: number;
  reason: "blank row" | "totals row";
};

export type ParseSalesExportResult = {
  rows: SalesExportRow[];
  documents: SalesDocument[];
  skipped: SalesExportSkip[];
  totals: {
    rows: number;
    skipped: number;
    sales: number;
    refunds: number;
    quantity: number;
    total: number;
    flagged: number;
  };
  dateRange: { from: string | null; to: string | null };
};

export const SALES_XLSX_ERROR = "Please export the Sales Item list with Aronium's Excel button.";
const STOCK_ERROR = "This looks like a Stock export. Please export the Sales Item list instead";
const REFUNDS_ERROR = "This looks like a Refunds summary. Please export the Sales Item list instead";

const REQUIRED_HEADERS = [
  "document type",
  "date",
  "document number",
  "code",
  "product",
  "quantity",
  "uom",
  "total",
] as const;

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return text(value).trim().toLocaleLowerCase("en-US");
}

function dateCell(value: unknown, rowNumber: number): Date {
  let date: Date | null = null;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    date = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [year, month, day] = value.trim().split("-").map(Number);
    date = new Date(Date.UTC(year, month - 1, day));
  }
  if (!date || !Number.isFinite(date.getTime())) throw new Error(`Sales row ${rowNumber} has an invalid Date.`);
  return date;
}

function createDateValue(value: unknown, rowNumber: number): { text: string | null; instant: Date | null } {
  const raw = text(value);
  if (!raw) return { text: null, instant: null };
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw);
  if (!match) throw new Error(`Sales row ${rowNumber} has an invalid Create date.`);
  const [, dayText, monthText, yearText, hourText, minuteText, secondText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  const parsed = new Date(`${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}+02:00`);
  if (
    calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day ||
    hour > 23 || minute > 59 || second > 59
  ) throw new Error(`Sales row ${rowNumber} has an invalid Create date.`);
  return { text: raw, instant: parsed };
}

function numberCell(value: unknown, rowNumber: number): number {
  const raw = text(value).replace(/,/g, "");
  if (!raw) throw new Error(`Sales row ${rowNumber} has a missing numeric value.`);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Sales row ${rowNumber} has an invalid numeric value.`);
  return parsed;
}

function headerRowIndex(worksheet: ExcelJS.Worksheet): { rowIndex: number; columns: Map<string, number> } {
  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const columns = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, column) => {
      const header = normalizeHeader(cell.value);
      if (header && !columns.has(header)) columns.set(header, column);
    });
    if (REQUIRED_HEADERS.every((header) => columns.has(header))) return { rowIndex, columns };
  }
  return { rowIndex: 0, columns: new Map() };
}

function rowValue(row: ExcelJS.Row, columns: Map<string, number>, header: string): unknown {
  const column = columns.get(header);
  return column ? row.getCell(column).value : null;
}

function rowHasValues(row: ExcelJS.Row): boolean {
  let found = false;
  row.eachCell({ includeEmpty: false }, (cell) => {
    if (text(cell.value)) found = true;
  });
  return found;
}

function looksLikeStockDataRow(row: ExcelJS.Row): boolean {
  const serial = numberCellForDetection(row.getCell(1).value);
  const code = text(row.getCell(2).value);
  const product = text(row.getCell(4).value);
  const quantity = numberCellForDetection(row.getCell(5).value);
  const uom = text(row.getCell(6).value);
  const cost = numberCellForDetection(row.getCell(7).value);
  return serial && Boolean(code) && Boolean(product) && quantity && Boolean(uom) && cost;
}

function numberCellForDetection(value: unknown): boolean {
  const raw = text(value).replace(/,/g, "");
  return Boolean(raw) && Number.isFinite(Number(raw));
}

function documentType(value: unknown, rowNumber: number): SalesDocumentType {
  const raw = text(value).toLocaleLowerCase("en-US");
  if (raw === "sales") return "Sales";
  if (raw === "refund") return "Refund";
  throw new Error(`Sales row ${rowNumber} has an unsupported Document type.`);
}

export async function parseSalesExport(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  filename?: string,
): Promise<ParseSalesExportResult> {
  const fileBuffer = Buffer.isBuffer(buffer)
    ? buffer
    : buffer instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(buffer))
      : Buffer.from(buffer);
  if ((filename && !/\.xlsx$/i.test(filename)) || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4b) {
    throw new Error(SALES_XLSX_ERROR);
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new Error(SALES_XLSX_ERROR);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("This workbook has no Sales Item list worksheet.");
  const { rowIndex: headersAt, columns } = headerRowIndex(worksheet);
  if (!headersAt) {
    const headers = new Set<string>();
    const allText: string[] = [];
    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      worksheet.getRow(rowIndex).eachCell({ includeEmpty: false }, (cell) => headers.add(normalizeHeader(cell.value)));
      worksheet.getRow(rowIndex).eachCell({ includeEmpty: false }, (cell) => allText.push(normalizeHeader(cell.value)));
    }
    const hasStockHeaders = headers.has("group") && (headers.has("no.") || headers.has("no")) &&
      (headers.has("qty") || headers.has("quantity")) && headers.has("uom") && (headers.has("cost") || headers.has("unit cost"));
    let hasStockData = false;
    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      if (looksLikeStockDataRow(worksheet.getRow(rowIndex))) hasStockData = true;
    }
    if (hasStockHeaders || hasStockData) {
      throw new Error(STOCK_ERROR);
    }
    if (allText.some((value) => value.includes("refunds summary") || value === "refunds")) {
      throw new Error(REFUNDS_ERROR);
    }
    throw new Error("This doesn't look like an Aronium Sales Item list.");
  }

  const rows: SalesExportRow[] = [];
  const skipped: SalesExportSkip[] = [];
  const lineOccurrences = new Map<string, number>();
  const documentByKey = new Map<string, SalesDocument>();

  for (let rowNumber = headersAt + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const source = worksheet.getRow(rowNumber);
    if (!rowHasValues(source)) {
      skipped.push({ rowNumber, reason: "blank row" });
      continue;
    }
    const documentNumber = text(rowValue(source, columns, "document number"));
    if (!documentNumber) {
      skipped.push({ rowNumber, reason: "totals row" });
      continue;
    }

    const type = documentType(rowValue(source, columns, "document type"), rowNumber);
    const date = dateCell(rowValue(source, columns, "date"), rowNumber);
    const businessDay = getMalawiDateKey(date);
    const parsedCreateDate = createDateValue(rowValue(source, columns, "create date"), rowNumber);
    const createdAt = parsedCreateDate.instant ?? date;
    const createDate = parsedCreateDate.text;
    const refNumber = text(rowValue(source, columns, "ref. number")) || null;
    const code = text(rowValue(source, columns, "code"));
    const product = text(rowValue(source, columns, "product"));
    const quantity = numberCell(rowValue(source, columns, "quantity"), rowNumber);
    if (!Number.isInteger(quantity)) throw new Error(`Sales row ${rowNumber} quantity must be a whole unit.`);
    const uom = text(rowValue(source, columns, "uom"));
    const total = numberCell(rowValue(source, columns, "total"), rowNumber);
    const totalBeforeTaxColumn = columns.get("total before tax");
    const subtotal = totalBeforeTaxColumn ? numberCell(source.getCell(totalBeforeTaxColumn).value, rowNumber) : total;
    const key = `${documentNumber}\u0000${code}`;
    const occurrence = (lineOccurrences.get(key) ?? 0) + 1;
    lineOccurrences.set(key, occurrence);
    const lineKey = JSON.stringify([documentNumber, code, occurrence]);
    const flags: string[] = [];
    if (type === "Refund" && quantity > 0) flags.push("refund has a positive quantity");
    if (type === "Sales" && quantity < 0) flags.push("sale has a negative quantity");
    if (quantity === 0) flags.push("zero-quantity line");

    const user = text(rowValue(source, columns, "user")) || null;
    const customer = text(rowValue(source, columns, "customer")) || null;
    rows.push({ rowNumber, lineKey, documentType: type, date: date.toISOString(), businessDay, createdAt: createdAt.toISOString(), createDate, documentNumber, refNumber, user, customer, code, product, quantity, uom, subtotal, total, flags });

    const documentKey = `${type}\u0000${documentNumber}`;
    let document = documentByKey.get(documentKey);
    if (!document) {
      document = { documentType: type, documentNumber, refNumber, date: date.toISOString(), businessDay, createdAt: createdAt.toISOString(), createDate, user, customer, subtotalAmount: 0, totalAmount: 0, lineKeys: [] };
      documentByKey.set(documentKey, document);
    }
    document.subtotalAmount += subtotal;
    document.totalAmount += total;
    document.lineKeys.push(lineKey);
  }

  const documents = Array.from(documentByKey.values());
  const saleNumbers = new Set(documents.filter((doc) => doc.documentType === "Sales").map((doc) => doc.documentNumber));
  for (const row of rows) {
    if (row.documentType === "Refund" && (!row.refNumber || !saleNumbers.has(row.refNumber))) {
      row.flags.push("referenced sale is not in this file");
    }
  }

  const businessDays = rows.map((row) => row.businessDay).sort();
  return {
    rows,
    documents,
    skipped,
    totals: {
      rows: rows.length,
      skipped: skipped.length,
      sales: rows.filter((row) => row.documentType === "Sales").length,
      refunds: rows.filter((row) => row.documentType === "Refund").length,
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      total: rows.reduce((sum, row) => sum + row.total, 0),
      flagged: rows.filter((row) => row.flags.length > 0).length,
    },
    dateRange: { from: businessDays[0] ?? null, to: businessDays.at(-1) ?? null },
  };
}