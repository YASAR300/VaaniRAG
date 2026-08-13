'use client';
import React from 'react';
import { Mic, Activity, Search, Sparkles, ShieldCheck } from 'lucide-react';

const steps = [
  {
    num:   '01',
    icon:  Mic,
    title: 'Speak',
    desc:  'Ask your question out loud in any supported language. Native Web Audio API capture starts instantly.',
  },
  {
    num:   '02',
    icon:  Activity,
    title: 'Transcribe',
    desc:  'Sarvam AI Saarika STT converts spoken audio to clean, structured text in real time with high accuracy.',
  },
  {
    num:   '03',
    icon:  Search,
    title: 'Retrieve',
    desc:  'Supabase pgvector dense embeddings fused with BM25 sparse search fetch the most relevant MS MARCO passages.',
  },
  {
    num:   '04',
    icon:  Sparkles,
    title: 'Ground & Generate',
    desc:  'A low-latency LLM synthesizes an answer strictly constrained to the retrieved context — no hallucinations allowed.',
  },
  {
    num:   '05',
    icon:  ShieldCheck,
    title: 'Verify',
    desc:  'Guardrails validate grounding scores and passage citations before the answer reaches your UI.',
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
          ['  stt',         '"sarvam-saarika"'],
          ['  retrieval',   '"hybrid"'],
          ['  chunkTypes',  '["fixed", "semantic", "sentence-window"]'],
          ['  reranker',    '"cross-encoder"'],
          ['  latencyMs',   '200'],
          ['  guardrails',  '["input", "grounding", "output"]'],
          ['  corpus',      '"ms-marco-xi"'],
          ['  language',    '["hi", "en-IN"]'],
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

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-[#1f1f1f] mt-20">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: text */}
          <div>
            <p className="text-[11px] font-medium tracking-widest uppercase text-[#878787] mb-4">
              Pipeline Architecture
            </p>
            <h2 className="text-[36px] font-semibold text-white leading-[1.15] tracking-tight mb-5">
              Five steps,<br />one breath.
            </h2>
            <p className="text-[14px] text-[#878787] leading-relaxed mb-10 max-w-[400px]">
              From your voice to a verified, citation-backed answer in under
              200ms processing budget — every stage measured, traced, and
              retried on failure.
            </p>

            {/* Steps list */}
            <div className="space-y-6">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.num} className="flex items-start gap-4 group">
                    <div className="mt-0.5 w-8 h-8 rounded-lg border border-[#2a2a2a] bg-[#151515] flex items-center justify-center shrink-0 group-hover:border-[#3a3a3a] transition-colors">
                      <Icon className="w-3.5 h-3.5 text-[#878787] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono text-[#444]">{step.num}</span>
                        <span className="text-[13px] font-medium text-white">{step.title}</span>
                      </div>
                      <p className="text-[12px] text-[#878787] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
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
