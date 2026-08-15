/**
 * scripts/benchmark/multilingual_100_qa.ts
 *
 * Comprehensive 100-Query Benchmark across All 13 Indic Languages:
 *   - as (Assamese), bn (Bengali), gu (Gujarati), hi (Hindi), kn (Kannada),
 *     ml (Malayalam), mr (Marathi), ne (Nepali), or (Odia), pa (Punjabi),
 *     ta (Tamil), te (Telugu), ur (Urdu).
 *
 * Test Mix:
 *   - ~91 In-Dataset ground truth queries extracted from `data/clean/<lang>.jsonl`
 *   - ~13 Out-of-Dataset / Non-existent queries to verify guardrail refusal behavior
 *
 * Usage:
 *   npx tsx scripts/benchmark/multilingual_100_qa.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { retrieve, warmupRetrievalIndex } from '../../lib/retrieval/retrieve';
import { generateAnswer } from '../../lib/generation/answer';

const ALL_LANGUAGES = [
  'as', 'bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'ne', 'or', 'pa', 'ta', 'te', 'ur'
];

const LANGUAGE_NAMES: Record<string, string> = {
  as: 'Assamese',
  bn: 'Bengali',
  gu: 'Gujarati',
  hi: 'Hindi',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  ne: 'Nepali',
  or: 'Odia',
  pa: 'Punjabi',
  ta: 'Tamil',
  te: 'Telugu',
  ur: 'Urdu',
};

// Synthetic / Out-of-domain unanswerable queries for each language
const OUT_OF_DOMAIN_QUERIES: Record<string, string> = {
  as: 'মঙ্গল গ্ৰহৰ পৃষ্ঠৰ গড় উষ্ণতা কিমান?',
  bn: 'মঙ্গল গ্রহের পৃষ্ঠের গড় তাপমাত্রা কত?',
  gu: 'મંગળ ગ્રહની સપાટીનું સરેરાશ તાપમાન કેટલું છે?',
  hi: 'मंगल ग्रह की सतह का औसत तापमान कितना है?',
  kn: 'ಮಂಗಳ ಗ್ರಹದ ಮೇಲ್ಮೈ ಸರಾಸರಿ ತಾಪಮಾನ ಎಷ್ಟು?',
  ml: 'ചൊവ്വ ഗ്രഹത്തിന്റെ ഉപരിതല താപനില എത്രയാണ്?',
  mr: 'मंगळ ग्रहाच्या पृष्ठभागाचे सरासरी तापमान किती आहे?',
  ne: 'मंगल ग्रहको सतहको औसत तापक्रम कति छ?',
  or: 'ମଙ୍ଗଳ ଗ୍ରହର ପୃଷ୍ଠଭାଗର ହାରାହାରି ତାପମାତ୍ରା କେତେ?',
  pa: 'ਮੰਗਲ ਗ੍ਰਹਿ ਦੀ ਸਤ੍ਹਾ ਦਾ ਔਸਤ ਤਾਪਮਾਨ ਕਿੰਨਾ ਹੈ?',
  ta: 'செவ்வாய் கிரகத்தின் மேற்பரப்பு சராசரி வெப்பநிலை என்ன?',
  te: 'అంగారక గ్రహం ఉపరితల సగటు ఉష్ణోగ్రత ఎంత?',
  ur: 'مریخ کے درجہ حرارت کی اوسط سطح کیا ہے؟',
};

interface TestItem {
  id: string;
  language: string;
  languageName: string;
  query: string;
  isPositive: boolean; // true = in dataset, false = out of dataset
}

interface TestResult {
  id: string;
  language: string;
  query: string;
  isPositive: boolean;
  retrievalMs: number;
  embedMs: number;
  searchMs: number;
  rerankMs: number;
  topScore: number;
  noRelevantContext: boolean;
  guardrailSuccess: boolean;
  answer?: string;
  citedChunksCount?: number;
  generationMs?: number;
  totalPostSTTMs?: number;
}

function loadDatasetQueries(cleanDir: string, countPerLang = 7): TestItem[] {
  const items: TestItem[] = [];

  for (const lang of ALL_LANGUAGES) {
    const filePath = path.join(cleanDir, `${lang}.jsonl`);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
    const seenQueries = new Set<string>();
    let added = 0;

    for (const line of lines) {
      if (added >= countPerLang) break;
      try {
        const parsed = JSON.parse(line);
        const q = parsed.query_context?.trim();
        if (q && q.length > 5 && !seenQueries.has(q)) {
          seenQueries.add(q);
          items.push({
            id: `${lang}_pos_${added + 1}`,
            language: lang,
            languageName: LANGUAGE_NAMES[lang] || lang,
            query: q,
            isPositive: true,
          });
          added++;
        }
      } catch {}
    }

    // Add 1 negative out-of-domain query per language
    const negQuery = OUT_OF_DOMAIN_QUERIES[lang] || 'qwerty quantum nonexistent nebula';
    items.push({
      id: `${lang}_neg_1`,
      language: lang,
      languageName: LANGUAGE_NAMES[lang] || lang,
      query: negQuery,
      isPositive: false,
    });
  }

  return items;
}

async function main() {
  console.log('='.repeat(82));
  console.log('  VaaniRAG — 100-Query Multilingual Benchmark across 13 Indic Languages');
  console.log('='.repeat(82));

  // 1. Warm up retrieval index
  console.log('>> Warming up vector index in memory...');
  warmupRetrievalIndex('metadata');
  console.log('✅ Index ready.\n');

  const cleanDir = path.join(process.cwd(), 'data', 'clean');
  const testSuite = loadDatasetQueries(cleanDir, 7);

  console.log(`>> Prepared ${testSuite.length} benchmark questions across ${ALL_LANGUAGES.length} languages:`);
  console.log(`   - In-Dataset Ground Truth Queries: ${testSuite.filter(t => t.isPositive).length}`);
  console.log(`   - Out-of-Domain Guardrail Queries: ${testSuite.filter(t => !t.isPositive).length}\n`);

  const results: TestResult[] = [];
  const retrievalLatencies: number[] = [];
  const totalLatencies: number[] = [];

  let passedGuardrails = 0;
  let llmCallsCount = 0;

  for (let i = 0; i < testSuite.length; i++) {
    const item = testSuite[i];
    const qIndexStr = `[${(i + 1).toString().padStart(3, ' ')}/${testSuite.length}]`;

    // 1. Execute Retrieval (Phase 9)
    const t0 = performance.now();
    const retResult = await retrieve(item.query, item.language, {
      strategy: 'metadata',
      topK: 4,
    });
    const retrievalMs = Math.round((performance.now() - t0) * 100) / 100;
    retrievalLatencies.push(retrievalMs);

    // Guardrail Check:
    // For positive (in-dataset) queries: expected noRelevantContext === false
    // For negative (out-of-domain) queries: expected noRelevantContext === true
    const guardrailSuccess = item.isPositive ? !retResult.noRelevantContext : retResult.noRelevantContext;
    if (guardrailSuccess) passedGuardrails++;

    let answer = '';
    let citedCount = 0;
    let generationMs = 0;
    let totalPostSTT = retrievalMs;

    // Run Groq generation on a representative sample of queries (e.g. 1 per language + all negatives)
    const shouldRunLLM = (i % 7 === 0) || !item.isPositive;

    if (shouldRunLLM && !retResult.noRelevantContext && retResult.chunks.length > 0) {
      try {
        const tGen0 = performance.now();
        const gen = await generateAnswer({
          question: item.query,
          detectedLanguage: item.language,
          retrievedChunks: retResult.chunks,
        });
        generationMs = Math.round((performance.now() - tGen0) * 100) / 100;
        answer = gen.answer;
        citedCount = gen.citedChunkIds.length;
        totalPostSTT = Math.round((retrievalMs + generationMs) * 100) / 100;
        totalLatencies.push(totalPostSTT);
        llmCallsCount++;
      } catch (err: any) {
        answer = `LLM error: ${err?.message}`;
      }
    } else if (retResult.noRelevantContext) {
      answer = 'I do not have sufficient verified context to answer this question.';
    }

    results.push({
      id: item.id,
      language: item.language,
      query: item.query,
      isPositive: item.isPositive,
      retrievalMs,
      embedMs: retResult.timing.embedMs,
      searchMs: retResult.timing.searchMs,
      rerankMs: retResult.timing.rerankMs,
      topScore: retResult.topScore,
      noRelevantContext: retResult.noRelevantContext,
      guardrailSuccess,
      answer,
      citedChunksCount: citedCount,
      generationMs: generationMs > 0 ? generationMs : undefined,
      totalPostSTTMs: totalPostSTT,
    });

    const statusBadge = guardrailSuccess ? '✅ PASS' : '⚠️ WARN';
    const typeBadge = item.isPositive ? '[In-Dataset]' : '[Out-Domain]';
    console.log(`${qIndexStr} ${statusBadge} ${item.language.toUpperCase().padEnd(3)} ${typeBadge.padEnd(12)} | Ret: ${retrievalMs.toFixed(1).padStart(5)}ms | Score: ${retResult.topScore.toFixed(3)} | "${item.query.slice(0, 42)}..."`);
  }

  // ── Compute Statistics ───────────────────────────────────────────────────
  retrievalLatencies.sort((a, b) => a - b);
  const p50Ret = retrievalLatencies[Math.floor(retrievalLatencies.length * 0.5)];
  const p90Ret = retrievalLatencies[Math.floor(retrievalLatencies.length * 0.9)];
  const p99Ret = retrievalLatencies[Math.floor(retrievalLatencies.length * 0.99)];
  const avgRet = Math.round((retrievalLatencies.reduce((a, b) => a + b, 0) / retrievalLatencies.length) * 100) / 100;

  console.log('\n' + '='.repeat(82));
  console.log('  MULTILINGUAL 100-QUERY BENCHMARK SUMMARY REPORT');
  console.log('='.repeat(82));
  console.log(`Total Queries Tested:      ${testSuite.length}`);
  console.log(`Languages Covered:         13 Indic Languages (as, bn, gu, hi, kn, ml, mr, ne, or, pa, ta, te, ur)`);
  console.log(`Guardrail Success Rate:    ${passedGuardrails}/${testSuite.length} (${Math.round((passedGuardrails / testSuite.length) * 100)}%)`);
  console.log(`Live LLM Samples Run:     ${llmCallsCount}`);
  console.log('-'.repeat(82));
  console.log('  RETRIEVAL LATENCY BREAKDOWN (Across 104 Queries):');
  console.log(`  • Average Retrieval Time: ${avgRet} ms`);
  console.log(`  • P50 Retrieval Latency:  ${p50Ret} ms`);
  console.log(`  • P90 Retrieval Latency:  ${p90Ret} ms`);
  console.log(`  • P99 Retrieval Latency:  ${p99Ret} ms`);
  console.log('-'.repeat(82));

  // Per-language performance table
  console.log('  PER-LANGUAGE BREAKDOWN:');
  console.log(`${'Lang'.padEnd(6)} | ${'Language Name'.padEnd(14)} | ${'Queries'.padEnd(8)} | ${'Avg Ret Time'.padEnd(13)} | ${'Top Score Avg'.padEnd(14)} | ${'Guardrail Pass'.padEnd(14)}`);
  console.log('-'.repeat(82));

  for (const lang of ALL_LANGUAGES) {
    const langResults = results.filter(r => r.language === lang);
    const avgLRet = Math.round((langResults.reduce((a, b) => a + b.retrievalMs, 0) / langResults.length) * 10) / 10;
    const avgScore = Math.round((langResults.reduce((a, b) => a + b.topScore, 0) / langResults.length) * 1000) / 1000;
    const passCount = langResults.filter(r => r.guardrailSuccess).length;

    console.log(`${lang.padEnd(6)} | ${(LANGUAGE_NAMES[lang] || lang).padEnd(14)} | ${langResults.length.toString().padEnd(8)} | ${(avgLRet + ' ms').padEnd(13)} | ${avgScore.toString().padEnd(14)} | ${`${passCount}/${langResults.length}`.padEnd(14)}`);
  }
  console.log('='.repeat(82));

  // Save report to reports/multilingual_100_qa_benchmark.json
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(reportsDir, 'multilingual_100_qa_benchmark.json');
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalQueries: testSuite.length,
    passedGuardrails,
    guardrailAccuracyPercent: Math.round((passedGuardrails / testSuite.length) * 100),
    latency: {
      averageRetrievalMs: avgRet,
      p50RetrievalMs: p50Ret,
      p90RetrievalMs: p90Ret,
      p99RetrievalMs: p99Ret,
    },
    results,
  }, null, 2), 'utf-8');

  console.log(`\n📄 Detailed Benchmark Artifact saved to: ${reportFile}\n`);
}

main().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
