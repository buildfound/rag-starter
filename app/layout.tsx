import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Starter",
  description: "A small Next.js, Postgres, pgvector, and OpenAI RAG starter.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
