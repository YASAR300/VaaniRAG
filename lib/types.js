/**
 * Shared Domain Types and Contracts (JavaScript / JSDoc)
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
