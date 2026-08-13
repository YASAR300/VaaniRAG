// A single retrievable unit after chunking
export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  chunkStrategy: "fixed" | "semantic" | "sentence-window" | "recursive" | "metadata-aware";
  chunkIndex: number;
  tokenCount: number;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface ChunkMetadata {
  sourceDataset: string;
  language?: string;
  originalPassageId?: string;
  overlapWithPrev?: number;
  overlapWithNext?: number;
  createdAt: string;
}

// A single retrieval hit
export interface RetrievalResult {
  chunk: Chunk;
  score: number;
  retrievalMethod: "dense" | "sparse" | "hybrid";
  rank: number;
}

// The full pipeline trace for one user query (used by harness + latency analytics)
export interface PipelineTrace {
  traceId: string;
  query: string;
  transcript?: string;
  stages: PipelineStage[];
  finalAnswer?: string;
  citations?: RetrievalResult[];
  guardrailFlags: GuardrailFlag[];
  totalLatencyMs: number;
  createdAt: string;
}

export interface PipelineStage {
  name:
    | "stt"
    | "guardrail_input"
    | "retrieval"
    | "rerank"
    | "generation"
    | "guardrail_output"
    | "grounding_check";
  startedAt: number;
  endedAt: number;
  latencyMs: number;
  status: "success" | "retried" | "failed" | "skipped";
  retryCount: number;
  errorMessage?: string;
}

export interface GuardrailFlag {
  type: "off_topic" | "unsafe_input" | "low_confidence" | "ungrounded_answer" | "empty_retrieval";
  triggeredAt: "input" | "retrieval" | "output";
  detail: string;
}
