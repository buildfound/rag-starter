"use client";

import { FormEvent, useMemo, useState } from "react";

type Source = {
  number: number;
  source: string;
  title: string;
  similarity: number;
};

function decodeSources(encoded: string | null): Source[] {
  if (!encoded) return [];

  try {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Source[];
  } catch {
    return [];
  }
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const citedSources = useMemo(() => {
    const citations = new Set(
      Array.from(answer.matchAll(/\[(\d+)\]/g), (match) => Number(match[1])),
    );
    return sources.filter((source) => citations.has(source.number));
  }, [answer, sources]);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    setLoading(true);
    setAnswer("");
    setSources([]);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "The request failed.");
      }

      setSources(decodeSources(response.headers.get("x-sources")));
      if (!response.body) throw new Error("The response did not include a stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setAnswer((current) => current + decoder.decode(value, { stream: true }));
      }
      setAnswer((current) => current + decoder.decode());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Next.js · pgvector · OpenAI</p>
        <h1>Ask your documents</h1>
        <p className="intro">
          A minimal retrieval-augmented generation starter with answers grounded in
          local source files.
        </p>
      </section>

      <form onSubmit={ask}>
        <label htmlFor="question">Question</label>
        <div className="ask-row">
          <input
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="How does this starter retrieve context?"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? "Answering…" : "Ask"}
          </button>
        </div>
      </form>

      {(answer || error || loading) && (
        <section className="result" aria-live="polite">
          <h2>Answer</h2>
          {error ? <p className="error">{error}</p> : <p className="answer">{answer || "…"}</p>}

          {citedSources.length > 0 && (
            <div className="sources">
              <h3>Cited sources</h3>
              <ol>
                {citedSources.map((source) => (
                  <li key={source.number} value={source.number}>
                    <strong>{source.title}</strong>
                    <span>{source.source}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
