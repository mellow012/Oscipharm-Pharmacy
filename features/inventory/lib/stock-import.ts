export type StockImportRow = {
  rowNumber?: number;
  productGroup?: string | null;
  strength?: string | null;
  quantityPacks?: number | string | null;
  unitPriceInclTax?: number | string | null;
  expiryDate?: string | null;
  isTaxInclusive?: boolean;
};

export type StockImportPreviewRow = {
  rowNumber: number;
  productGroup: string;
  strength: string;
  normalizedGroup: string;
  quantityPacks: number;
  unitPrice: {
    value: number;
    currency: "MWK";
    taxInclusive: boolean;
  };
  expiryDate: string;
  expiryDateKnown: boolean;
  raw: StockImportRow;
};

export type StockImportPreviewSkip = {
  rowNumber: number;
  reason: "empty row" | "invalid pack quantity" | "invalid unit price" | "missing product group";
};

export function normalizeGroupName(rawValue: string | null | undefined): string {
  if (!rawValue) {
    return "";
  }

  return rawValue
    .toLowerCase()
    .replace(/[\t\r\n]+/g, " ")
    .replace(/[\/&]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildStockImportPreview(rows: StockImportRow[]) {
  const validRows: StockImportPreviewRow[] = [];
  const skippedRows: StockImportPreviewSkip[] = [];

  for (const row of rows) {
    const rowNumber = row.rowNumber ?? 0;
    const productGroup = String(row.productGroup ?? "").trim();
    const strength = String(row.strength ?? "").trim();
    const quantityRaw = String(row.quantityPacks ?? "").trim();
    const priceRaw = String(row.unitPriceInclTax ?? "").trim();
    const expiryRaw = String(row.expiryDate ?? "").trim();

    const isBlankRow =
      !productGroup &&
      !strength &&
      !quantityRaw &&
      !priceRaw &&
      !expiryRaw;

    if (isBlankRow) {
      skippedRows.push({ rowNumber, reason: "empty row" });
      continue;
    }

    const quantityPacks = Number(quantityRaw);
    if (!Number.isFinite(quantityPacks) || quantityPacks < 0) {
      skippedRows.push({ rowNumber, reason: "invalid pack quantity" });
      continue;
    }

    const unitPriceValue = Number(priceRaw);
    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
      skippedRows.push({ rowNumber, reason: "invalid unit price" });
      continue;
    }

    if (!productGroup && !strength) {
      skippedRows.push({ rowNumber, reason: "missing product group" });
      continue;
    }

    const normalizedGroup = normalizeGroupName([productGroup, strength].filter(Boolean).join(" "));
    const expiryDate = expiryRaw || "2100-01-01";
    const expiryDateKnown = expiryDate !== "2100-01-01";

    validRows.push({
      rowNumber,
      productGroup,
      strength,
      normalizedGroup,
      quantityPacks,
      unitPrice: {
        value: unitPriceValue,
        currency: "MWK",
        taxInclusive: row.isTaxInclusive ?? true,
      },
      expiryDate,
      expiryDateKnown,
      raw: row,
    });
  }

  return { validRows, skippedRows };
}
