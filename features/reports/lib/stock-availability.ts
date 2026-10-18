export type ReorderAvailability = {
  availableUnits: number;
  reorderThreshold: number | null;
};

export type AvailabilityBatch = {
  quantityRemaining: number;
  expiryDate: Date;
  expiryDateKnown: boolean;
};

export function countAvailableUnits(batches: AvailabilityBatch[], todayKey: string): number {
  return batches.reduce((total, batch) => {
    if (batch.quantityRemaining <= 0) return total;
    if (batch.expiryDateKnown && batch.expiryDate.toISOString().slice(0, 10) < todayKey) return total;
    return total + batch.quantityRemaining;
  }, 0);
}

export function filterLowStockRows<T extends ReorderAvailability>(rows: T[]): T[] {
  return rows.filter((row) => row.reorderThreshold !== null && row.availableUnits <= row.reorderThreshold);
}
