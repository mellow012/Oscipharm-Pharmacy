export type StockCorrectionInput = {
  expectedUnits: number;
  countedUnits: number;
  reason: string;
};

export type StockCorrectionValidation =
  | { ok: true; value: StockCorrectionInput }
  | { ok: false; error: string };

function wholeNumber(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!/^-?\d+$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? number : null;
}

export function validateStockCorrectionInput(input: {
  expectedUnits: unknown;
  countedUnits: unknown;
  reason: unknown;
}): StockCorrectionValidation {
  const expectedUnits = wholeNumber(input.expectedUnits);
  if (expectedUnits === null) {
    return { ok: false, error: "Stock changed, reload this batch." };
  }

  const countedUnits = wholeNumber(input.countedUnits);
  if (countedUnits === null || countedUnits < 0) {
    return { ok: false, error: "Counted stock must be a non-negative whole number of units." };
  }

  const reason = String(input.reason ?? "").trim();
  if (!reason) return { ok: false, error: "Enter a reason for this stock correction." };
  if (reason.length > 200) {
    return { ok: false, error: "Reason must be 200 characters or fewer." };
  }

  return { ok: true, value: { expectedUnits, countedUnits, reason } };
}

export function stockCorrectionDelta(oldUnits: number, newUnits: number): number {
  return newUnits - oldUnits;
}

export function stockQuantityMatches(currentUnits: number, expectedUnits: number): boolean {
  return currentUnits === expectedUnits;
}