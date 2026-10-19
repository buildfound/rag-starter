# Getting started

This starter is a small retrieval-augmented generation application built with Next.js, Postgres, pgvector, and OpenAI. It stores source documents and vectorized chunks in Postgres, retrieves the chunks closest to a question, and asks a chat model to answer from that context.

Start Postgres with `docker compose up -d`. Copy `.env.example` to `.env.local`, add an OpenAI API key, and run `npm run ingest -- ./docs`. Then start the app with `npm run dev` and open it in a browser.

Re-running ingestion replaces the chunks for each matching source file. This makes edits predictable and avoids duplicate search results.
