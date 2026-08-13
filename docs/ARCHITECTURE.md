# VaaniRAG System Architecture

VaaniRAG (वाणी = "voice/speech") is a low-latency, voice-first Retrieval-Augmented Generation (RAG) system built on Indian-language augmented MS MARCO passages (`ai4bharat/MSMARCO-XI`).

## Pipeline Topology

```
┌─────────────┐   ┌──────────────┐   ┌────────────────┐   ┌───────────────────┐   ┌─────────────────┐
│  Voice Input │──▶│ Sarvam STT   │──▶│  Query Router /  │──▶│  Hybrid Retrieval  │──▶│  Guarded Answer   │
│  (mic/audio) │   │  Transcribe  │   │  Guardrail Gate  │   │  (Vector + BM25)   │   │  Generation (LLM) │
└─────────────┘   └──────────────┘   └────────────────┘   └───────────────────┘   └─────────────────┘
                                                                                              │
                                                                                              ▼
                                                                                    ┌───────────────────┐
                                                                                    │  Grounding Check /  │
                                                                                    │  Hallucination Gate │
                                                                                    └───────────────────┘
                                                                                              │
                                                                                              ▼
                                                                                    ┌───────────────────┐
                                                                                    │  Streamed Answer +  │
                                                                                    │  Citations to UI    │
                                                                                    └───────────────────┘
```

## Key Architectural Principles

1. **Sub-200ms Processing Budget**: Every step in the RAG retrieval and answer pipeline is instrumented with fine-grained telemetry to enforce latency targets.
2. **Hybrid Retrieval**: Combines pgvector dense embedding cosine similarity with sparse BM25 keyword matching for high-precision recall on Indian context queries.
3. **Guarded Harness Execution**: No un-sandboxed LLM output. Every response is validated for citation accuracy, relevance, and safety.
4. **Indian Language Focus**: Native support for Hindi and Indian-accented English speech input via Sarvam AI STT (Saarika model).
