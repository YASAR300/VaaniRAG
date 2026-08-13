'use client';
import React from 'react';

const stack = [
  {
    category: 'Voice & STT',
    items: [
      { name: 'Sarvam AI Saarika',  tag: 'STT engine',           ms: '~38ms' },
      { name: 'Web Audio API',       tag: 'Real-time capture',    ms: '—'     },
    ],
  },
  {
    category: 'Hybrid Retrieval',
    items: [
      { name: 'Supabase pgvector',   tag: 'Dense cosine sim',     ms: '~42ms' },
      { name: 'BM25 Sparse Search',  tag: 'Keyword matcher',      ms: '~42ms' },
      { name: 'MS MARCO-XI',         tag: 'Indian passage corpus', ms: '—'    },
    ],
  },
  {
    category: 'Generation',
    items: [
      { name: 'Low-latency LLM',     tag: 'Streaming JSON harness', ms: '~48ms' },
      { name: 'Zod Schema Gate',     tag: 'Structured validation',  ms: '—'     },
    ],
  },
  {
    category: 'Infrastructure',
    items: [
      { name: 'Next.js 14 App Router', tag: 'Serverless routes',  ms: '—' },
      { name: 'Vercel Edge Network',   tag: 'Global edge runtime', ms: '—' },
    ],
  },
];

/* ── Left: retrieval results panel ── */
function RetrievalPanel() {
  return (
    <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden font-mono text-xs leading-relaxed">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222] bg-[#0d0d0d]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <span className="ml-3 text-[#555] text-[11px]">retrieval — pgvector results</span>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="text-[#555]">{'// query: "भारत की राजधानी"'}</div>
        <div className="text-[#555]">{'// strategy: hybrid (dense + BM25)'}</div>
        {[
          { score: '0.94', id: 'passage_882',  preview: 'भारत की राजधानी नई दिल्ली है…' },
          { score: '0.87', id: 'passage_1204', preview: "India's capital city New Delhi…" },
          { score: '0.82', id: 'passage_337',  preview: 'दिल्ली 1911 में राजधानी बनी थी…' },
          { score: '0.79', id: 'passage_506',  preview: 'The seat of government of India…' },
          { score: '0.71', id: 'passage_2041', preview: 'नई दिल्ली उत्तर भारत में स्थित…' },
        ].map((r) => (
          <div key={r.id} className="p-3 rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#61afef]">{r.id}</span>
              <span className="text-[#98c379]">score: {r.score}</span>
            </div>
            <div className="text-[#878787] truncate">{r.preview}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArchitectureShowcase() {
  return (
    <section id="architecture" className="border-t border-[#1f1f1f]">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: retrieval panel */}
          <div>
            <RetrievalPanel />
          </div>

          {/* Right: text + stack */}
          <div>
            <p className="text-[11px] font-medium tracking-widest uppercase text-[#878787] mb-4">
              Technology Stack
            </p>
            <h2 className="text-[36px] font-semibold text-white leading-[1.15] tracking-tight mb-5">
              Engineered for accuracy<br />and sub-200ms speed.
            </h2>
            <p className="text-[14px] text-[#878787] leading-relaxed mb-10 max-w-[420px]">
              Naive fixed-size chunking misses context boundaries and fails on
              complex queries. VaaniRAG co-locates three chunking strategies —
              fixed sliding window, semantic boundary, and hierarchical
              parent-child — inside Supabase pgvector, then fuses dense
              embeddings with sparse BM25 to retrieve exact domain passages
              in under 55ms without sacrificing recall.
            </p>

            {/* Stack table */}
            <div className="space-y-6">
              {stack.map((cat) => (
                <div key={cat.category}>
                  <p className="text-[11px] font-mono tracking-wider text-[#555] uppercase mb-2">
                    {cat.category}
                  </p>
                  <div className="border border-[#1f1f1f] rounded-lg overflow-hidden divide-y divide-[#1f1f1f]">
                    {cat.items.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between px-4 py-2.5 bg-[#0d0d0d] hover:bg-[#111] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#333] shrink-0" />
                          <span className="text-[13px] text-white">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] text-[#555] font-mono hidden sm:block">{item.tag}</span>
                          {item.ms !== '—' && (
                            <span className="text-[11px] font-mono text-[#3d8f3d]">{item.ms}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
