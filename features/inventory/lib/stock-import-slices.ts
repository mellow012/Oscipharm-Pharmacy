export type SliceProgress = {
  processed: number;
  total: number;
  done: boolean;
};

export async function processChunkSlice<T>(input: {
  chunks: T[];
  startAt: number;
  timeLimitMs: number;
  processChunk: (chunk: T, index: number) => Promise<void>;
  now?: () => number;
}): Promise<SliceProgress> {
  const now = input.now ?? Date.now;
  const startedAt = now();
  let processed = Math.max(0, Math.min(input.startAt, input.chunks.length));

  while (processed < input.chunks.length) {
    if (processed > input.startAt && now() - startedAt >= input.timeLimitMs) break;
    await input.processChunk(input.chunks[processed], processed);
    processed += 1;
  }

  return { processed, total: input.chunks.length, done: processed >= input.chunks.length };
}
