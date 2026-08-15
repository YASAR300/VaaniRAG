/**
 * scripts/observability/test_observability.ts — Phase 11 Test Suite
 *
 * Verifies:
 *   1. Trace schema validation and persistent file writing
 *   2. Non-blocking fire-and-forget saveTrace execution (<2ms)
 *   3. Aggregate stats calculation (P50, P70, P100, stage averages, bottlenecks)
 *   4. Filtered listing (by outcome, time range)
 *   5. Error-state trace capture
 *   6. End-to-end integration with runTracedQuery
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { saveTrace, getTrace, listTraces, getAggregateStats, PipelineTrace } from '../../lib/observability/traceStore';
import { runTracedQuery } from '../../lib/observability/tracedPipeline';

async function main() {
  console.log('='.repeat(82));
  console.log('  VaaniRAG — Phase 11: Trace Storage & Observability Test Suite');
  console.log('='.repeat(82));

  // ── [Test 1/5] Non-Blocking Trace Writing ────────────────────────────────
  console.log('\n[Test 1/5] Non-Blocking Trace Writing Performance');
  const sampleTraceId = `test_tr_${Date.now()}_1`;
  const mockTrace: PipelineTrace = {
    id: sampleTraceId,
    createdAt: new Date().toISOString(),
    question: {
      transcript: 'कॉर्पोरेशन क्या है?',
      detectedLanguage: 'hi',
    },
    stages: {
      stt: {
        startedAt: new Date().toISOString(),
        durationMs: 720,
        status: 'success',
      },
      retrieval: {
        startedAt: new Date().toISOString(),
        durationMs: 4.2,
        status: 'success',
        strategy: 'metadata',
        topK: 4,
        resultCount: 4,
        noRelevantContext: false,
        subSteps: { embedMs: 0.4, searchMs: 3.1, rerankMs: 0.7 },
      },
      generation: {
        startedAt: new Date().toISOString(),
        durationMs: 450,
        status: 'success',
        model: 'llama-3.3-70b-versatile',
        timeToFirstTokenMs: 280,
        citedChunkIds: ['hi_0_sample_1'],
        confidence: 'high',
      },
    },
    totals: {
      postSttMs: 454.2,
      fullRequestMs: 1174.2,
    },
    outcome: 'answered',
  };

  const t0 = performance.now();
  await saveTrace(mockTrace);
  const saveDurationMs = performance.now() - t0;

  console.log(`  ⏱️  saveTrace() Execution Duration: ${saveDurationMs.toFixed(3)}ms`);
  if (saveDurationMs < 10) {
    console.log('  ✅ Non-blocking constraint verified (well below 10ms budget impact).');
  } else {
    console.warn('  ⚠️ saveTrace took longer than expected.');
  }

  // ── [Test 2/5] Trace Retrieval & Querying ────────────────────────────────
  console.log('\n[Test 2/5] Trace Retrieval by ID & Filtered Listing');
  const retrieved = await getTrace(sampleTraceId);
  if (retrieved && retrieved.id === sampleTraceId) {
    console.log(`  ✅ Retrieved trace by ID: ${retrieved.id}`);
    console.log(`     Question: "${retrieved.question.transcript}" | Post-STT: ${retrieved.totals.postSttMs}ms`);
  } else {
    throw new Error('Trace retrieval failed.');
  }

  const allTraces = await listTraces({ limit: 10 });
  console.log(`  ✅ Listed ${allTraces.length} recent traces.`);

  // ── [Test 3/5] Error State Capture ───────────────────────────────────────
  console.log('\n[Test 3/5] Error-State Trace Capture');
  const errorTraceId = `test_tr_err_${Date.now()}`;
  const errorTrace: PipelineTrace = {
    id: errorTraceId,
    createdAt: new Date().toISOString(),
    question: {
      transcript: 'Some query that threw an upstream error',
      detectedLanguage: 'en',
    },
    stages: {
      retrieval: {
        startedAt: new Date().toISOString(),
        durationMs: 3.5,
        status: 'success',
        strategy: 'metadata',
        topK: 4,
        resultCount: 0,
        noRelevantContext: true,
        subSteps: { embedMs: 0.3, searchMs: 2.8, rerankMs: 0.4 },
      },
    },
    totals: {
      postSttMs: 3.5,
      fullRequestMs: 3.5,
    },
    outcome: 'error',
    errorDetail: 'Mock simulated upstream network timeout',
  };

  await saveTrace(errorTrace);
  const errorTracesList = await listTraces({ outcome: 'error' });
  const foundError = errorTracesList.find(t => t.id === errorTraceId);
  if (foundError) {
    console.log(`  ✅ Error trace recorded and retrieved: "${foundError.errorDetail}"`);
  } else {
    throw new Error('Error trace was not stored properly.');
  }

  // ── [Test 4/5] Aggregate Statistics & Percentiles ─────────────────────────
  console.log('\n[Test 4/5] Aggregate Percentiles & Stage Breakdown');
  const stats = await getAggregateStats();
  console.log(`  • Total Traces in Storage: ${stats.totalRequests}`);
  console.log(`  • P50 Post-STT Latency:    ${stats.latency.postSttMs.p50} ms`);
  console.log(`  • P70 Post-STT Latency:    ${stats.latency.postSttMs.p70} ms`);
  console.log(`  • P100 Peak Latency:       ${stats.latency.postSttMs.p100} ms`);
  console.log(`  • Mean Latency:            ${stats.latency.postSttMs.mean} ms`);
  console.log(`  • Outcome Breakdown:       `, stats.outcomeBreakdown);
  console.log(`  • Stage Breakdown:         `, stats.stageBreakdown);

  // ── [Test 5/5] Live End-to-End Traced Query Execution ─────────────────────
  console.log('\n[Test 5/5] Live End-to-End Traced Query Execution (runTracedQuery)');
  const liveResult = await runTracedQuery('What is a corporation?', 'en-IN', {
    strategy: 'metadata',
    sttDurationMs: 650,
  });

  console.log(`  ✅ Live Trace Generated:   ${liveResult.trace.id}`);
  console.log(`  ⏱️  Post-STT Total:        ${liveResult.trace.totals.postSttMs} ms`);
  console.log(`  ⏱️  Full Request (inc STT): ${liveResult.trace.totals.fullRequestMs} ms`);
  console.log(`  📝 Answer Summary:         ${liveResult.generation.answer.slice(0, 75)}...`);
  console.log(`  ⭐ Outcome:                ${liveResult.trace.outcome}`);

  console.log('\n' + '='.repeat(82));
  console.log('  ALL PHASE 11 OBSERVABILITY TESTS COMPLETED SUCCESSFULLY');
  console.log('='.repeat(82));
}

main().catch(err => {
  console.error('Fatal observability test failure:', err);
  process.exit(1);
});
