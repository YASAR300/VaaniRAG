'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Github } from 'lucide-react';

/* ── Inline code panel used in hero ── */
function PipelinePanel() {
  return (
    <div className="w-full rounded-xl border border-[#222] overflow-hidden bg-[#111] font-mono text-xs leading-relaxed">
      {/* Panel chrome bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222] bg-[#0d0d0d]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="ml-3 text-[#555] text-[11px]">vaaniraag — pipeline trace</span>
        <span className="ml-auto flex items-center gap-1.5 text-[#3d8f3d] text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3d8f3d] animate-blink" />
          LIVE
        </span>
      </div>

      {/* Trace output */}
      <div className="px-5 py-4 space-y-2.5">
        <div className="text-[#555]">{'// voice query received'}</div>
        <div className="flex items-center justify-between">
          <span className="text-[#878787]">query</span>
          <span className="text-[#e5e5e5]">&quot;भारत की राजधानी क्या है?&quot;</span>
        </div>

        <div className="border-t border-[#1f1f1f] pt-2.5 space-y-2">
          {[
            { stage: 'stt',              label: 'Sarvam Saarika',     ms: '38ms',  ok: true },
            { stage: 'guardrail_input',  label: 'Input gate',         ms:  '2ms',  ok: true },
            { stage: 'retrieval',        label: 'Hybrid pgvector+BM25',ms: '42ms', ok: true },
            { stage: 'rerank',           label: 'Cross-encoder rerank',ms: '11ms', ok: true },
            { stage: 'generation',       label: 'LLM — streaming',    ms: '48ms',  ok: true },
            { stage: 'guardrail_output', label: 'Grounding check',    ms:  '6ms',  ok: true },
          ].map((row) => (
            <div key={row.stage} className="flex items-center gap-3">
              <span className="w-28 text-[#555] shrink-0">{row.stage}</span>
              <span className="flex-1 text-[#878787] truncate">{row.label}</span>
              <span className="text-[#e5e5e5] w-12 text-right shrink-0">{row.ms}</span>
              <span className="text-[#3d8f3d] shrink-0">✓</span>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1f1f1f] pt-2.5 flex items-center justify-between">
          <span className="text-[#555]">total_latency</span>
          <span className="text-white font-semibold">147ms &lt; 200ms ✓</span>
        </div>

        <div className="mt-1 text-[#555] text-[10px]">
          citations: [&quot;passage_882&quot;, &quot;passage_1204&quot;, &quot;passage_337&quot;]
        </div>
      </div>
    </div>
  );
}

/* ── Stat pill ── */
function Stat({ value, label }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold text-white tracking-tight">{value}</span>
      <span className="text-xs text-[#878787]">{label}</span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative pt-16 pb-0 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-2 text-[12px] text-[#878787] border border-[#222] rounded-full px-3 py-1 bg-[#111]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3d8f3d] animate-blink" />
            Built for Hacker House Goa 2026 · Voice-First RAG Pipeline
          </span>
        </div>

        {/* Grid: Text left, panel right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-16 items-start">
          {/* Left: headline + CTAs + stats */}
          <div>
            <h1 className="text-[42px] sm:text-[54px] font-semibold text-white leading-[1.1] tracking-tight mb-5">
              The voice-enabled RAG
              <br className="hidden sm:block" />
              system for teams
              <br className="hidden sm:block" />
              and agents.
            </h1>

            <p className="text-[15px] text-[#878787] leading-relaxed max-w-[460px] mb-8">
              VaaniRAG captures spoken queries via Sarvam AI STT, retrieves relevant
              context from MS&nbsp;MARCO-XI passages using hybrid pgvector&nbsp;+&nbsp;BM25
              search, and returns strictly grounded, citation-backed answers
              in under&nbsp;200ms — end to end.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-14">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-[#0a0a0a] bg-white hover:bg-[#e5e5e5] transition-colors px-4 py-2 rounded-md"
              >
                Try it live
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="https://github.com/YASAR300/VaaniRAG"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] text-[#878787] hover:text-white border border-[#242424] hover:border-[#444] transition-colors px-4 py-2 rounded-md"
              >
                <Github className="w-3.5 h-3.5" />
                View on GitHub
              </a>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-start gap-10 border-t border-[#1f1f1f] pt-8">
              <Stat value="&lt; 200ms" label="Target pipeline latency" />
              <Stat value="3"         label="Chunking strategies" />
              <Stat value="100%"      label="Grounded — no hallucinations" />
              <Stat value="MS MARCO"  label="Indian language corpus" />
            </div>
          </div>

          {/* Right: pipeline trace panel */}
          <div className="hidden lg:block pt-2">
            <PipelinePanel />
          </div>
        </div>
      </div>
    </section>
  );
}
