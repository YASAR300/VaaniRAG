'use client';
import React from 'react';

// NOTE: The three example cards below are static, hardcoded illustrative content
// for the landing page. Real guardrail logic is implemented in Phase 11
// (lib/guardrails/) and wired into the live, interactive app UI in Phase 14
// (app/ask/page.tsx). Do not confuse this component with the real guardrails pipeline.

// Color semantics (established in Phase 1 — do not use these decoratively):
//   #4E9F6E (--signal-green) → grounded / verified answer state only
//   #B23A2E (--sindoor)      → blocked / declined / cannot-answer state only

const guardrails = [
  {
    // Card A — Grounded, in-scope answer
    tag:       'GROUNDED ANSWER',
    accentColor: '#4E9F6E', // --signal-green: verified/grounded
    // Question shown in Hindi script + English gloss so non-Hindi judges can read it
    question:  'भारत की राजधानी कौन सी है?',
    questionGloss: '(What is the capital of India?)',
    response:  'भारत की राजधानी नई दिल्ली है। New Delhi has been the capital since 1911.',
    // Citation marker foreshadows the Phase 10/14 citation UI
    code: [
      ['result.groundingScore', '0.94',          '#4E9F6E'],
      ['result.action',         '"answer"',       '#4E9F6E'],
      ['citations[0].id',       '"passage_882"',  '#61afef'],
      ['citations[0].score',    '0.94',           '#4E9F6E'],
    ],
  },
  {
    // Card B — Off-topic question, blocked at input gate
    tag:       'OFF-TOPIC',
    accentColor: '#B23A2E', // --sindoor: blocked/declined
    question:  'Can you book me a flight to Mumbai?',
    questionGloss: null,
    response:  "This system answers factual questions from its passage dataset — it can't make bookings, take actions, or connect to external services. Try asking something like \"What is the history of Mumbai?\" instead.",
    code: [
      ['input.topic',   '"off_topic"',      '#B23A2E'],
      ['input.action',  '"reject"',         '#B23A2E'],
      ['llm.called',    'false',            '#555555'],
      ['ms.wasted',     '0',               '#555555'],
    ],
  },
  {
    // Card C — On-domain question but retrieved context too weak to support an answer.
    //          Distinct from Card B: the system DID attempt retrieval; it just found nothing
    //          confident enough. Different failure mode, different message.
    tag:       'INSUFFICIENT CONTEXT',
    accentColor: '#B23A2E', // --sindoor: blocked/declined (different reason than Card B)
    question:  'What was the exact vote count in the 1923 Nagpur municipal election?',
    questionGloss: null,
    response:  "I searched the dataset and couldn't find a passage with enough confidence to answer this reliably. Rather than guess, I'm stopping here. The best matching passage scored 0.31 — well below the grounding threshold of 0.65.",
    code: [
      ['result.groundingScore', '0.31',         '#B23A2E'],
      ['result.threshold',      '0.65',         '#878787'],
      ['result.action',         '"decline"',    '#B23A2E'],
      ['retrieval.attempted',   'true',         '#878787'],
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
            It knows when not<br />to answer.
          </h2>
          <p className="text-[14px] text-[#878787] max-w-[320px] sm:text-right leading-relaxed">
            Three real examples of how the system handles what it can,
            and honestly declines what it can't.
          </p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1f1f1f] rounded-xl overflow-hidden border border-[#1f1f1f]">
          {guardrails.map((g) => (
            <div
              key={g.tag}
              className="bg-[#0a0a0a] p-8 hover:bg-[#0d0d0d] transition-colors group"
              // Functional left-border accent — color signals meaning, not decoration
              style={{ borderLeft: `3px solid ${g.accentColor}` }}
            >
              {/* Tag — primary signal for colorblind/screen-reader users */}
              <span
                className="inline-block text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded mb-5 border"
                style={{ color: g.accentColor, borderColor: g.accentColor + '33' }}
              >
                {g.tag}
              </span>

              {/* Mock user question */}
              <h3 className="text-[15px] font-medium text-white leading-snug mb-1 group-hover:text-white/90">
                {g.question}
              </h3>
              {g.questionGloss && (
                <p className="text-[11px] text-[#555] mb-4">{g.questionGloss}</p>
              )}
              {!g.questionGloss && <div className="mb-4" />}

              {/* Mock system response */}
              <p className="text-[13px] text-[#878787] leading-relaxed mb-6">
                {g.response}
              </p>

              {/* Mini code snippet — guardrail trace */}
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
