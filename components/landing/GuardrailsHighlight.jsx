'use client';
import React from 'react';

const guardrails = [
  {
    tag:   'Zero Hallucination',
    title: "Knows what it doesn't know.",
    desc:  'If retrieval yields low relevance confidence, VaaniRAG explicitly refuses or hedges rather than fabricating an answer. The grounding score threshold is enforced on every single response.',
    code:  [
      ['result.groundingScore', '0.94', '#98c379'],
      ['result.flags',          '[]',   '#98c379'],
      ['result.action',         '"answer"', '#61afef'],
    ],
  },
  {
    tag:   'Input Guardrail',
    title: 'Filters the noise before compute.',
    desc:  'Off-topic queries, malicious prompt injections, and invalid inputs are trapped at the gate before any vector DB or LLM compute is spent — saving latency budget for real queries.',
    code:  [
      ['input.topic',    '"off_topic"',   '#e06c75'],
      ['input.action',   '"reject"',      '#e06c75'],
      ['input.latency',  '"0ms wasted"',  '#878787'],
    ],
  },
  {
    tag:   'Strict Citation',
    title: 'Shows its work. Every time.',
    desc:  'Every response streams with verifiable inline citations that map directly back to exact MS MARCO passage IDs, their rank scores, and retrieval method — dense or sparse.',
    code:  [
      ['citations[0].id',     '"passage_882"',  '#61afef'],
      ['citations[0].score',  '0.94',           '#98c379'],
      ['citations[0].method', '"dense"',         '#e5c07b'],
    ],
  },
];

export function GuardrailsHighlight() {
  return (
    <section id="guardrails" className="border-t border-[#1f1f1f]">
      <div className="max-w-7xl mx-auto px-6 py-24">
        {/* Section header */}
        <p className="text-[11px] font-medium tracking-widest uppercase text-[#878787] mb-4">
          Trust &amp; Grounding Suite
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
          <h2 className="text-[36px] font-semibold text-white leading-[1.15] tracking-tight max-w-[480px]">
            Built to prevent hallucinations<br />by design.
          </h2>
          <p className="text-[14px] text-[#878787] max-w-[320px] sm:text-right leading-relaxed">
            Every generated word is constrained by passage context and validated
            by strict grounding checks before it reaches the user.
          </p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1f1f1f] rounded-xl overflow-hidden border border-[#1f1f1f]">
          {guardrails.map((g) => (
            <div
              key={g.tag}
              className="bg-[#0a0a0a] p-8 hover:bg-[#0d0d0d] transition-colors group"
            >
              {/* Tag */}
              <span className="inline-block text-[10px] font-mono tracking-widest uppercase text-[#555] border border-[#222] px-2 py-0.5 rounded mb-5">
                {g.tag}
              </span>

              <h3 className="text-[17px] font-semibold text-white leading-snug mb-3 group-hover:text-white/90">
                {g.title}
              </h3>

              <p className="text-[13px] text-[#878787] leading-relaxed mb-6">
                {g.desc}
              </p>

              {/* Mini code snippet */}
              <div className="rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] px-4 py-3 font-mono text-[11px] space-y-1.5">
                {g.code.map(([key, val, color]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[#555] shrink-0">{key}</span>
                    <span className="text-[#333] shrink-0">→</span>
                    <span style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
