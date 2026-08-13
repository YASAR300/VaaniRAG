# VaaniRAG (वाणी)

> **Speak a question in your voice, get a grounded answer pulled straight from real MS MARCO passages — transcribed, retrieved, and answered under a 200ms processing budget.**

---

## 1. Product Identity

- **Codename**: VaaniRAG (वाणी = "voice/speech" in Sanskrit/Hindi — fitting for a voice-first, India-context RAG system)
- **Target Dataset**: [`ai4bharat/MSMARCO-XI`](https://huggingface.co/datasets/ai4bharat/MSMARCO-XI) (Hindi & Indian-language augmented passage ranking dataset)
- **Speech-to-Text**: Sarvam AI (Saarika STT model)
- **Vector Store**: Supabase (Postgres + `pgvector` extension) — Free Tier
- **Hosting**: Vercel (Frontend + Serverless/Edge Functions) — Free Tier
- **Frontend & App Stack**: Next.js 14 (App Router) + JavaScript + Tailwind CSS

---

## 2. System Architecture

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

---

## 3. Phase Roadmap

- [x] **Phase 1: Foundation & Setup** — Scaffold repo, Next.js 14 App Router, Tailwind CSS, env config, health route, CI workflow, and initial docs.
- [ ] **Phase 2: Design System & Landing Page** — Full design token system, component primitives, landing page & workspace layout.
- [ ] **Phase 3: Voice Input & Sarvam STT** — Audio recording harness, visualizer, Sarvam STT integration, stream handler.
- [ ] **Phase 4: Data Ingestion & Chunking** — MS MARCO-XI parser, multi-strategy chunking, metadata tagging, embedding pipeline.
- [ ] **Phase 5: Vector DB & Retrieval** — Supabase pgvector setup, hybrid (dense + sparse BM25) search, re-ranking, query router.
- [ ] **Phase 6: Generation & Guardrail Harness** — Traced pipeline harness, low-latency LLM answer generation, zero-hallucination grounding gate.
- [ ] **Phase 7: Latency Analytics & Deployment** — P50/P70/P100 benchmarking harness, telemetry dashboard, Vercel deployment.

---

## 4. Getting Started

### Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your API credentials:
```env
SARVAM_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
LLM_API_KEY=your_key
```

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run health check API
curl http://localhost:3000/api/health
```

---

## 5. Verification Commands

```bash
# Lint check
npm run lint

# Build project
npm run build
```
