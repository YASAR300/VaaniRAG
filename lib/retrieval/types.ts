/**
 * lib/retrieval/types.ts — Retrieval Orchestration Types (Phase 9)
 */

export type StrategyType = 'fixed' | 'semantic' | 'metadata' | 'hierarchical';

export interface RetrievalOptions {
  strategy?: StrategyType;       // Defaults to 'metadata' (configured per indexing report)
  topK?: number;                 // Initial candidate count (default: 5, single digit per organizer guidance)
  languageFilter?: string;       // BCP-47 / Indic language code (e.g. 'hi', 'ta', 'te')
  scoreThreshold?: number;       // Relevance threshold for "no good match" guardrail (default: 0.38)
  enableParentExpansion?: boolean; // For hierarchical strategy: attach parent chunk text (default: true)
}

export interface RetrievalTiming {
  embedMs: number;               // Query vector embedding duration
  searchMs: number;              // Vector search + language filtering duration
  rerankMs: number;              // Cross-encoder reranking duration
  parentLookupMs?: number;       // Parent context resolution duration (hierarchical strategy)
  totalMs: number;               // Full post-transcript retrieval duration
}

export interface RetrievedChunk {
  id: string;
  text: string;
  language: string;
  sourceRecordId: string;
  score: number;                 // Final score AFTER reranking (0.0 to 1.0)
  rawScore?: number;             // Pre-rerank vector similarity score
  parentChunkId?: string | null;
  parentChunkText?: string;      // Enriched parent text for hierarchical strategy
  metadata?: Record<string, unknown>;
}

export interface RetrievalResult {
  query: string;
  strategy: StrategyType;
  language: string;
  chunks: RetrievedChunk[];
  timing: RetrievalTiming;
  noRelevantContext: boolean;    // true if top score < scoreThreshold (signals guardrails to bypass LLM)
  topScore: number;
}
