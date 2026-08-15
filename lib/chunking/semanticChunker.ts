/**
 * lib/chunking/semanticChunker.ts — Strategy 2: Semantic Topic Chunker (Phase 7)
 *
 * Design Decisions:
 *   - Splits text into cohesive sentence units using Indic punctuation boundaries.
 *   - Computes semantic similarity between consecutive sentence vectors.
 *   - When similarity drops below a semantic coherence threshold (topic shift),
 *     a new chunk boundary is formed.
 *   - Soft constraints:
 *     - Minimum chunk size: 128 tokens (prevents fragmented single sentences).
 *     - Maximum chunk size: 640 tokens (prevents oversized runaway chunks).
 */

import { CleanedRecord, Chunk, ChunkingStrategy } from './types';
import {
  splitIndicSentences,
  estimateTokenCount,
  computeTFVector,
  computeSparseCosineSimilarity,
} from './tokenizerUtils';

export const SEMANTIC_MIN_TOKENS = 128;
export const SEMANTIC_MAX_TOKENS = 640;
export const SEMANTIC_SIMILARITY_THRESHOLD = 0.35; // Topic change threshold

export class SemanticChunker implements ChunkingStrategy {
  readonly name = 'semantic' as const;

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

    const totalTokens = estimateTokenCount(text);
    if (totalTokens <= SEMANTIC_MIN_TOKENS) {
      return [
        {
          id: `${record.id}-semantic-0`,
          text: text,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'semantic',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: record.query_context || null,
            parentChunkId: null,
            tokenCount: totalTokens,
            charCount: text.length,
            chunkIndex: 0,
            totalChunks: 1,
          },
        },
      ];
    }

    const sentences = splitIndicSentences(text);
    if (sentences.length <= 1) {
      return [
        {
          id: `${record.id}-semantic-0`,
          text: text,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'semantic',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: record.query_context || null,
            parentChunkId: null,
            tokenCount: totalTokens,
            charCount: text.length,
            chunkIndex: 0,
            totalChunks: 1,
          },
        },
      ];
    }

    // Vectorize sentences
    const vectors = sentences.map(s => computeTFVector(s));
    const tokenCounts = sentences.map(s => estimateTokenCount(s));

    const result: Chunk[] = [];
    let currentChunkSentences: string[] = [sentences[0]];
    let currentTokens = tokenCounts[0];
    let chunkIdx = 0;

    for (let i = 1; i < sentences.length; i++) {
      const prevVec = vectors[i - 1];
      const currVec = vectors[i];
      const sim = computeSparseCosineSimilarity(prevVec, currVec);
      const nextSentenceTokens = tokenCounts[i];

      // Check if we should split:
      // 1. Similarity is low (topic shift) AND we've met the minimum chunk size
      // 2. OR adding this sentence would exceed maximum token capacity
      const isTopicShift = sim < SEMANTIC_SIMILARITY_THRESHOLD && currentTokens >= SEMANTIC_MIN_TOKENS;
      const isOverMaxCapacity = currentTokens + nextSentenceTokens > SEMANTIC_MAX_TOKENS;

      if ((isTopicShift || isOverMaxCapacity) && currentChunkSentences.length > 0) {
        const chunkText = currentChunkSentences.join(' ');
        result.push({
          id: `${record.id}-semantic-${chunkIdx}`,
          text: chunkText,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'semantic',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: record.query_context || null,
            parentChunkId: null,
            tokenCount: currentTokens,
            charCount: chunkText.length,
            chunkIndex: chunkIdx,
            totalChunks: 0,
          },
        });
        chunkIdx++;
        currentChunkSentences = [];
        currentTokens = 0;
      }

      currentChunkSentences.push(sentences[i]);
      currentTokens += nextSentenceTokens;
    }

    // Flush any trailing sentences
    if (currentChunkSentences.length > 0) {
      const chunkText = currentChunkSentences.join(' ');
      result.push({
        id: `${record.id}-semantic-${chunkIdx}`,
        text: chunkText,
        language: record.language,
        sourceRecordId: record.id,
        strategy: 'semantic',
        metadata: {
          sourceLang: record.source_lang || 'en',
          targetLang: record.target_lang || record.language,
          queryContext: record.query_context || null,
          parentChunkId: null,
          tokenCount: currentTokens,
          charCount: chunkText.length,
          chunkIndex: chunkIdx,
          totalChunks: 0,
        },
      });
    }

    for (const c of result) {
      c.metadata.totalChunks = result.length;
    }

    return result;
  }
}
