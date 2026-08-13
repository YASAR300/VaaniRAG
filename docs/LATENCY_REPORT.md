# VaaniRAG Latency Benchmark Report

## Measurement Boundaries

- **Target Processing Budget**: ≤ 200ms (Chunking + Query Routing + Hybrid Retrieval + Grounding Validation + Output Stream Initialization).
- **Separate Metric Boundaries**: Sarvam STT Speech-to-Text transcription and LLM First-Token Latency (TTFT) are measured and reported as distinct stages.

## Latency Percentile Summary

| Stage | P50 (ms) | P70 (ms) | P100 (ms) | Budget Status |
| :--- | :--- | :--- | :--- | :--- |
| Query Routing & Guardrail Gate | -- | -- | -- | Pending Benchmark |
| Hybrid Vector & BM25 Retrieval | -- | -- | -- | Pending Benchmark |
| Grounding & Hallucination Check | -- | -- | -- | Pending Benchmark |
| **Total Pipeline (excl. STT/TTFT)** | **--** | **--** | **--** | **Target ≤ 200ms** |

*Full benchmarking telemetry harness output populated in Phase 7.*
