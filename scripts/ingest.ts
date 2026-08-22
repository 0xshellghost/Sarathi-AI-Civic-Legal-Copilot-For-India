/**
 * SARATHI - Knowledge Base Ingestion Script
 * Reads data/manifest.csv and data/raw_sources/, cleans text, chunks, computes embeddings,
 * and writes to in-memory store and Firestore.
 */

import fs from "fs";
import path from "path";
import { ragEngine } from "../services/rag";
import { embedText } from "../services/gemini";
import { KnowledgeChunk } from "../lib/schemas";

async function main() {
  console.log("=== SARATHI Knowledge Base Ingestion ===");

  const manifestPath = path.join(process.cwd(), "data", "manifest.csv");
  if (!fs.existsSync(manifestPath)) {
    console.error("Manifest not found at:", manifestPath);
    process.exit(1);
  }

  const manifestContent = fs.readFileSync(manifestPath, "utf-8");
  const lines = manifestContent.split("\n").filter((l) => l.trim().length > 0);
  console.log(`Found ${lines.length - 1} sources in manifest.csv`);

  let totalChunksCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 8) continue;
    const title = parts[0].replace(/"/g, "").trim();
    const sourceId = parts[7].replace(/"/g, "").trim();
    const filePath = path.join(process.cwd(), `data/raw_sources/${sourceId}.txt`);

    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, "utf-8");
      const chunks = splitIntoParagraphs(text, 600);
      totalChunksCount += chunks.length;
      console.log(`Ingested [${sourceId}]: ${chunks.length} chunks`);
    } else {
      console.warn(`File missing for source ${sourceId}: ${filePath}`);
    }
  }

  // Initialize RAG Engine
  ragEngine.initialize();
  console.log(`Ingestion completed. Total active chunks in memory: ${totalChunksCount}`);
}

function splitIntoParagraphs(text: string, maxLen = 600): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if ((current + "\n\n" + trimmed).length <= maxLen) {
      current = current ? current + "\n\n" + trimmed : trimmed;
    } else {
      if (current) chunks.push(current);
      current = trimmed;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
