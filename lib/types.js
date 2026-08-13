/**
 * Shared Domain Types and Contracts (JavaScript / JSDoc)
 *
 * @typedef {Object} ChunkMetadata
 * @property {string} sourceDataset
 * @property {string} [language]
 * @property {string} [originalPassageId]
 * @property {number} [overlapWithPrev]
 * @property {number} [overlapWithNext]
 * @property {string} createdAt
 *
 * @typedef {Object} Chunk
 * @property {string} id
 * @property {string} documentId
 * @property {string} content
 * @property {"fixed" | "semantic" | "sentence-window" | "recursive" | "metadata-aware"} chunkStrategy
 * @property {number} chunkIndex
 * @property {number} tokenCount
 * @property {ChunkMetadata} metadata
 * @property {number[]} [embedding]
 *
 * @typedef {Object} RetrievalResult
 * @property {Chunk} chunk
 * @property {number} score
 * @property {"dense" | "sparse" | "hybrid"} retrievalMethod
 * @property {number} rank
 *
 * @typedef {Object} PipelineStage
 * @property {"stt" | "guardrail_input" | "retrieval" | "rerank" | "generation" | "guardrail_output" | "grounding_check"} name
 * @property {number} startedAt
 * @property {number} endedAt
 * @property {number} latencyMs
 * @property {"success" | "retried" | "failed" | "skipped"} status
 * @property {number} retryCount
 * @property {string} [errorMessage]
 *
 * @typedef {Object} GuardrailFlag
 * @property {"off_topic" | "unsafe_input" | "low_confidence" | "ungrounded_answer" | "empty_retrieval"} type
 * @property {"input" | "retrieval" | "output"} triggeredAt
 * @property {string} detail
 *
 * @typedef {Object} PipelineTrace
 * @property {string} traceId
 * @property {string} query
 * @property {string} [transcript]
 * @property {PipelineStage[]} stages
 * @property {string} [finalAnswer]
 * @property {RetrievalResult[]} [citations]
 * @property {GuardrailFlag[]} guardrailFlags
 * @property {number} totalLatencyMs
 * @property {string} createdAt
 */

export const CHUNKING_STRATEGIES = [
  "fixed",
  "semantic",
  "sentence-window",
  "recursive",
  "metadata-aware",
];

export const RETRIEVAL_METHODS = ["dense", "sparse", "hybrid"];

export const PIPELINE_STAGES = [
  "stt",
  "guardrail_input",
  "retrieval",
  "rerank",
  "generation",
  "guardrail_output",
  "grounding_check",
];
