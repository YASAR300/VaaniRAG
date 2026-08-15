/**
 * lib/chunking/metadataChunker.ts — Strategy 3: Structure- & Metadata-Aware Chunker (Phase 7)
 *
 * Design Decisions:
 *   - Respects natural passage and document unit boundaries from the MSMARCO-XI dataset.
 *   - Prioritizes preserving whole passages intact so factual coherence is never fragmented.
 *   - Attaches explicit, first-class metadata: `sourceLang`, `targetLang`, `queryContext`,
 *     and `isSelected` ground-truth indicators.
 *   - Specially tailored for language-filtered retrieval (Phase 9), enabling high-precision
 *     multilingual queries filtered by BCP-47 / Indic language tags.
 */

import { CleanedRecord, Chunk, ChunkingStrategy } from './types';
import { splitIndicSentences, estimateTokenCount } from './tokenizerUtils';

export const METADATA_MAX_TOKENS = 512;

export class MetadataAwareChunker implements ChunkingStrategy {
  readonly name = 'metadata' as const;

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
    const queryContext = record.query_context?.trim() || null;

    // If passage is within max token limit, preserve the full passage intact
    if (totalTokens <= METADATA_MAX_TOKENS) {
      return [
        {
          id: `${record.id}-metadata-0`,
          text: text,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'metadata',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: queryContext,
            englishText: (record as any).english_text || null,
            isSelected: record.is_selected ?? false,
            parentChunkId: null,
            hasQueryAnchor: !!queryContext,
            tokenCount: totalTokens,
            charCount: text.length,
            chunkIndex: 0,
            totalChunks: 1,
            meta: record.meta || {},
          },
        },
      ];
    }

    // If passage exceeds 512 tokens, break cleanly at sentence boundaries
    const sentences = splitIndicSentences(text);
    const result: Chunk[] = [];
    let currentSentences: string[] = [];
    let currentTokens = 0;
    let chunkIdx = 0;

    for (const sentence of sentences) {
      const sentTokens = estimateTokenCount(sentence);

      if (currentTokens + sentTokens > METADATA_MAX_TOKENS && currentSentences.length > 0) {
        const chunkText = currentSentences.join(' ');
        result.push({
          id: `${record.id}-metadata-${chunkIdx}`,
          text: chunkText,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'metadata',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: queryContext,
            isSelected: record.is_selected ?? false,
            parentChunkId: null,
            hasQueryAnchor: !!queryContext,
            tokenCount: currentTokens,
            charCount: chunkText.length,
            chunkIndex: chunkIdx,
            totalChunks: 0,
            meta: record.meta || {},
          },
        });
        chunkIdx++;
        currentSentences = [];
        currentTokens = 0;
      }

      currentSentences.push(sentence);
      currentTokens += sentTokens;
    }

    if (currentSentences.length > 0) {
      const chunkText = currentSentences.join(' ');
      result.push({
        id: `${record.id}-metadata-${chunkIdx}`,
        text: chunkText,
        language: record.language,
        sourceRecordId: record.id,
        strategy: 'metadata',
        metadata: {
          sourceLang: record.source_lang || 'en',
          targetLang: record.target_lang || record.language,
          queryContext: queryContext,
          isSelected: record.is_selected ?? false,
          parentChunkId: null,
          hasQueryAnchor: !!queryContext,
          tokenCount: currentTokens,
          charCount: chunkText.length,
          chunkIndex: chunkIdx,
          totalChunks: 0,
          meta: record.meta || {},
        },
      });
    }

    for (const c of result) {
      c.metadata.totalChunks = result.length;
    }

    return result;
  }
}
