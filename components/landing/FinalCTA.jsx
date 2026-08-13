'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Github } from 'lucide-react';

/* ── Changelog-style cards ── */
const changes = [
  {
    version: 'v0.3',
    date:    'Aug 2026',
    title:   'Multi-strategy chunking',
    desc:    'Fixed sliding window, semantic boundary, and hierarchical parent-child chunking strategies — all running in parallel inside Supabase pgvector.',
    bg:      '#0d0d0d',
    border:  '#222',
  },
  {
    version: 'v0.2',
    date:    'Aug 2026',
    title:   'Hybrid retrieval engine',
    desc:    'Dense pgvector cosine similarity fused with BM25 sparse keyword search delivers exact domain passages with regional entity name coverage.',
    bg:      '#111',
    border:  '#2a2a2a',
  },
  {
    version: 'v0.1',
    date:    'Aug 2026',
    title:   'Voice pipeline live',
    desc:    'Sarvam AI Saarika STT transcribes Hindi and Indian-English voice queries end-to-end with sub-200ms total budget across all pipeline stages.',
    bg:      '#f5f5f5',
    border:  '#ddd',
    dark:    false,
  },
];

export function FinalCTA() {
  return (
    <>
      {/* ── Changelog section ── */}
      <section className="border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <p className="text-[11px] font-medium tracking-widest uppercase text-[#878787] mb-4">
            Changelog
          </p>
          <h2 className="text-[36px] font-semibold text-white leading-[1.15] tracking-tight mb-14">
            What&apos;s shipped.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {changes.map((c) => (
              <div
                key={c.version}
                className="rounded-xl border p-7 flex flex-col gap-4"
                style={{ background: c.bg, borderColor: c.border }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded border"
                    style={{
                      color:       c.dark === false ? '#555'   : '#555',
                      borderColor: c.dark === false ? '#ddd'   : '#2a2a2a',
                      background:  c.dark === false ? '#ebebeb' : '#0d0d0d',
                    }}
                  >
                    {c.version}
                  </span>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: c.dark === false ? '#888' : '#555' }}
                  >
                    {c.date}
                  </span>
                </div>
                <div>
                  <h3
                    className="text-[16px] font-semibold mb-2 leading-snug"
                    style={{ color: c.dark === false ? '#111' : '#fff' }}
                  >
                    {c.title}
                  </h3>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: c.dark === false ? '#666' : '#878787' }}
                  >
                    {c.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6 py-28 text-center">
          <p className="text-[11px] font-medium tracking-widest uppercase text-[#878787] mb-6">
            VaaniRAG · Hacker House Goa 2026
          </p>
          <h2 className="text-[44px] sm:text-[56px] font-semibold text-white leading-[1.08] tracking-tight mb-6">
            Built for the future.
            <br />
            Available today.
          </h2>
          <p className="text-[15px] text-[#878787] leading-relaxed max-w-[440px] mx-auto mb-10">
            Sub-200ms voice transcription via Sarvam AI, hybrid pgvector
            retrieval, zero-hallucination guardrails, and structured harness
            orchestration on MS&nbsp;MARCO-XI.
            Your voice. Real data. No guessing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[#0a0a0a] bg-white hover:bg-[#e5e5e5] transition-colors px-5 py-2.5 rounded-md"
            >
              Launch VaaniRAG
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="https://github.com/YASAR300/VaaniRAG"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-[#878787] hover:text-white border border-[#242424] hover:border-[#444] transition-colors px-5 py-2.5 rounded-md"
            >
              <Github className="w-3.5 h-3.5" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
