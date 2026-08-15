/**
 * lib/chunking/fixedSizeChunker.ts — Strategy 1: Fixed-Size Token Chunker (Phase 7)
 *
 * Parameters:
 *   - Target Chunk Size: 512 tokens
 *   - Overlap: 18% (~92 tokens)
 *
 * Design Decisions:
 *   - Serves as the control/baseline strategy for the RAG benchmark.
 *   - 512 tokens was chosen deliberately per organizer guidance: fewer, richer chunks
 *     mean fewer vectors in the index and faster post-transcript retrieval under 200ms budget.
 *   - 18% overlap ensures semantic continuity across chunk boundaries without excessive duplication.
 *   - Splits along sentence boundaries rather than cutting words in half mid-character.
 */

import { CleanedRecord, Chunk, ChunkingStrategy } from './types';
import { splitIndicSentences, estimateTokenCount } from './tokenizerUtils';

export const FIXED_TARGET_TOKENS = 512;
export const FIXED_OVERLAP_PERCENT = 0.18; // 18% overlap (~92 tokens)
export const FIXED_OVERLAP_TOKENS = Math.round(FIXED_TARGET_TOKENS * FIXED_OVERLAP_PERCENT);

export class FixedSizeChunker implements ChunkingStrategy {
  readonly name = 'fixed' as const;

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

    const totalRecordTokens = estimateTokenCount(text);

    // If passage is already within the 512 token budget, keep intact as a single rich chunk
    if (totalRecordTokens <= FIXED_TARGET_TOKENS) {
      return [
        {
          id: `${record.id}-fixed-0`,
          text: text,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'fixed',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: record.query_context || null,
            parentChunkId: null,
            tokenCount: totalRecordTokens,
            charCount: text.length,
            chunkIndex: 0,
            totalChunks: 1,
          },
        },
      ];
    }

    // Otherwise, perform sentence-aware fixed sliding window
    const sentences = splitIndicSentences(text);
    const result: Chunk[] = [];

    let currentSentences: string[] = [];
    let currentTokens = 0;
    let chunkIdx = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i];
      const sentTokens = estimateTokenCount(sent);

      // If adding sentence exceeds 512 tokens and we already have content
      if (currentTokens + sentTokens > FIXED_TARGET_TOKENS && currentSentences.length > 0) {
        const chunkText = currentSentences.join(' ');
        result.push({
          id: `${record.id}-fixed-${chunkIdx}`,
          text: chunkText,
          language: record.language,
          sourceRecordId: record.id,
          strategy: 'fixed',
          metadata: {
            sourceLang: record.source_lang || 'en',
            targetLang: record.target_lang || record.language,
            queryContext: record.query_context || null,
            parentChunkId: null,
            tokenCount: currentTokens,
            charCount: chunkText.length,
            chunkIndex: chunkIdx,
            totalChunks: 0, // updated below
          },
        });
        chunkIdx++;

        // Roll back sentences to create 18% overlap (~92 tokens)
        const overlapSentences: string[] = [];
        let overlapCount = 0;

        for (let j = currentSentences.length - 1; j >= 0; j--) {
          const s = currentSentences[j];
          const st = estimateTokenCount(s);
          if (overlapCount + st <= FIXED_OVERLAP_TOKENS || overlapSentences.length === 0) {
            overlapSentences.unshift(s);
            overlapCount += st;
          } else {
            break;
          }
        }

        currentSentences = [...overlapSentences];
        currentTokens = overlapCount;
      }

      currentSentences.push(sent);
      currentTokens += sentTokens;
    }

    // Flush remaining sentences
    if (currentSentences.length > 0) {
      const chunkText = currentSentences.join(' ');
      result.push({
        id: `${record.id}-fixed-${chunkIdx}`,
        text: chunkText,
        language: record.language,
        sourceRecordId: record.id,
        strategy: 'fixed',
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

    // Update totalChunks
    for (const c of result) {
      c.metadata.totalChunks = result.length;
    }

    return result;
  }
}
