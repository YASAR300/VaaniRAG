'use client';
import React from 'react';
import { Mic, Binary, Search, Sparkles } from 'lucide-react';

/* ── Four pipeline stages — exact tech labels + user-facing descriptions ── */
const steps = [
  {
    num:   '01',
    icon:  Mic,
    // Technical label shown in mono above the title
    tech:  'SARVAM STT',
    title: 'Speak',
    desc:  'We turn your voice into text — in whichever language you spoke.',
  },
  {
    num:   '02',
    icon:  Binary,
    tech:  'BGE-M3 EMBEDDINGS',
    title: 'Embed',
    desc:  'We turn your question into a dense vector representation that captures meaning across languages.',
  },
  {
    num:   '03',
    icon:  Search,
    tech:  'QDRANT HYBRID SEARCH',
    title: 'Retrieve',
    desc:  'We search the right passages in the MSMARCO-XI dataset — using both dense similarity and sparse keyword matching.',
  },
  {
    num:   '04',
    icon:  Sparkles,
    tech:  'GROQ, GROUNDED',
    title: 'Answer',
    desc:  'We write an answer using only what we found — and tell you exactly where it came from.',
  },
];

/* ── Right-side code config panel ── */
function ConfigPanel() {
  return (
    <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden font-mono text-xs leading-relaxed">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222] bg-[#0d0d0d]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="ml-3 text-[#555] text-[11px]">pipeline.config.js</span>
      </div>
      <div className="px-5 py-5 space-y-1">
        <div><span className="text-[#555]">{'// VaaniRAG pipeline config'}</span></div>
        <div className="mt-2">
          <span className="text-[#e5c07b]">export</span>
          <span className="text-white"> </span>
          <span className="text-[#e5c07b]">const</span>
          <span className="text-[#61afef]"> pipeline</span>
          <span className="text-white"> = {'{'}</span>
        </div>
        {[
          ['  stt',          '"sarvam-saarika-v2"'],
          ['  embeddings',   '"BAAI/bge-m3"'],
          ['  vectorDB',     '"qdrant-cloud"'],
          ['  retrieval',    '"hybrid (dense + sparse)"'],
          ['  reranker',     '"cross-encoder"'],
          ['  llm',          '"groq (llama-3.3-70b)"'],
          ['  latencyBudget','{ postStt: "< 200ms" }'],
          ['  corpus',       '"ai4bharat/MSMARCO-XI"'],
          ['  languages',    '13 /* all Indic */'],
        ].map(([key, val]) => (
          <div key={key} className="flex gap-1">
            <span className="text-[#e06c75]">{key}</span>
            <span className="text-[#555]">:</span>
            <span className="text-[#98c379]">{val}</span>
            <span className="text-[#555]">,</span>
          </div>
        ))}
        <div className="text-white">{'}'}</div>
      </div>
    </div>
  );
}

/* ── Latency callout — honest two-bucket breakdown ── */
function LatencyCallout() {
  return (
    <div className="mt-10 rounded-xl border border-[#1f1f1f] border-l-[3px] border-l-[#c88a28] bg-[#0d0d0d] px-6 py-5">
      <p className="text-[11px] font-mono tracking-widest uppercase text-[#555] mb-3">
        Latency — two buckets, one target
      </p>
      <div className="space-y-3 text-[12px] text-[#878787] leading-relaxed">
        <div className="flex items-start gap-3">
          <span className="font-mono text-[#555] shrink-0 mt-0.5">01</span>
          <p>
            <span className="text-white font-medium">Sarvam STT</span> — the time to turn your speech into text.
            This is a third-party hosted API call outside our control.
            It is tracked and reported, but it is{' '}
            <span className="text-white font-medium">excluded</span> from the 200ms target.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono text-[#555] shrink-0 mt-0.5">02</span>
          <p>
            <span className="text-white font-medium">Post-transcript pipeline</span> — the clock starts the moment a
            transcript is ready. Embedding → Qdrant hybrid search → rerank → Groq answer generation
            must all fit inside{' '}
            <span className="font-mono text-white">{'< 200ms'}</span>.
            Dataset indexing happens once, offline — it is not part of the per-query clock.
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-[11px] font-mono text-[#555]">
          target:{' '}
          <span className="text-white">{'< 200ms'}</span>
          {' '}post-transcript (STT excluded)
        </span>
        <span className="text-[11px] font-mono text-[#555]">
          measured across:{' '}
          <span className="text-white">P50 · P70 · P100</span>
          {' '}(not a single best-case run)
        </span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-label="How it works" className="border-t border-[#1f1f1f] mt-20">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: text */}
          <div>
            <p className="text-[11px] font-medium tracking-widest uppercase text-[#878787] mb-4">
              Pipeline Architecture
            </p>
            <h2 className="text-[36px] font-semibold text-white leading-[1.15] tracking-tight mb-5">
              Four stages,<br />one breath.
            </h2>
            <p className="text-[14px] text-[#878787] leading-relaxed mb-10 max-w-[400px]">
              From your voice to a grounded, citation-backed answer —
              every stage runs in sequence, is measured individually,
              and must finish before the next one starts.
            </p>

            {/* Steps list — ordered, since pipeline order genuinely matters */}
            <ol className="space-y-6">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.num} className="flex items-start gap-4 group">
                    <div className="mt-0.5 w-8 h-8 rounded-lg border border-[#2a2a2a] bg-[#151515] flex items-center justify-center shrink-0 group-hover:border-[#3a3a3a] transition-colors">
                      <Icon className="w-3.5 h-3.5 text-[#878787] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono text-[#444]">{step.num}</span>
                        {/* Technical mono label */}
                        <span className="text-[10px] font-mono tracking-widest uppercase text-[#555] border border-[#222] px-1.5 py-px rounded">
                          {step.tech}
                        </span>
                        <span className="text-[13px] font-medium text-white">{step.title}</span>
                      </div>
                      <p className="text-[12px] text-[#878787] leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Latency callout */}
            <LatencyCallout />
          </div>

          {/* Right: config panel */}
          <div className="lg:pt-2">
            <ConfigPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
