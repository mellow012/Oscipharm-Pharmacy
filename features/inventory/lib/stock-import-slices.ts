import type { Prisma } from "@prisma/client";

export type SliceProgress = {
  processed: number;
  total: number;
  done: boolean;
};

export async function processChunkSlice<T>(input: {
  chunks: T[];
  startAt: number;
  timeLimitMs: number;
  processChunk: (chunk: T, index: number) => Promise<void | boolean>;
  shouldContinue?: () => boolean;
  now?: () => number;
}): Promise<SliceProgress> {
  const now = input.now ?? Date.now;
  const startedAt = now();
  let processed = Math.max(0, Math.min(input.startAt, input.chunks.length));

  while (processed < input.chunks.length) {
    if (input.shouldContinue && !input.shouldContinue()) break;
    if (processed > input.startAt && now() - startedAt >= input.timeLimitMs) break;
    const completed = await input.processChunk(input.chunks[processed], processed);
    if (completed === false) break;
    processed += 1;
  }

  return { processed, total: input.chunks.length, done: processed >= input.chunks.length };
}

export async function lockImportBranch(tx: Prisma.TransactionClient, branchId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${branchId}, 0))`;
}
