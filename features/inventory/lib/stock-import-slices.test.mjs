import assert from "node:assert/strict";
import test from "node:test";
import { processChunkSlice } from "./stock-import-slices.ts";

test("processChunkSlice stops at its time budget between chunks", async () => {
  let now = 0;
  const processedChunks = [];
  const result = await processChunkSlice({
    chunks: ["a", "b", "c", "d"],
    startAt: 0,
    timeLimitMs: 8_000,
    now: () => now,
    async processChunk(chunk) {
      processedChunks.push(chunk);
      now += 4_100;
    },
  });

  assert.deepEqual(processedChunks, ["a", "b"]);
  assert.deepEqual(result, { processed: 2, total: 4, done: false });
});

test("processChunkSlice resumes at the saved chunk and completes", async () => {
  const processedChunks = [];
  const result = await processChunkSlice({
    chunks: ["a", "b", "c", "d"],
    startAt: 2,
    timeLimitMs: 8_000,
    async processChunk(chunk) {
      processedChunks.push(chunk);
    },
  });

  assert.deepEqual(processedChunks, ["c", "d"]);
  assert.deepEqual(result, { processed: 4, total: 4, done: true });
});
