/**
 * lib/chunking/hierarchicalChunker.ts — Strategy 4: Hierarchical Parent-Child Chunker (Phase 7)
 *
 * Architecture:
 *   - Parent Chunk (512–768 tokens): Complete passage context window stored for answer-generation
 *     context expansion (Phase 10).
 *   - Child Chunks (128–180 tokens): Fine-grained search units with `parentChunkId` linking
 *     back to the parent chunk.
 *
 * Indexing Distinction:
 *   - Child chunks are embedded and indexed for vector similarity search (Phase 8).
 *   - Parent chunks are stored in Qdrant payload or lookup store for immediate context expansion
 *     when a child chunk matches a query.
 */

import { CleanedRecord, Chunk, ChunkingStrategy } from './types';
import { splitIndicSentences, estimateTokenCount } from './tokenizerUtils';

export const HIERARCHICAL_PARENT_TARGET = 512;
export const HIERARCHICAL_CHILD_TARGET = 160;

export class HierarchicalChunker implements ChunkingStrategy {
  readonly name = 'hierarchical' as const;

  chunk(records: CleanedRecord[]): Chunk[] {
    const chunks: Chunk[] = [];

    for (const record of records) {
      const recordChunks = this.chunkRecord(record);
      chunks.push(...recordChunks);
    }

    return chunks;
  }

  private chunkRecord(record: CleanedRecord): Chunk[] {
    const text = record.text?.trim() || '';
    if (!text) return [];

    const parentId = `${record.id}-hierarchical-parent-0`;
    const totalTokens = estimateTokenCount(text);

    // 1. Create the Parent Chunk (The broad context unit)
    const parentChunk: Chunk = {
      id: parentId,
      text: text,
      language: record.language,
      sourceRecordId: record.id,
      strategy: 'hierarchical',
      metadata: {
        sourceLang: record.source_lang || 'en',
        targetLang: record.target_lang || record.language,
        queryContext: record.query_context || null,
        parentChunkId: null,
        isParent: true,
        tokenCount: totalTokens,
        charCount: text.length,
        chunkIndex: 0,
        totalChunks: 1,
      },
    };

    // 2. Create Child Chunks (Fine-grained search units: ~128–180 tokens)
    const sentences = splitIndicSentences(text);
    const childChunks: Chunk[] = [];

    let currentSentences: string[] = [];
    let currentTokens = 0;
    let childIdx = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i];
      const sentTokens = estimateTokenCount(sent);

      if (currentTokens + sentTokens > HIERARCHICAL_CHILD_TARGET && currentSentences.length > 0) {
        const childText = currentSentences.join(' ');
        childChunks.push({
          id: `${record.id}-hierarchical-child-${childIdx}`,
          text: childText,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'hierarchical',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: record.query_context || null,
            parentChunkId: parentId,
            isParent: false,
            tokenCount: currentTokens,
            charCount: childText.length,
            chunkIndex: childIdx,
            totalChunks: 0,
          },
        });
        childIdx++;
        currentSentences = [];
        currentTokens = 0;
      }

      currentSentences.push(sent);
      currentTokens += sentTokens;
    }

    if (currentSentences.length > 0) {
      const childText = currentSentences.join(' ');
      childChunks.push({
        id: `${record.id}-hierarchical-child-${childIdx}`,
        text: childText,
        language: record.language,
        sourceRecordId: record.id,
        strategy: 'hierarchical',
        metadata: {
          sourceLang: record.source_lang || 'en',
          targetLang: record.target_lang || record.language,
          queryContext: record.query_context || null,
          parentChunkId: parentId,
          isParent: false,
          tokenCount: currentTokens,
          charCount: childText.length,
          chunkIndex: childIdx,
          totalChunks: 0,
        },
      });
    }

    for (const c of childChunks) {
      c.metadata.totalChunks = childChunks.length;
    }

    // Return Parent followed by its Children
    return [parentChunk, ...childChunks];
  }
}
