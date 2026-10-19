import type { ParseSalesExportResult, SalesDocument } from "./sales-parser.ts";
import { getMalawiDateKey } from "../../../lib/timezone.ts";

export type SalesPreviewDocument = SalesDocument & {
  importStatus: "NEW" | "ALREADY_IMPORTED";
  historyOnly: boolean;
  originalFound: boolean | null;
};

export type SalesImportPreview = {
  documents: SalesPreviewDocument[];
  newProducts: Array<{ code: string; product: string; uom: string }>;
  skipped: ParseSalesExportResult["skipped"];
  flaggedRows: ParseSalesExportResult["rows"];
  warning: string | null;
  totals: { sales: number; refunds: number; net: number };
  dateRange: ParseSalesExportResult["dateRange"];
  counts: {
    totalDocuments: number;
    newDocuments: number;
    alreadyImportedDocuments: number;
    historyOnlyDocuments: number;
    refundsWithOriginal: number;
    refundsWithoutOriginal: number;
    newProducts: number;
    skippedRows: number;
    flaggedRows: number;
  };
};

export function isHistoryOnlySalesDocument(document: SalesDocument, stockAsOf: Date | null): boolean {
  if (!stockAsOf) return false;
  if (document.createDate) return new Date(document.createdAt).getTime() < stockAsOf.getTime();
  return document.businessDay < getMalawiDateKey(stockAsOf);
}

export function buildSalesImportPreview(input: {
  parsed: ParseSalesExportResult;
  importedDocumentNumbers: Set<string>;
  catalogCodes: Set<string>;
  originalDocumentNumbers: Set<string>;
  stockAsOf: Date | null;
}): SalesImportPreview {
  const documentCodes = new Map<string, { code: string; product: string; uom: string }>();
  const lineByKey = new Map(input.parsed.rows.map((row) => [row.lineKey, row]));
  const documents = input.parsed.documents.map((document) => {
    const imported = input.importedDocumentNumbers.has(document.documentNumber);
    const historyOnly = isHistoryOnlySalesDocument(document, input.stockAsOf);
    const originalFound = document.documentType === "Refund"
      ? Boolean(document.refNumber && (input.originalDocumentNumbers.has(document.refNumber) || input.parsed.documents.some((candidate) => candidate.documentType === "Sales" && candidate.documentNumber === document.refNumber)))
      : null;

    if (!imported) {
      for (const key of document.lineKeys) {
        const row = lineByKey.get(key);
        if (row && !input.catalogCodes.has(row.code) && !documentCodes.has(row.code)) {
          documentCodes.set(row.code, { code: row.code, product: row.product, uom: row.uom });
        }
      }
    }

    return {
      ...document,
      importStatus: imported ? "ALREADY_IMPORTED" as const : "NEW" as const,
      historyOnly,
      originalFound,
    };
  });
  const importableDocuments = documents.filter((document) => document.importStatus === "NEW");
  const net = importableDocuments.reduce((sum, document) => sum + document.totalAmount, 0);
  const sales = importableDocuments.filter((document) => document.documentType === "Sales").reduce((sum, document) => sum + document.totalAmount, 0);
  const refunds = importableDocuments.filter((document) => document.documentType === "Refund").reduce((sum, document) => sum + document.totalAmount, 0);
  const refundsWithOriginal = importableDocuments.filter((document) => document.documentType === "Refund" && document.originalFound).length;
  const refundsWithoutOriginal = importableDocuments.filter((document) => document.documentType === "Refund" && !document.originalFound).length;
  const flagsByKey = new Map(input.parsed.rows.filter((row) => row.flags.length > 0).map((row) => [row.lineKey, row]));
  const flaggedRows = Array.from(flagsByKey.values());

  return {
    documents,
    newProducts: Array.from(documentCodes.values()),
    skipped: input.parsed.skipped,
    flaggedRows,
    warning: input.stockAsOf ? null : "No committed opening stock run exists for this branch. Sales before an opening stock run cannot be classified as history-only.",
    totals: { sales, refunds, net },
    dateRange: input.parsed.dateRange,
    counts: {
      totalDocuments: documents.length,
      newDocuments: documents.filter((document) => document.importStatus === "NEW").length,
      alreadyImportedDocuments: documents.filter((document) => document.importStatus === "ALREADY_IMPORTED").length,
      historyOnlyDocuments: documents.filter((document) => document.historyOnly && document.importStatus === "NEW").length,
      refundsWithOriginal,
      refundsWithoutOriginal,
      newProducts: documentCodes.size,
      skippedRows: input.parsed.skipped.length,
      flaggedRows: flaggedRows.length,
    },
  };
}
