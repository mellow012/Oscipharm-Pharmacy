import ExcelJS from "exceljs";

export type StockParserLayout = "A" | "B";

export type StockParserSkip = {
  rowNumber: number;
  reason: "header block" | "blank row" | "totals row" | "junk row";
  raw?: string[];
};

export type StockRow = {
  rowNumber: number;
  code: string;
  group: string | null;
  name: string;
  quantity: number;
  uom: string;
  unitCost: number | null;
  lineCost: number | null;
  lineCostInclTax: number | null;
  totalValue: number | null;
  totalValueInclTax: number | null;
  warnings: string[];
};

export type ParseStockExportResult = {
  layout: StockParserLayout;
  rows: StockRow[];
  skipped: StockParserSkip[];
  totals: {
    layout: StockParserLayout;
    rows: number;
    skipped: number;
    warnings: number;
  };
};

export const STOCK_UPLOAD_FORMAT_ERROR = "Please use Aronium's Excel button to export the stock file as an .xlsx workbook.";

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function parseNumber(value: unknown): number | null {
  const raw = text(value);
  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/[$,\s]/g, "")
    .replace(/[()]/g, "-")
    .replace(/[^0-9.\-]/g, "");

  if (!normalized || normalized === "-" || normalized === "-." || normalized === ".") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGroup(value: unknown): string | null {
  const raw = text(value);
  if (!raw) {
    return null;
  }

  if (/^(\(none\)|none)$/i.test(raw)) {
    return null;
  }

  return raw;
}

function rowIsBlank(values: unknown[]): boolean {
  return values.every((value) => text(value) === "");
}

function normalizeRow(values: unknown[]): unknown[] {
  let start = 0;
  while (start < values.length && text(values[start]) === "") {
    start += 1;
  }
  return values.slice(start);
}

function rowLooksLikeLayoutA(values: unknown[]): boolean {
  const row = normalizeRow(values);
  if (row.length < 11) {
    return false;
  }

  const numberValue = parseNumber(row[0]);
  const code = text(row[1]);
  const productName = text(row[3]);
  const quantity = parseNumber(row[4]);
  const unitCost = parseNumber(row[6]);
  const lineCost = parseNumber(row[7]);
  const lineCostInclTax = parseNumber(row[8]);
  const totalValue = parseNumber(row[9]);
  const totalValueInclTax = parseNumber(row[10]);

  return (
    numberValue !== null &&
    code.length > 0 &&
    productName.length > 0 &&
    quantity !== null &&
    unitCost !== null &&
    lineCost !== null &&
    lineCostInclTax !== null &&
    totalValue !== null &&
    totalValueInclTax !== null
  );
}

function findLayoutBHeaderIndex(values: unknown[][]): number | null {
  for (let i = 0; i < values.length; i += 1) {
    const row = normalizeRow(values[i] ?? []);
    if (row.length < 10) {
      continue;
    }

    const joined = row.slice(0, 10).map((cell) => text(cell).toLowerCase()).join(" ");
    const hasNo = /(^|\s)no\.?($|\s)/.test(joined);
    const hasCode = joined.includes("code");
    const hasGroup = joined.includes("group");
    const hasName = joined.includes("name");
    const hasQty = joined.includes("qty");
    const hasUom = joined.includes("uom");
    const hasCost = joined.includes("cost");
    const hasTotal = joined.includes("total");

    if (hasNo && hasCode && hasGroup && hasName && hasQty && hasUom && hasCost && hasTotal) {
      return i;
    }
  }

  return null;
}

function buildWarnings(row: {
  quantity: number | null;
  unitCost: number | null;
  lineCost: number | null;
  lineCostInclTax: number | null;
  totalValue: number | null;
  totalValueInclTax: number | null;
  costLabel: "unit" | "line";
}): string[] {
  const warnings: string[] = [];

  if (
    row.quantity !== null &&
    row.quantity > 0 &&
    row.unitCost !== null &&
    row.lineCost !== null &&
    Math.abs(row.quantity * row.unitCost - row.lineCost) > 0.05
  ) {
    warnings.push("quantity x unit cost does not match line cost");
  }

  if (
    row.lineCost !== null &&
    row.lineCostInclTax !== null &&
    Math.abs(row.lineCostInclTax - row.lineCost) > 0.01
  ) {
    warnings.push("incl-tax and pre-tax totals differ");
  }

  if (
    row.totalValue !== null &&
    row.totalValueInclTax !== null &&
    Math.abs(row.totalValueInclTax - row.totalValue) > 0.01
  ) {
    warnings.push("incl-tax and pre-tax value totals differ");
  }

  if (row.costLabel === "line" && row.totalValue !== null && row.quantity !== null && row.quantity > 0) {
    const derivedUnitCost = row.totalValue / row.quantity;
    if (row.unitCost !== null && Math.abs(derivedUnitCost - row.unitCost) > 0.05) {
      warnings.push("derived unit cost differs from reported line value");
    }
  }

  return warnings;
}

function parseLayoutA(values: unknown[][]): ParseStockExportResult {
  const rows: StockRow[] = [];
  const skipped: StockParserSkip[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const rawRowValues = values[index];
    if (!Array.isArray(rawRowValues)) {
      continue;
    }

    const rowValues = normalizeRow(rawRowValues);
    if (rowIsBlank(rowValues)) {
      skipped.push({ rowNumber: index + 1, reason: "blank row", raw: rowValues.map((cell) => text(cell)) });
      continue;
    }

    if (!rowLooksLikeLayoutA(rawRowValues)) {
      const firstCell = text(rawRowValues[0]).toLowerCase();
      if (firstCell === "total" || firstCell.includes("total") || firstCell.includes("refund")) {
        skipped.push({ rowNumber: index + 1, reason: "totals row", raw: rawRowValues.map((cell) => text(cell)) });
      } else {
        skipped.push({ rowNumber: index + 1, reason: "junk row", raw: rawRowValues.map((cell) => text(cell)) });
      }
      continue;
    }

    const rowNumber = index + 1;
    const group = normalizeGroup(rowValues[2]);
    const name = text(rowValues[3]);
    const quantity = parseNumber(rowValues[4]);
    const unitCost = parseNumber(rowValues[6]);
    const lineCost = parseNumber(rowValues[7]);
    const lineCostInclTax = parseNumber(rowValues[8]);
    const totalValue = parseNumber(rowValues[9]);
    const totalValueInclTax = parseNumber(rowValues[10]);

    if (!name || name === ".") {
      skipped.push({ rowNumber, reason: "junk row", raw: rowValues.map((cell) => text(cell)) });
      continue;
    }

    const warnings = buildWarnings({
      quantity,
      unitCost,
      lineCost,
      lineCostInclTax,
      totalValue,
      totalValueInclTax,
      costLabel: "unit",
    });

    rows.push({
      rowNumber,
      code: text(rowValues[1]),
      group,
      name,
      quantity: quantity ?? 0,
      uom: text(rowValues[5]),
      unitCost,
      lineCost,
      lineCostInclTax,
      totalValue,
      totalValueInclTax,
      warnings,
    });
  }

  return {
    layout: "A",
    rows,
    skipped,
    totals: {
      layout: "A",
      rows: rows.length,
      skipped: skipped.length,
      warnings: rows.reduce((sum, row) => sum + row.warnings.length, 0),
    },
  };
}

function parseLayoutB(values: unknown[][]): ParseStockExportResult {
  const skipped: StockParserSkip[] = [];
  const headerIndex = findLayoutBHeaderIndex(values);

  if (headerIndex === null) {
    throw new Error("This doesn't look like an Aronium Stock export.");
  }

  for (let index = 0; index < headerIndex; index += 1) {
    const rowValues = values[index];
    if (!Array.isArray(rowValues) || rowIsBlank(rowValues)) {
      continue;
    }
    skipped.push({ rowNumber: index + 1, reason: "header block", raw: rowValues.map((cell) => text(cell)) });
  }

  const rows: StockRow[] = [];
  for (let index = headerIndex + 1; index < values.length; index += 1) {
    const rawRowValues = values[index];
    if (!Array.isArray(rawRowValues)) {
      continue;
    }

    const rowValues = normalizeRow(rawRowValues);
    if (rowIsBlank(rowValues)) {
      skipped.push({ rowNumber: index + 1, reason: "blank row", raw: rowValues.map((cell) => text(cell)) });
      continue;
    }

    if (rowValues.length < 10) {
      skipped.push({ rowNumber: index + 1, reason: "junk row", raw: rowValues.map((cell) => text(cell)) });
      continue;
    }

    const rowNumber = index + 1;
    const code = text(rowValues[1]);
    const group = normalizeGroup(rowValues[2]);
    const name = text(rowValues[3]);
    const quantity = parseNumber(rowValues[4]);
    const uom = text(rowValues[5]);
    const cost = parseNumber(rowValues[6]);
    const costInclTax = parseNumber(rowValues[7]);
    const totalValue = parseNumber(rowValues[8]);
    const totalValueInclTax = parseNumber(rowValues[9]);

    const normalizedName = name.toLowerCase();
    const firstCell = text(rawRowValues[0]).toLowerCase();
    if (!name || name === "." || firstCell === "total" || normalizedName.includes("total") || normalizedName.includes("grand total")) {
      skipped.push({
        rowNumber,
        reason: firstCell === "total" || normalizedName.includes("total") || normalizedName.includes("grand total") ? "totals row" : "junk row",
        raw: rowValues.map((cell) => text(cell)),
      });
      continue;
    }

    const derivedUnitCost = quantity !== null && quantity > 0 && totalValue !== null ? totalValue / quantity : null;
    const warnings = buildWarnings({
      quantity,
      unitCost: derivedUnitCost,
      lineCost: cost,
      lineCostInclTax: costInclTax,
      totalValue,
      totalValueInclTax,
      costLabel: "line",
    });

    rows.push({
      rowNumber,
      code,
      group,
      name,
      quantity: quantity ?? 0,
      uom,
      unitCost: derivedUnitCost,
      lineCost: cost,
      lineCostInclTax: costInclTax,
      totalValue,
      totalValueInclTax,
      warnings,
    });
  }

  return {
    layout: "B",
    rows,
    skipped,
    totals: {
      layout: "B",
      rows: rows.length,
      skipped: skipped.length,
      warnings: rows.reduce((sum, row) => sum + row.warnings.length, 0),
    },
  };
}

export async function parseStockExport(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  filename?: string,
): Promise<ParseStockExportResult> {
  const workbook = new ExcelJS.Workbook();
  const fileBuffer =
    buffer instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(buffer))
      : buffer instanceof Uint8Array
        ? Buffer.from(buffer)
        : Buffer.from(buffer as ArrayLike<number>);

  if ((filename && !/\.xlsx$/i.test(filename)) || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4b) {
    throw new Error(STOCK_UPLOAD_FORMAT_ERROR);
  }

  try {
    await workbook.xlsx.load(fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new Error(STOCK_UPLOAD_FORMAT_ERROR);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("This doesn't look like an Aronium Stock export.");
  }

  const values = worksheet.getSheetValues();

  if (values.length === 0) {
    throw new Error("This doesn't look like an Aronium Stock export.");
  }

  const normalizedValues = values.map((row) => (Array.isArray(row) ? normalizeRow(row) : row));
  const matchesLayoutA = normalizedValues.some((row) => Array.isArray(row) && rowLooksLikeLayoutA(row));
  if (matchesLayoutA) {
    return parseLayoutA(normalizedValues as unknown[][]);
  }

  const headerIndex = findLayoutBHeaderIndex(normalizedValues as unknown[][]);
  if (headerIndex !== null) {
    return parseLayoutB(normalizedValues as unknown[][]);
  }

  const textFlattened = normalizedValues
    .flat()
    .map((cell) => text(cell).toLowerCase())
    .join(" ");

  if (/sales|refunds summary|refund summary/.test(textFlattened)) {
    throw new Error("This doesn't look like an Aronium Stock export.");
  }

  throw new Error("This doesn't look like an Aronium Stock export.");
}
