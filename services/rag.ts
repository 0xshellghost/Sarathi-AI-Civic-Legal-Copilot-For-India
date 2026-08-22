/**
 * SARATHI - In-Memory RAG Engine with Precomputed Embeddings & Domain Boosting
 * High-speed, deterministic retrieval with tier re-ranking and jurisdiction filtering
 */

import fs from "fs";
import path from "path";
import { KnowledgeChunk, Citation, ReliabilityInfo } from "../lib/schemas";
import { CONFIG } from "../lib/config";
import { embedText } from "./gemini";

interface ScoredChunk {
  chunk: KnowledgeChunk;
  vectorSimilarity: number;
  keywordScore: number;
  domainBoost: number;
  combinedScore: number;
}

class RagEngine {
  private chunks: KnowledgeChunk[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Load chunks from manifest and cached embeddings on server startup
   */
  public initialize(): void {
    if (this.isInitialized && this.chunks.length > 0) return;

    try {
      const manifestPath = path.join(process.cwd(), "data", "manifest.csv");
      if (!fs.existsSync(manifestPath)) {
        console.warn("[RAG] manifest.csv not found at", manifestPath);
        return;
      }

      const cacheFile = path.join(process.cwd(), "data", "embeddings_cache.json");
      let embeddingsCache: Record<string, number[]> = {};
      if (fs.existsSync(cacheFile)) {
        try {
          embeddingsCache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
        } catch (e) {
          console.warn("[RAG] Failed to parse embeddings_cache.json:", e);
        }
      }

      const manifestContent = fs.readFileSync(manifestPath, "utf-8");
      const lines = manifestContent.split("\n").filter((l) => l.trim().length > 0);

      const loadedChunks: KnowledgeChunk[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCsvLine(lines[i]);
        if (row.length < 8) continue;

        const [title, url, tierStr, authority, jurisdiction, publishedDate, docType, sourceId, localPath] = row;
        const tier = parseInt(tierStr, 10) || 1;

        const fullPath = path.join(process.cwd(), localPath || `data/raw_sources/${sourceId}.txt`);
        let textContent = "";

        if (fs.existsSync(fullPath)) {
          textContent = fs.readFileSync(fullPath, "utf-8");
        } else {
          textContent = `${title}. Issued by ${authority}, Jurisdiction: ${jurisdiction}. Official reference URL: ${url}`;
        }

        // Split text into semantic chunks
        const paragraphs = textContent.split("\n\n").filter((p) => p.trim().length > 20);
        const subChunks = paragraphs.length > 0 ? paragraphs : [textContent];

        subChunks.forEach((chunkContent, idx) => {
          const chunkId = `${sourceId}_chunk_${idx}`;
          const cachedVec = embeddingsCache[chunkId];

          loadedChunks.push({
            chunkId,
            sourceId,
            sourceTitle: title,
            issuingAuthority: authority,
            url,
            tier,
            jurisdiction,
            publishedDate,
            content: chunkContent.trim(),
            chunkIndex: idx,
            metadata: { docType },
            embedding: cachedVec || undefined,
          });
        });
      }

      this.chunks = loadedChunks;
      this.isInitialized = true;
      const chunksWithEmbeddings = this.chunks.filter((c) => c.embedding && c.embedding.length > 0).length;
      console.log(`[RAG Engine] Initialized ${this.chunks.length} chunks (${chunksWithEmbeddings} with precomputed 3072d embeddings).`);
    } catch (e) {
      console.error("[RAG Engine] Failed to initialize RAG in-memory engine:", e);
    }
  }

  public getAllChunks(): KnowledgeChunk[] {
    this.initialize();
    return this.chunks;
  }

  public getSources(): Citation[] {
    this.initialize();
    const map = new Map<string, Citation>();
    for (const chunk of this.chunks) {
      if (!map.has(chunk.sourceId)) {
        map.set(chunk.sourceId, {
          sourceId: chunk.sourceId,
          title: chunk.sourceTitle,
          issuingAuthority: chunk.issuingAuthority,
          url: chunk.url,
          tier: chunk.tier,
          publishedDate: chunk.publishedDate,
          lastVerified: "2024-01-15",
          jurisdiction: chunk.jurisdiction,
        });
      }
    }
    return Array.from(map.values());
  }

  /**
   * Hybrid Search: Semantic Vector Cosine Similarity + Lexical Overlap + Domain Boosting
   */
  public async search(
    queryText: string,
    topK = CONFIG.RAG.TOP_K,
    jurisdiction?: string | null,
    category?: string | null
  ): Promise<{
    chunks: KnowledgeChunk[];
    citations: Citation[];
    reliability: ReliabilityInfo;
    contextText: string;
  }> {
    this.initialize();

    if (this.chunks.length === 0) {
      return {
        chunks: [],
        citations: [],
        reliability: {
          overallConfidence: 0.2,
          grounded: false,
          numSourcesUsed: 0,
          conflictingSources: false,
          uncertaintyNote: "No authoritative sources available in database.",
        },
        contextText: "",
      };
    }

    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await embedText(queryText);
    } catch (err) {
      console.warn("[RAG Search] Embedding generation failed for query, using keyword scoring:", err);
    }

    const queryTokens = this.tokenize(queryText);
    const lowerQuery = queryText.toLowerCase();
    const scored: ScoredChunk[] = [];

    for (const chunk of this.chunks) {
      // 1. Vector similarity
      let vectorSim = 0.4;
      if (
        queryEmbedding &&
        queryEmbedding.length > 0 &&
        chunk.embedding &&
        chunk.embedding.length === queryEmbedding.length
      ) {
        vectorSim = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // 2. Keyword overlap
      const chunkTokens = this.tokenize(chunk.content + " " + chunk.sourceTitle + " " + chunk.issuingAuthority);
      const keywordScore = this.computeKeywordOverlap(queryTokens, chunkTokens);

      // 3. Domain & Source specific boosting
      let domainBoost = 1.0;
      const src = chunk.sourceId.toLowerCase();

      // Tenant queries
      if (lowerQuery.includes("tenant") || lowerQuery.includes("rent") || lowerQuery.includes("deposit") || category === "tenant_rights") {
        if (src.includes("tenancy") || src.includes("rent")) {
          domainBoost *= 1.6;
        } else if (src.includes("cpgrams")) {
          domainBoost *= 0.6; // De-prioritize CPGRAMS for pure tenancy
        }
      }

      // Consumer queries
      if (lowerQuery.includes("consumer") || lowerQuery.includes("defective") || lowerQuery.includes("warranty") || lowerQuery.includes("refund") || lowerQuery.includes("phone") || category === "consumer_rights") {
        if (src.includes("consumer") || src.includes("nch_1915") || src.includes("edaakhil")) {
          domainBoost *= 1.6;
        } else if (src.includes("cpgrams")) {
          domainBoost *= 0.6; // De-prioritize CPGRAMS for consumer disputes
        }
      }

      // RTI queries
      if (lowerQuery.includes("rti") || lowerQuery.includes("information act") || lowerQuery.includes("cpio") || lowerQuery.includes("road") || category === "rti") {
        if (src.includes("rti")) {
          domainBoost *= 1.6;
        }
      }

      // PM-KISAN & Farmer welfare
      if (lowerQuery.includes("pm-kisan") || lowerQuery.includes("pmkisan") || lowerQuery.includes("farmer") || lowerQuery.includes("kisan") || lowerQuery.includes("installment")) {
        if (src.includes("pm_kisan")) {
          domainBoost *= 2.0;
        }
      }

      // Ration / NFSA
      if (lowerQuery.includes("ration") || lowerQuery.includes("pds") || lowerQuery.includes("nfsa") || lowerQuery.includes("food security")) {
        if (src.includes("nfsa_ration_card")) {
          domainBoost *= 2.0;
        }
      }

      // Ayushman Bharat
      if (lowerQuery.includes("ayushman") || lowerQuery.includes("pmjay") || lowerQuery.includes("health insurance") || lowerQuery.includes("hospital")) {
        if (src.includes("ayushman_bharat")) {
          domainBoost *= 2.0;
        }
      }

      // PMAY Gramin
      if (lowerQuery.includes("pmay") || lowerQuery.includes("awas") || lowerQuery.includes("housing")) {
        if (src.includes("pmay_gramin")) {
          domainBoost *= 2.0;
        }
      }

      // Aadhaar
      if (lowerQuery.includes("aadhaar") || lowerQuery.includes("uidai") || lowerQuery.includes("biometric")) {
        if (src.includes("uidai_aadhaar")) {
          domainBoost *= 2.0;
        }
      }

      // Labour / Wages / PF
      if (lowerQuery.includes("wage") || lowerQuery.includes("salary") || lowerQuery.includes("epfo") || lowerQuery.includes("pf") || category === "workplace_rights") {
        if (src.includes("wages") || src.includes("labour") || src.includes("epfo")) {
          domainBoost *= 1.6;
        }
      }

      // 4. Jurisdiction boost & penalty
      if (jurisdiction) {
        const normJuris = jurisdiction.toLowerCase();
        const chunkJuris = chunk.jurisdiction.toLowerCase();
        if (chunkJuris.includes(normJuris) || normJuris.includes(chunkJuris)) {
          domainBoost *= 1.4;
        } else if (
          (normJuris.includes("karnataka") || normJuris.includes("bangalore")) &&
          (src.includes("punjab") || src.includes("delhi") || src.includes("maharashtra"))
        ) {
          domainBoost *= 0.4; // Penalize conflicting state acts
        }
      }

      // 5. Tier weight
      const tierWeight = CONFIG.RAG.TIER_WEIGHTS[chunk.tier] || 1.0;

      // Combined score
      const combinedScore =
        (vectorSim * CONFIG.RAG.VECTOR_WEIGHT + keywordScore * CONFIG.RAG.KEYWORD_WEIGHT) *
        tierWeight *
        domainBoost;

      scored.push({
        chunk,
        vectorSimilarity: vectorSim,
        keywordScore,
        domainBoost,
        combinedScore,
      });
    }

    // Sort descending by combined score
    scored.sort((a, b) => b.combinedScore - a.combinedScore);

    const topResults = scored.slice(0, topK);
    const matchedChunks = topResults.map((s) => s.chunk);

    // Extract unique citations
    const citationMap = new Map<string, Citation>();
    for (const c of matchedChunks) {
      if (!citationMap.has(c.sourceId)) {
        citationMap.set(c.sourceId, {
          sourceId: c.sourceId,
          title: c.sourceTitle,
          issuingAuthority: c.issuingAuthority,
          url: c.url,
          tier: c.tier,
          publishedDate: c.publishedDate,
          lastVerified: "2024-01-15",
          jurisdiction: c.jurisdiction,
        });
      }
    }

    const citations = Array.from(citationMap.values());
    const topScore = topResults.length > 0 ? topResults[0].combinedScore : 0;
    const isGrounded = topScore >= 0.45;

    const reliability: ReliabilityInfo = {
      overallConfidence: Math.min(0.98, Math.max(0.45, Number((topScore * 1.1).toFixed(2)))),
      grounded: isGrounded,
      numSourcesUsed: citations.length,
      conflictingSources: false,
      uncertaintyNote: !isGrounded
        ? "No specific authoritative section with high similarity was found. Responses will clearly denote general guidance."
        : null,
    };

    const contextText = matchedChunks
      .map(
        (c) =>
          `[Source ID: ${c.sourceId} | Title: ${c.sourceTitle} | Authority: ${c.issuingAuthority} | Tier: ${c.tier} | URL: ${c.url}]\n${c.content}`
      )
      .join("\n\n---\n\n");

    // Required Diagnostic Logging
    console.log(`[RAG] Query: "${queryText.slice(0, 80)}..."`);
    console.log(`[RAG] Top result: "${topResults[0]?.chunk.sourceTitle}" (Score: ${topScore.toFixed(3)}, VectorSim: ${topResults[0]?.vectorSimilarity.toFixed(3)})`);
    console.log(`[RAG] Sources: ${citations.map((c) => c.sourceId).join(", ")}`);
    console.log(`[RAG] Grounded: ${isGrounded}`);

    return {
      chunks: matchedChunks,
      citations,
      reliability,
      contextText,
    };
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0.4;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  private computeKeywordOverlap(queryTokens: string[], docTokens: string[]): number {
    if (queryTokens.length === 0 || docTokens.length === 0) return 0.1;
    const docSet = new Set(docTokens);
    let matched = 0;
    for (const qt of queryTokens) {
      if (docSet.has(qt)) matched++;
    }
    return Math.min(1, matched / Math.max(1, Math.min(queryTokens.length, 6)));
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ""));
    return result;
  }
}

export const ragEngine = new RagEngine();
