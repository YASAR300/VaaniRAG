# VaaniRAG (वाणी)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/YASAR300/VaaniRAG)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Speak a question in your voice, get a grounded answer pulled straight from real MS MARCO passages — transcribed, retrieved, and answered in under 200ms end-to-end.**

Status: 🚧 Phase 1/7 — Foundation

---

## Quick Setup

1. **Clone & Install**:
   ```bash
   git clone https://github.com/YASAR300/VaaniRAG.git
   cd VaaniRAG
   npm install
   ```

2. **Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in required credentials in `.env.local`.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## Development Roadmap

- [x] **Phase 1: Foundation & Repository Setup** — Scaffold Next.js 14 + TS + Tailwind app, folder structure, domain contracts (`lib/types.ts`), runtime env loader (`lib/env.ts`), `/api/health`, and README.
- [ ] **Phase 2: Design System & Landing Page** — Full design token system, component library, landing page, auth-free entry flow.
- [ ] **Phase 3: Voice Input & Sarvam STT Integration** — Mic capture UI, waveform visualizer, Sarvam STT integration, transcript streaming.
- [ ] **Phase 4: Data Ingestion & Multi-Strategy Chunking** — MS MARCO-XI dataset parser, multi-strategy chunking, metadata tagging, embedding pipeline.
- [ ] **Phase 5: Vector DB & Hybrid Retrieval** — Supabase pgvector setup, hybrid (dense + sparse BM25) search, re-ranking, query router.
- [ ] **Phase 6: Generation, Guardrails & Traced Harness** — Answer generation, structured harness, guardrail suite, hallucination/grounding checks.
- [ ] **Phase 7: Latency Analytics & Deployment** — Latency instrumentation, P50/P70/P100 benchmarking harness + dashboard, Vercel deployment.

---

## License

[MIT](LICENSE)
