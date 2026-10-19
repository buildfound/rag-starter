import { embedTexts } from "@/lib/embeddings";
import { getPool } from "@/lib/db";

export type RetrievedChunk = {
  source: string;
  title: string;
  content: string;
  similarity: number;
};

export async function retrieve(
  question: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const [embedding] = await embedTexts([question]);
  const vector = `[${embedding.join(",")}]`;
  const limit = Math.max(1, Math.min(Math.trunc(topK), 20));

  const result = await getPool().query<RetrievedChunk>(
    `SELECT d.source, d.title, c.content,
            1 - (c.embedding <=> $1::vector) AS similarity
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
      ORDER BY c.embedding <=> $1::vector
      LIMIT $2`,
    [vector, limit],
  );

  return result.rows.map((row) => ({
    ...row,
    similarity: Number(row.similarity),
  }));
}
