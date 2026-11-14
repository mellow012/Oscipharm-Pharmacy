export type CommittedOpeningStockRun = { id: string; asOf: Date | null };

export function requireCommittedOpeningStockRun(
  run: CommittedOpeningStockRun | null,
): CommittedOpeningStockRun & { asOf: Date } {
  if (!run?.asOf) {
    throw new Error("Sales import is blocked until this branch has an opening stock import with an as-of time.");
  }
  return run as CommittedOpeningStockRun & { asOf: Date };
}