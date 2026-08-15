/**
 * lib/observability/traceStore.ts — Canonical Trace Storage & Observability Layer (Phase 11)
 *
 * Provides non-blocking, fire-and-forget persistent trace recording for every pipeline request.
 * Computes P50 / P70 / P100 postSttMs latency percentiles and per-stage diagnostic metrics.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StageTiming {
  startedAt: string; // ISO timestamp
  durationMs: number;
  status: 'success' | 'error' | 'skipped';
}

export interface PipelineTrace {
  id: string; // unique per end-to-end request
  createdAt: string; // ISO timestamp
  question: {
    transcript: string;
    detectedLanguage: string;
  };
  stages: {
    stt?: StageTiming;
    guardrailInput?: StageTiming; // reserved for Guardrails phase
    retrieval?: StageTiming & {
      strategy: string;
      topK: number;
      resultCount: number;
      noRelevantContext: boolean;
      subSteps: { embedMs: number; searchMs: number; rerankMs: number };
    };
    guardrailContext?: StageTiming; // reserved for Guardrails phase
    generation?: StageTiming & {
      model: string;
      timeToFirstTokenMs?: number;
      citedChunkIds: string[];
      confidence: 'high' | 'medium' | 'low';
    };
    guardrailOutput?: StageTiming; // reserved for Guardrails phase
  };
  totals: {
    postSttMs: number; // Retrieval + Generation (Post-STT 200ms target)
    fullRequestMs: number; // Includes STT if present
  };
  outcome: 'answered' | 'declined-off-topic' | 'declined-no-context' | 'declined-unsafe' | 'error';
  errorDetail?: string;
}

export interface AggregateStats {
  totalRequests: number;
  outcomeBreakdown: Record<PipelineTrace['outcome'], number>;
  latency: {
    postSttMs: { p50: number; p70: number; p100: number; mean: number };
  };
  stageBreakdown: {
    stt?: { avgMs: number; p90Ms: number };
    retrieval?: { avgMs: number; p90Ms: number };
    generation?: { avgMs: number; p90Ms: number };
  };
}

const TRACES_DIR = path.join(process.cwd(), 'data', 'traces');
const TRACES_FILE = path.join(TRACES_DIR, 'traces.jsonl');

// In-memory ring buffer of recent traces for instantaneous access (<1ms)
const MAX_MEM_TRACES = 2000;
let inMemoryTraces: PipelineTrace[] | null = null;

function ensureTracesLoaded(): PipelineTrace[] {
  if (inMemoryTraces !== null) {
    return inMemoryTraces;
  }

  inMemoryTraces = [];
  if (!fs.existsSync(TRACES_FILE)) {
    return inMemoryTraces;
  }

  try {
    const raw = fs.readFileSync(TRACES_FILE, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      try {
        inMemoryTraces.push(JSON.parse(line));
      } catch {}
    }
  } catch (err) {
    console.warn('[TraceStore] Failed to load initial traces from disk:', err);
  }

  return inMemoryTraces;
}

/**
 * Save a trace to persistent storage.
 * CRITICAL CONSTRAINT: Must be non-blocking and fire-and-forget.
 */
export async function saveTrace(trace: PipelineTrace): Promise<void> {
  // 1. Synchronously update in-memory cache for live dashboard visibility
  const traces = ensureTracesLoaded();
  traces.push(trace);
  if (traces.length > MAX_MEM_TRACES) {
    traces.shift();
  }

  // 2. Asynchronously append to file on disk without blocking caller
  setImmediate(() => {
    try {
      if (!fs.existsSync(TRACES_DIR)) {
        fs.mkdirSync(TRACES_DIR, { recursive: true });
      }
      const line = JSON.stringify(trace) + '\n';
      fs.appendFileSync(TRACES_FILE, line, 'utf-8');
    } catch (err) {
      console.warn('[TraceStore] Failed to persist trace record asynchronously:', err);
    }
  });
}

/**
 * Retrieve a specific trace by ID.
 */
export async function getTrace(id: string): Promise<PipelineTrace | null> {
  const traces = ensureTracesLoaded();
  const found = traces.find(t => t.id === id);
  return found || null;
}

/**
 * List traces matching optional filters (limit, since, outcome).
 */
export async function listTraces(options?: {
  limit?: number;
  since?: string;
  outcome?: PipelineTrace['outcome'];
}): Promise<PipelineTrace[]> {
  let list = [...ensureTracesLoaded()];

  if (options?.since) {
    const sinceTime = new Date(options.since).getTime();
    list = list.filter(t => new Date(t.createdAt).getTime() >= sinceTime);
  }

  if (options?.outcome) {
    list = list.filter(t => t.outcome === options.outcome);
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const limit = options?.limit || 100;
  return list.slice(0, limit);
}

/**
 * Compute aggregate statistics over stored traces.
 */
export async function getAggregateStats(options?: { since?: string }): Promise<AggregateStats> {
  let list = ensureTracesLoaded();

  if (options?.since) {
    const sinceTime = new Date(options.since).getTime();
    list = list.filter(t => new Date(t.createdAt).getTime() >= sinceTime);
  }

  const totalRequests = list.length;
  const outcomeBreakdown: Record<PipelineTrace['outcome'], number> = {
    'answered': 0,
    'declined-off-topic': 0,
    'declined-no-context': 0,
    'declined-unsafe': 0,
    'error': 0,
  };

  const postSttValues: number[] = [];
  const sttDurations: number[] = [];
  const retDurations: number[] = [];
  const genDurations: number[] = [];

  for (const t of list) {
    if (outcomeBreakdown[t.outcome] !== undefined) {
      outcomeBreakdown[t.outcome]++;
    }

    if (typeof t.totals?.postSttMs === 'number') {
      postSttValues.push(t.totals.postSttMs);
    }

    if (t.stages?.stt?.durationMs) {
      sttDurations.push(t.stages.stt.durationMs);
    }

    if (t.stages?.retrieval?.durationMs) {
      retDurations.push(t.stages.retrieval.durationMs);
    }

    if (t.stages?.generation?.durationMs) {
      genDurations.push(t.stages.generation.durationMs);
    }
  }

  // Calculate percentiles helper
  const calcStats = (vals: number[]) => {
    if (vals.length === 0) return { p50: 0, p70: 0, p90: 0, p100: 0, mean: 0 };
    const sorted = [...vals].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
    const p70 = sorted[Math.floor(sorted.length * 0.70)] || 0;
    const p90 = sorted[Math.floor(sorted.length * 0.90)] || 0;
    const p100 = sorted[sorted.length - 1] || 0;
    const mean = Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 10) / 10;
    return { p50, p70, p90, p100, mean };
  };

  const postSttStats = calcStats(postSttValues);
  const sttStats = calcStats(sttDurations);
  const retStats = calcStats(retDurations);
  const genStats = calcStats(genDurations);

  return {
    totalRequests,
    outcomeBreakdown,
    latency: {
      postSttMs: {
        p50: postSttStats.p50,
        p70: postSttStats.p70,
        p100: postSttStats.p100,
        mean: postSttStats.mean,
      },
    },
    stageBreakdown: {
      ...(sttDurations.length > 0 ? { stt: { avgMs: sttStats.mean, p90Ms: sttStats.p90 } } : {}),
      ...(retDurations.length > 0 ? { retrieval: { avgMs: retStats.mean, p90Ms: retStats.p90 } } : {}),
      ...(genDurations.length > 0 ? { generation: { avgMs: genStats.mean, p90Ms: genStats.p90 } } : {}),
    },
  };
}
