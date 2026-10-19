import assert from "node:assert/strict";
import test from "node:test";
import { chunkText } from "./chunk";

test("returns an empty list for blank input", () => {
  assert.deepEqual(chunkText("  \n\n "), []);
});

test("keeps short text in one normalized chunk", () => {
  assert.deepEqual(chunkText("First paragraph.\n\n\nSecond paragraph."), [
    "First paragraph.\n\nSecond paragraph.",
  ]);
});

test("splits long text into bounded, overlapping chunks", () => {
  const text = Array.from({ length: 40 }, (_, index) => `word${index}`).join(" ");
  const chunks = chunkText(text, { maxChars: 80, overlapChars: 20 });

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 80));
  assert.ok(chunks[1].includes("word"));
});

test("validates chunk options", () => {
  assert.throws(() => chunkText("text", { maxChars: 10, overlapChars: 10 }));
});
