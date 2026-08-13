'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const metrics = [
  { percentile: 'P50 (Median)',  value: '142ms', status: 'Optimal',       color: '#3d8f3d' },
  { percentile: 'P70 (70th %)', value: '168ms', status: 'In budget',      color: '#878787' },
  { percentile: 'P100 (Max)',   value: '194ms', status: 'Target ≤ 200ms', color: '#878787' },
];

const traceStages = [
  { name: 'stt',              label: 'Sarvam Saarika STT',      ms: 38,  pct: 19 },
  { name: 'guardrail_input',  label: 'Input guardrail',          ms:  2,  pct:  1 },
  { name: 'retrieval',        label: 'Hybrid pgvector + BM25',  ms: 42,  pct: 22 },
  { name: 'rerank',           label: 'Cross-encoder rerank',     ms: 11,  pct:  6 },
  { name: 'generation',       label: 'LLM generation',           ms: 48,  pct: 25 },
  { name: 'guardrail_output', label: 'Grounding check',          ms:  6,  pct:  3 },
];

export function LatencyTeaser() {
  return (
    <section id="latency" className="border-t border-[#1f1f1f]">
      <div className="max-w-7xl mx-auto px-6 py-24">
        {/* Header */}
        <p className="text-[11px] font-medium tracking-widest uppercase text-[#878787] mb-4">
          Benchmarking &amp; Telemetry
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
          <h2 className="text-[36px] font-semibold text-white leading-[1.15] tracking-tight max-w-[480px]">
            Traced latency breakdown<br />at every stage.
          </h2>
          <p className="text-[14px] text-[#878787] max-w-[320px] leading-relaxed sm:text-right">
            Every stage logs startTime, endTime, status, and retryCount to
            guarantee sub-200ms budget compliance.
          </p>
        </div>

        {/* Big stat numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1f1f1f] border border-[#1f1f1f] rounded-xl overflow-hidden mb-10">
          {metrics.map((m) => (
            <div key={m.percentile} className="bg-[#0a0a0a] px-8 py-10 hover:bg-[#0d0d0d] transition-colors text-center">
              <div className="text-[11px] font-mono text-[#555] uppercase tracking-widest mb-3">
                {m.percentile}
              </div>
              <div
                className="text-[52px] font-semibold leading-none tracking-tight mb-2"
                style={{ color: m.color }}
              >
                {m.value}
              </div>
              <div className="text-[12px] text-[#555] font-mono">{m.status}</div>
            </div>
          ))}
        </div>

        {/* Trace bar chart */}
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
            <span className="text-[12px] font-mono text-[#555]">pipeline trace · traceId: 7f3a9c</span>
            <span className="text-[12px] font-mono text-[#3d8f3d]">total: 147ms ✓</span>
          </div>
          <div className="px-6 py-5 space-y-3">
            {traceStages.map((stage) => (
              <div key={stage.name} className="flex items-center gap-4">
                <span className="w-36 text-[11px] font-mono text-[#555] shrink-0 truncate">
                  {stage.name}
                </span>
                <div className="flex-1 h-5 bg-[#111] rounded-sm overflow-hidden border border-[#1a1a1a]">
                  <div
                    className="h-full bg-[#222] rounded-sm transition-all duration-500"
                    style={{ width: `${stage.pct * 4}%` }}
                  />
                </div>
                <span className="w-12 text-[11px] font-mono text-[#878787] text-right shrink-0">
                  {stage.ms}ms
                </span>
                <span className="text-[11px] text-[#3d8f3d] shrink-0">✓</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-[#1f1f1f] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#444]">
              Excludes Speech STT first-byte &amp; TTFT (measured separately)
            </span>
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 text-[12px] text-[#878787] hover:text-white transition-colors"
            >
              See full analytics
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
