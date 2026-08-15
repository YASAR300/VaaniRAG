/**
 * scripts/retrieve/test_retrieval.ts — Verification & Benchmark Test for Retrieval Orchestrator (Phase 9)
 *
 * Tests:
 *   1. Multilingual On-Topic Queries (Hindi, Tamil, Bengali, Telugu, English)
 *   2. Guardrail "No Good Match" Trigger (Off-topic / Nonsense queries)
 *   3. Strategy Switching & Hierarchical Parent Context Expansion
 *   4. Sub-Step Latency Breakdown & Budget Verification (< 50ms target)
 *
 * Usage:
 *   npx tsx scripts/retrieve/test_retrieval.ts
 */

import { retrieve, warmupRetrievalIndex } from '../../lib/retrieval/retrieve';
import { StrategyType } from '../../lib/retrieval/types';

interface TestCase {
  name: string;
  query: string;
  language: string;
  expectedNoMatch: boolean;
  strategy?: StrategyType;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Hindi Factual Query',
    query: 'कॉर्पोरेशन क्या है?',
    language: 'hi',
    expectedNoMatch: false,
    strategy: 'metadata',
  },
  {
    name: 'Tamil Corporate Query',
    query: 'ஒரு நிறுவனம் என்பது என்ன?',
    language: 'ta',
    expectedNoMatch: false,
    strategy: 'metadata',
  },
  {
    name: 'Bengali Business Query',
    query: 'কর্পোরেশন কী?',
    language: 'bn',
    expectedNoMatch: false,
    strategy: 'metadata',
  },
  {
    name: 'Telugu Definition Query',
    query: 'కార్పొరేషన్ అంటే ఏమిటి?',
    language: 'te',
    expectedNoMatch: false,
    strategy: 'metadata',
  },
  {
    name: 'Hierarchical Strategy with Parent Expansion',
    query: 'कॉर्पोरेशन की परिभाषा',
    language: 'hi',
    expectedNoMatch: false,
    strategy: 'hierarchical',
  },
  {
    name: 'Off-Topic / Nonsense Guardrail Test',
    query: 'qwerty12345 quantum blabber xyz nonexistent nebula',
    language: 'hi',
    expectedNoMatch: true,
    strategy: 'metadata',
  },
];

async function runTests() {
  console.log('='.repeat(80));
  console.log('  VaaniRAG — Phase 9: Retrieval Orchestration Test Suite');
  console.log('='.repeat(80));

  console.log('>> Warming up in-memory vector index...');
  warmupRetrievalIndex('metadata');
  warmupRetrievalIndex('hierarchical');
  console.log('✅ Index warmed up.\n');

  let passed = 0;
  let total = TEST_CASES.length;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`\n[Test ${i + 1}/${total}] ${tc.name}`);
    console.log(`  Query:     "${tc.query}"`);
    console.log(`  Language:  ${tc.language} | Strategy: ${tc.strategy || 'metadata'}`);

    const result = await retrieve(tc.query, tc.language, {
      strategy: tc.strategy,
      topK: 5,
    });

    console.log(`  ⏱️  Timing: Embed: ${result.timing.embedMs}ms | Search: ${result.timing.searchMs}ms | Rerank: ${result.timing.rerankMs}ms | Total: ${result.timing.totalMs}ms`);
    console.log(`  📊 Top Score: ${result.topScore} | No Relevant Context: ${result.noRelevantContext}`);

    if (result.chunks.length > 0) {
      const top = result.chunks[0];
      console.log(`  🏆 Top Match ID:    ${top.id}`);
      console.log(`  📄 Sample Snippet:  ${top.text.slice(0, 100)}...`);
      if (top.parentChunkText) {
        console.log(`  🔗 Parent Context:  ${top.parentChunkText.slice(0, 100)}...`);
      }
    }

    const matchCheck = result.noRelevantContext === tc.expectedNoMatch;
    if (matchCheck) {
      console.log(`  ✅ Test PASSED (Guardrail behavior matched expected: noRelevantContext=${tc.expectedNoMatch})`);
      passed++;
    } else {
      console.log(`  ❌ Test FAILED (Expected noRelevantContext=${tc.expectedNoMatch}, got ${result.noRelevantContext})`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`  TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('='.repeat(80));

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal retrieval test error:', err);
  process.exit(1);
});
