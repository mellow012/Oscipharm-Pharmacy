export function parseInventoryEmptyToggle(value: string | string[] | undefined): boolean {
    if (Array.isArray(value)) return value.some((item) => item === "1" || item === "true");
    return value === "1" || value === "true";
}

export function buildInventoryBatchWhereClause(branchId: string, includeZeroBatches = false) {
    return includeZeroBatches
        ? { branchId, quantityRemaining: { gte: 0 } }
        : { branchId, quantityRemaining: { gt: 0 } };
}
