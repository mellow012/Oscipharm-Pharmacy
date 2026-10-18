export type ExpiryNotRecordedRow = {
  batchId: string;
  branchId: string;
  branchName: string;
  ingredientName: string;
  brandName: string;
  batchNumber: string | null;
  remainingUnits: number;
};

export type ExpiryNotRecordedGroup = {
  branchId: string;
  branchName: string;
  batches: ExpiryNotRecordedRow[];
};

export function groupExpiryNotRecorded(rows: ExpiryNotRecordedRow[]) {
  const groups = new Map<string, ExpiryNotRecordedGroup>();
  for (const row of rows) {
    let group = groups.get(row.branchId);
    if (!group) {
      group = { branchId: row.branchId, branchName: row.branchName, batches: [] };
      groups.set(row.branchId, group);
    }
    group.batches.push(row);
  }
  return { count: rows.length, groups: Array.from(groups.values()) };
}
