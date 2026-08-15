/**
 * lib/observability/tracedPipeline.ts — Traced Sequencing Pipeline Wrapper (Phase 11)
 *
 * NOTE: This is a minimal sequencing wrapper built to give the trace-storage system
 * something real to write from, ahead of the full orchestration harness (built in
 * Phase 13, which formalizes this same sequence with retries, structured error recovery,
 * and richer typed I/O between stages).
 */

import { retrieve, RetrievalResult, RetrievalOptions } from '../retrieval/retrieve';
import { generateAnswer, GenerationResult } from '../generation/answer';
import { saveTrace, PipelineTrace, StageTiming } from './traceStore';

export interface TracedPipelineOptions {
  strategy?: 'fixed' | 'semantic' | 'metadata' | 'hierarchical';
  topK?: number;
  scoreThreshold?: number;
  sttDurationMs?: number;
}

export interface TracedPipelineOutput {
  result: RetrievalResult;
  generation: GenerationResult;
  trace: PipelineTrace;
}

export async function runTracedQuery(
  transcript: string,
  detectedLanguage: string,
  options?: TracedPipelineOptions
): Promise<TracedPipelineOutput> {
  const traceId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startedAt = new Date().toISOString();
  const tTotalStart = performance.now();

  let outcome: PipelineTrace['outcome'] = 'answered';
  let errorDetail: string | undefined = undefined;

  // 1. Stage: Retrieval (Phase 9)
  const tRetStart = performance.now();
  let retrievalResult: RetrievalResult;
  try {
    retrievalResult = await retrieve(transcript, detectedLanguage, {
      strategy: options?.strategy || 'metadata',
      topK: options?.topK || 4,
      scoreThreshold: options?.scoreThreshold,
    });
  } catch (err: any) {
    const retDurationMs = Math.round((performance.now() - tRetStart) * 100) / 100;
    const failedTrace: PipelineTrace = {
      id: traceId,
      createdAt: startedAt,
      question: { transcript, detectedLanguage },
      stages: {
        retrieval: {
          startedAt,
          durationMs: retDurationMs,
          status: 'error',
          strategy: options?.strategy || 'metadata',
          topK: options?.topK || 4,
          resultCount: 0,
          noRelevantContext: true,
          subSteps: { embedMs: 0, searchMs: 0, rerankMs: 0 },
        },
      },
      totals: {
        postSttMs: retDurationMs,
        fullRequestMs: (options?.sttDurationMs || 0) + retDurationMs,
      },
      outcome: 'error',
      errorDetail: `Retrieval failed: ${err?.message || err}`,
    };
    saveTrace(failedTrace); // non-blocking
    throw err;
  }
  const retDurationMs = Math.round((performance.now() - tRetStart) * 100) / 100;

  const retrievalTiming: StageTiming & {
    strategy: string;
    topK: number;
    resultCount: number;
    noRelevantContext: boolean;
    subSteps: { embedMs: number; searchMs: number; rerankMs: number };
  } = {
    startedAt,
    durationMs: retDurationMs,
    status: 'success',
    strategy: retrievalResult.strategy,
    topK: options?.topK || 4,
    resultCount: retrievalResult.chunks.length,
    noRelevantContext: retrievalResult.noRelevantContext,
    subSteps: {
      embedMs: retrievalResult.timing.embedMs,
      searchMs: retrievalResult.timing.searchMs,
      rerankMs: retrievalResult.timing.rerankMs,
    },
  };

  // Check if query was declined due to no relevant context in dataset
  if (retrievalResult.noRelevantContext || retrievalResult.chunks.length === 0) {
    outcome = 'declined-no-context';
    const totalPostSttMs = retDurationMs;
    const emptyGenResult: GenerationResult = {
      answer: 'I do not have sufficient verified context in the dataset to answer this question.',
      citedChunkIds: [],
      confidence: 'low',
      timing: { requestMs: 0 },
    };

    const trace: PipelineTrace = {
      id: traceId,
      createdAt: startedAt,
      question: { transcript, detectedLanguage },
      stages: {
        ...(options?.sttDurationMs ? {
          stt: {
            startedAt,
            durationMs: options.sttDurationMs,
            status: 'success',
          },
        } : {}),
        retrieval: retrievalTiming,
      },
      totals: {
        postSttMs: totalPostSttMs,
        fullRequestMs: Math.round(((options?.sttDurationMs || 0) + totalPostSttMs) * 100) / 100,
      },
      outcome,
    };

    saveTrace(trace); // fire-and-forget
    return {
      result: retrievalResult,
      generation: emptyGenResult,
      trace,
    };
  }

  // 2. Stage: Grounded LLM Generation (Phase 10)
  const tGenStart = performance.now();
  let genResult: GenerationResult;
  try {
    genResult = await generateAnswer({
      question: transcript,
      detectedLanguage,
      retrievedChunks: retrievalResult.chunks,
    });
  } catch (err: any) {
    const genDurationMs = Math.round((performance.now() - tGenStart) * 100) / 100;
    outcome = 'error';
    errorDetail = `Generation failed: ${err?.message || err}`;
    const totalPostSttMs = Math.round((performance.now() - tTotalStart) * 100) / 100;

    const trace: PipelineTrace = {
      id: traceId,
      createdAt: startedAt,
      question: { transcript, detectedLanguage },
      stages: {
        retrieval: retrievalTiming,
        generation: {
          startedAt: new Date().toISOString(),
          durationMs: genDurationMs,
          status: 'error',
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          citedChunkIds: [],
          confidence: 'low',
        },
      },
      totals: {
        postSttMs: totalPostSttMs,
        fullRequestMs: Math.round(((options?.sttDurationMs || 0) + totalPostSttMs) * 100) / 100,
      },
      outcome,
      errorDetail,
    };
    saveTrace(trace);
    throw err;
  }
  const genDurationMs = Math.round((performance.now() - tGenStart) * 100) / 100;
  const totalPostSttMs = Math.round((performance.now() - tTotalStart) * 100) / 100;

  const trace: PipelineTrace = {
    id: traceId,
    createdAt: startedAt,
    question: { transcript, detectedLanguage },
    stages: {
      ...(options?.sttDurationMs ? {
        stt: {
          startedAt,
          durationMs: options.sttDurationMs,
          status: 'success',
        },
      } : {}),
      retrieval: retrievalTiming,
      generation: {
        startedAt: new Date().toISOString(),
        durationMs: genDurationMs,
        status: 'success',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        timeToFirstTokenMs: genResult.timing.timeToFirstTokenMs,
        citedChunkIds: genResult.citedChunkIds,
        confidence: genResult.confidence,
      },
    },
    totals: {
      postSttMs: totalPostSttMs,
      fullRequestMs: Math.round(((options?.sttDurationMs || 0) + totalPostSttMs) * 100) / 100,
    },
    outcome,
  };

  // Fire-and-forget trace persistence
  saveTrace(trace);

  return {
    result: retrievalResult,
    generation: genResult,
    trace,
  };
}
