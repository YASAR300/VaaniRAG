/**
 * lib/retrieval/retrieve.ts — Core Retrieval Orchestrator (Phase 9)
 *
 * Latency Budget Scope:
 *   - The 200ms budget covers everything POST-STT (Retrieval + LLM Generation ≤ 200ms).
 *   - This module's target is SUB-50ms (Embed + Search + Rerank) to maximize runway for generation.
 *
 * Default Strategy Decision:
 *   DEFAULT STRATEGY: 'metadata'
 *   Chosen based on reports/indexing_report.json — the metadata-aware strategy preserves natural
 *   passage boundaries from MSMARCO-XI without artificial splitting, attaches explicit language
 *   and query context tags for high-precision language filtering, and avoids the additional
 *   parent-lookup lookup overhead required by 'hierarchical' chunking.
 *
 * Dynamic Strategy Switching:
 *   The active strategy can be swapped dynamically via `process.env.RETRIEVAL_STRATEGY` or options.
 */

import * as fs from 'fs';
import * as path from 'path';
import { embed, embedSparse } from '../embeddings/embed';
import { rerank, CandidateChunk } from '../rerank/reranker';
import { getQdrantClient, QDRANT_COLLECTIONS, chunkIdToUUID } from '../qdrant/client';
import {
  RetrievalOptions,
  RetrievalResult,
  RetrievalTiming,
  RetrievedChunk,
  StrategyType,
} from './types';

// Default config values
export const DEFAULT_STRATEGY: StrategyType = (process.env.RETRIEVAL_STRATEGY as StrategyType) || 'metadata';
export const DEFAULT_TOP_K = 5;               // Single-digit per organizer guidance
export const DEFAULT_SCORE_THRESHOLD = 0.48;   // Calibrated threshold separating relevant context from off-topic noise

/**
 * Cache for local index files in memory for high-throughput sub-millisecond searches
 */
interface CacheEntry {
  mtime: number;
  points: Array<{ id: string; vector: number[]; payload: any }>;
}
const localIndexCache = new Map<string, CacheEntry>();

export function warmupRetrievalIndex(strategy: StrategyType = DEFAULT_STRATEGY): void {
  loadLocalIndex(strategy);
}

function loadLocalIndex(strategy: StrategyType): Array<{ id: string; vector: number[]; payload: any }> {
  const indexPath = path.join(process.cwd(), 'data', 'indexes', `${strategy}.index.jsonl`);
  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const stat = fs.statSync(indexPath);
  const cached = localIndexCache.get(strategy);
  if (cached && cached.mtime === stat.mtimeMs) {
    return cached.points;
  }

  const points: Array<{ id: string; vector: number[]; payload: any }> = [];
  const lines = fs.readFileSync(indexPath, 'utf-8').split('\n').filter(l => l.trim().length > 0);

  for (const line of lines) {
    try {
      points.push(JSON.parse(line));
    } catch {
      // ignore malformed lines
    }
  }

  localIndexCache.set(strategy, { mtime: stat.mtimeMs, points });
  return points;
}

/**
 * Execute vector search with optional language filtering.
 */
async function searchVectorIndex(
  queryVector: number[],
  queryText: string,
  strategy: StrategyType,
  topK: number,
  languageFilter?: string
): Promise<CandidateChunk[]> {
  const collectionName = QDRANT_COLLECTIONS[strategy] || `chunks_${strategy}`;
  const qdrant = getQdrantClient();

  // 1. Try Qdrant Server if responsive
  try {
    const filter = languageFilter
      ? {
          must: [
            {
              key: 'language',
              match: { value: languageFilter },
            },
          ],
        }
      : undefined;

    const searchResponse = await qdrant.search(collectionName, {
      vector: queryVector,
      limit: topK,
      filter,
      with_payload: true,
    });

    if (searchResponse && searchResponse.length > 0) {
      return searchResponse.map(res => ({
        id: res.payload?.chunkId as string || String(res.id),
        text: res.payload?.text as string || '',
        language: res.payload?.language as string || '',
        sourceRecordId: res.payload?.sourceRecordId as string || '',
        rawScore: res.score,
        parentChunkId: res.payload?.parentChunkId as string || null,
        metadata: res.payload as Record<string, unknown>,
      }));
    }
  } catch (err) {
    // Fall back to ultra-fast local index engine
  }

  // 2. High-speed local cosine vector search engine (< 5ms)
  const indexPoints = loadLocalIndex(strategy);
  if (indexPoints.length === 0) {
    return [];
  }

  // Filter by Indic language if specified; if English or cross-lingual, search across all 13 languages
  const isEnglishOrAll = !languageFilter || languageFilter === 'en' || languageFilter.startsWith('en') || languageFilter === 'all';
  let candidatePool = !isEnglishOrAll
    ? indexPoints.filter(p => p.payload?.language === languageFilter)
    : indexPoints;

  // Cross-lingual fallback: if filtered language has < 2 matches, search full index
  if (candidatePool.length < 2) {
    candidatePool = indexPoints;
  }

  // Calculate hybrid similarities (dense cosine + sparse BM25)
  const querySparse = embedSparse(queryText);
  const sparseMap = new Map<number, number>();
  for (let i = 0; i < querySparse.indices.length; i++) {
    sparseMap.set(querySparse.indices[i], querySparse.values[i]);
  }

  const scored = candidatePool.map(point => {
    const denseScore = computeCosine(queryVector, point.vector);
    let sparseScore = 0;
    if (point.sparse && Array.isArray(point.sparse.indices)) {
      for (let i = 0; i < point.sparse.indices.length; i++) {
        const idx = point.sparse.indices[i];
        if (sparseMap.has(idx)) {
          sparseScore += (sparseMap.get(idx)! * (point.sparse.values[i] || 1.0));
        }
      }
    }
    const normSparse = Math.min(1.0, sparseScore / Math.max(1, querySparse.indices.length * 1.5));
    const combinedScore = (denseScore * 0.70) + (normSparse * 0.30);

    return {
      id: point.payload?.chunkId || point.id,
      text: point.payload?.text || '',
      language: point.payload?.language || '',
      sourceRecordId: point.payload?.sourceRecordId || '',
      rawScore: Math.round(combinedScore * 1000) / 1000,
      parentChunkId: point.payload?.parentChunkId || null,
      metadata: point.payload || {},
    };
  });

  // Sort descending and take topK
  scored.sort((a, b) => b.rawScore - a.rawScore);
  return scored.slice(0, topK);
}

function computeCosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Retrieve relevant passages for a query with full timing instrumentation.
 */
export async function retrieve(
  queryText: string,
  detectedLanguage: string,
  options?: RetrievalOptions
): Promise<RetrievalResult> {
  const tTotalStart = performance.now();

  const strategy = options?.strategy || DEFAULT_STRATEGY;
  const topK = options?.topK || DEFAULT_TOP_K;
  const langFilter = options?.languageFilter || detectedLanguage;
  const isEnglishOrCross = !detectedLanguage || detectedLanguage.startsWith('en');
  const scoreThreshold = options?.scoreThreshold ?? (isEnglishOrCross ? 0.28 : DEFAULT_SCORE_THRESHOLD);

  // ── 1. Embed Query Vector ─────────────────────────────────────────────
  const tEmbedStart = performance.now();
  const queryVector = await embed(queryText, { language: detectedLanguage });
  const embedMs = Math.round((performance.now() - tEmbedStart) * 100) / 100;

  // ── 2. Vector Search (with Language Filter) ──────────────────────────
  const tSearchStart = performance.now();
  const candidates = await searchVectorIndex(queryVector, queryText, strategy, topK, langFilter);
  const searchMs = Math.round((performance.now() - tSearchStart) * 100) / 100;

  // ── 3. Cross-Encoder Reranking ────────────────────────────────────────
  const tRerankStart = performance.now();
  const reranked = await rerank(queryText, candidates);
  const rerankMs = Math.round((performance.now() - tRerankStart) * 100) / 100;

  // ── 4. Hierarchical Parent Context Expansion ──────────────────────────
  let parentLookupMs = 0;
  const finalChunks: RetrievedChunk[] = [];

  if (strategy === 'hierarchical' && options?.enableParentExpansion !== false) {
    const tParentStart = performance.now();
    const parentsFile = path.join(process.cwd(), 'data', 'chunks', 'hierarchical_parents.jsonl');
    const parentMap = new Map<string, string>();

    if (fs.existsSync(parentsFile)) {
      const parentLines = fs.readFileSync(parentsFile, 'utf-8').split('\n').filter(l => l.trim().length > 0);
      for (const pl of parentLines) {
        try {
          const parsed = JSON.parse(pl);
          parentMap.set(parsed.id, parsed.text);
        } catch {}
      }
    }

    for (const item of reranked) {
      const parentText = item.parentChunkId ? parentMap.get(item.parentChunkId) : undefined;
      finalChunks.push({
        id: item.id,
        text: item.text,
        language: item.language,
        sourceRecordId: item.sourceRecordId,
        score: item.score,
        rawScore: item.rawScore,
        parentChunkId: item.parentChunkId,
        parentChunkText: parentText || item.text,
        metadata: item.metadata,
      });
    }
    parentLookupMs = Math.round((performance.now() - tParentStart) * 100) / 100;
  } else {
    for (const item of reranked) {
      finalChunks.push({
        id: item.id,
        text: item.text,
        language: item.language,
        sourceRecordId: item.sourceRecordId,
        score: item.score,
        rawScore: item.rawScore,
        parentChunkId: item.parentChunkId,
        metadata: item.metadata,
      });
    }
  }

  const totalMs = Math.round((performance.now() - tTotalStart) * 100) / 100;

  // ── 5. "No Good Match" Threshold Check ────────────────────────────────
  const topScore = finalChunks.length > 0 ? finalChunks[0].score : 0;
  const noRelevantContext = finalChunks.length === 0 || topScore < scoreThreshold;

  const timing: RetrievalTiming = {
    embedMs,
    searchMs,
    rerankMs,
    totalMs,
    ...(parentLookupMs > 0 ? { parentLookupMs } : {}),
  };

  return {
    query: queryText,
    strategy,
    language: detectedLanguage,
    chunks: finalChunks,
    timing,
    noRelevantContext,
    topScore,
  };
}
