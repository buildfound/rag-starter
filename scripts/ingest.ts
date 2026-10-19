import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PoolClient } from "pg";
import { chunkText } from "../lib/chunk";
import { getPool } from "../lib/db";
import { embedTexts } from "../lib/embeddings";

const EMBEDDING_BATCH_SIZE = 100;

async function findFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findFiles(fullPath);
      if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) return [fullPath];
      return [];
    }),
  );

  return files.flat().sort();
}

function titleFrom(content: string, filePath: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(filePath, path.extname(filePath));
}

async function embedInBatches(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
    embeddings.push(...(await embedTexts(batch)));
  }

  return embeddings;
}

async function replaceDocument(
  client: PoolClient,
  source: string,
  title: string,
  chunks: string[],
  embeddings: number[][],
): Promise<void> {
  await client.query("BEGIN");

  try {
    const document = await client.query<{ id: string }>(
      `INSERT INTO documents (source, title)
       VALUES ($1, $2)
       ON CONFLICT (source) DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
      [source, title],
    );
    const documentId = document.rows[0].id;

    await client.query("DELETE FROM chunks WHERE document_id = $1", [documentId]);

    for (let index = 0; index < chunks.length; index += 1) {
      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4::vector)`,
        [documentId, index, chunks[index], `[${embeddings[index].join(",")}]`],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: npm run ingest -- <folder>");

  const root = path.resolve(input);
  const files = await findFiles(root);
  if (files.length === 0) throw new Error(`No .md or .txt files found in ${root}`);

  const pool = getPool();

  try {
    for (const file of files) {
      const content = await readFile(file, "utf8");
      const chunks = chunkText(content);
      if (chunks.length === 0) continue;

      const embeddings = await embedInBatches(chunks);
      const source = path.relative(process.cwd(), file).split(path.sep).join("/");
      const client = await pool.connect();

      try {
        await replaceDocument(
          client,
          source,
          titleFrom(content, file),
          chunks,
          embeddings,
        );
      } finally {
        client.release();
      }

      console.log(`Ingested ${source} (${chunks.length} chunks)`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
