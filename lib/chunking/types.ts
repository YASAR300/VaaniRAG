/**
 * lib/chunking/types.ts — Shared Types for Multi-Strategy Chunking Engine (Phase 7)
 */

export interface CleanedRecord {
  id: string;
  text: string;
  language: string;
  query_context?: string | null;
  source_lang?: string;
  target_lang?: string;
  is_selected?: boolean;
  meta?: Record<string, unknown>;
}

export interface ChunkMetadata {
  sourceLang: string;
  targetLang: string;
  queryContext?: string | null;
  parentChunkId?: string | null; // used by hierarchical chunker
  isParent?: boolean;           // used by hierarchical chunker
  tokenCount?: number;
  charCount?: number;
  chunkIndex?: number;
  totalChunks?: number;
  [key: string]: unknown;
}

export interface Chunk {
  id: string; // e.g. `${sourceRecordId}-${strategyName}-${chunkIndex}`
  text: string;
  language: string;
  sourceRecordId: string;
  strategy: 'fixed' | 'semantic' | 'metadata' | 'hierarchical';
  metadata: ChunkMetadata;
}

export interface ChunkingStrategy {
  name: Chunk['strategy'];
  chunk(records: CleanedRecord[]): Chunk[] | Promise<Chunk[]>;
}

export interface ChunkingStats {
  strategy: string;
  totalChunks: number;
  totalTokens: number;
  avgTokens: number;
  minTokens: number;
  maxTokens: number;
  byLanguage: Record<string, number>;
}
