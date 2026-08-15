/**
 * lib/generation/types.ts — Answer Generation Types & Interfaces (Phase 10)
 */

import { RetrievedChunk } from '../retrieval/types';

export interface GenerationInput {
  question: string;                  // Transcribed user question
  detectedLanguage: string;          // Language code (e.g. 'hi', 'ta', 'te', 'bn', 'en')
  retrievedChunks: RetrievedChunk[];  // Ranked candidate chunks from Phase 9
  model?: string;                    // Optional override (defaults to process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
  maxTokens?: number;                // Max tokens to generate (default: 150 for concise answers)
  temperature?: number;              // Low temperature (default: 0.1) for strictly grounded facts
}

export interface GenerationResult {
  answer: string;                    // Grounded answer text
  citedChunkIds: string[];           // Chunk IDs explicitly used/cited by the model
  confidence: 'high' | 'medium' | 'low'; // Model's self-reported grounding confidence
  timing: {
    requestMs: number;               // Full wall-clock duration of the generation call
    timeToFirstTokenMs?: number;     // Time from request launch to first received token
  };
  raw?: unknown;                     // Raw response metadata from Groq
}

export interface GenerationStreamChunk {
  type: 'token' | 'done' | 'error';
  token?: string;
  accumulatedAnswer?: string;
  result?: GenerationResult;
  error?: string;
}
