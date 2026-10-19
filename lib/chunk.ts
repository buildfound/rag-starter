export type ChunkOptions = {
  maxChars?: number;
  overlapChars?: number;
};

/**
 * Splits normalized text near paragraph boundaries, falling back to a word
 * boundary. Each new chunk starts roughly `overlapChars` before the previous
 * split so nearby context is retained.
 */
export function chunkText(
  input: string,
  { maxChars = 1_200, overlapChars = 200 }: ChunkOptions = {},
): string[] {
  if (maxChars < 1) throw new Error("maxChars must be positive");
  if (overlapChars < 0 || overlapChars >= maxChars) {
    throw new Error("overlapChars must be between 0 and maxChars - 1");
  }

  const text = input
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const target = Math.min(start + maxChars, text.length);
    let end = target;

    if (target < text.length) {
      const minimumUsefulSplit = start + Math.floor(maxChars * 0.6);
      const paragraphBreak = text.lastIndexOf("\n\n", target);
      const wordBreak = text.lastIndexOf(" ", target);

      if (paragraphBreak >= minimumUsefulSplit) {
        end = paragraphBreak;
      } else if (wordBreak > start) {
        end = wordBreak;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;

    let nextStart = Math.max(0, end - overlapChars);
    if (nextStart > 0 && !/\s/.test(text[nextStart - 1] ?? "")) {
      const nextBoundary = text.indexOf(" ", nextStart);
      if (nextBoundary !== -1 && nextBoundary < end) nextStart = nextBoundary + 1;
    }
    while (/\s/.test(text[nextStart] ?? "")) nextStart += 1;

    // Ensure malformed or whitespace-heavy input can never stall the loop.
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}
