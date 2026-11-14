export type UnallocatedSaleItem = {
  variantId: string;
  productName: string;
  unallocatedUnits: number;
};

export type UnallocatedProduct = {
  variantId: string;
  productName: string;
  units: number;
};

export function aggregateUnallocatedUnits(items: readonly UnallocatedSaleItem[]): UnallocatedProduct[] {
  const totals = new Map<string, UnallocatedProduct>();
  for (const item of items) {
    if (!Number.isSafeInteger(item.unallocatedUnits) || item.unallocatedUnits <= 0) continue;
    const current = totals.get(item.variantId);
    totals.set(item.variantId, {
      variantId: item.variantId,
      productName: item.productName,
      units: (current?.units ?? 0) + item.unallocatedUnits,
    });
  }
  return Array.from(totals.values()).sort((left, right) => left.productName.localeCompare(right.productName));
}