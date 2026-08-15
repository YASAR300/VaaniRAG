/**
 * lib/chunking/index.ts — Multi-Strategy Chunking Engine Entry Point (Phase 7)
 */

export * from './types';
export * from './tokenizerUtils';
export * from './fixedSizeChunker';
export * from './semanticChunker';
export * from './metadataChunker';
export * from './hierarchicalChunker';

import { ChunkingStrategy } from './types';
import { FixedSizeChunker } from './fixedSizeChunker';
import { SemanticChunker } from './semanticChunker';
import { MetadataAwareChunker } from './metadataChunker';
import { HierarchicalChunker } from './hierarchicalChunker';

export const CHUNKING_STRATEGIES: Record<string, ChunkingStrategy> = {
  fixed: new FixedSizeChunker(),
  semantic: new SemanticChunker(),
  metadata: new MetadataAwareChunker(),
  hierarchical: new HierarchicalChunker(),
};

export function getChunkingStrategy(name: string): ChunkingStrategy {
  const strategy = CHUNKING_STRATEGIES[name];
  if (!strategy) {
    throw new Error(`Unknown chunking strategy: "${name}". Available strategies: ${Object.keys(CHUNKING_STRATEGIES).join(', ')}`);
  }
  return strategy;
}
