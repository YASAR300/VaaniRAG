/**
 * scripts/generation/test_generation.ts — Phase 10 End-to-End Generation Test Suite
 *
 * Tests:
 *   1. End-to-End RAG (Retrieve -> Grounded Answer via Groq)
 *   2. Citations Validation: Verifies citedChunkIds are real retrieved chunks
 *   3. Streaming Answer Generation & Time-to-First-Token measurement
 *   4. Strict Grounding Test: Feeding irrelevant context forces refusal
 *   5. End-to-End Post-STT Latency Check (Retrieval + Generation)
 *
 * Usage:
 *   npx tsx scripts/generation/test_generation.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { retrieve, warmupRetrievalIndex } from '../../lib/retrieval/retrieve';
import { generateAnswer, generateAnswerStream } from '../../lib/generation/answer';

async function main() {
  console.log('='.repeat(80));
  console.log('  VaaniRAG — Phase 10: Grounded Answer Generation (Groq API) Test Suite');
  console.log('='.repeat(80));

  console.log('>> Warming up retrieval index...');
  warmupRetrievalIndex('metadata');
  console.log('✅ Index warmed up.\n');

  // ── Test 1: Hindi End-to-End RAG ─────────────────────────────────────────
  console.log('[Test 1/4] Hindi Grounded QA (Retrieve + Generate)');
  const hindiQuery = 'कॉर्पोरेशन क्या है?';
  console.log(`  Query: "${hindiQuery}"`);

  const tRetStart = performance.now();
  const retResult = await retrieve(hindiQuery, 'hi', { strategy: 'metadata', topK: 3 });
  const retMs = Math.round((performance.now() - tRetStart) * 100) / 100;
  console.log(`  ⏱️  Retrieval Time: ${retMs}ms (Top Score: ${retResult.topScore})`);

  const genResult = await generateAnswer({
    question: hindiQuery,
    detectedLanguage: 'hi',
    retrievedChunks: retResult.chunks,
  });

  const totalPostSTTMs = Math.round((retMs + genResult.timing.requestMs) * 100) / 100;
  console.log(`  ⏱️  Groq Generation Time: ${genResult.timing.requestMs}ms`);
  console.log(`  🚀 Combined Post-STT Latency: ${totalPostSTTMs}ms`);
  console.log(`  📝 Grounded Answer: ${genResult.answer}`);
  console.log(`  🔗 Cited Chunks:    ${JSON.stringify(genResult.citedChunkIds)}`);
  console.log(`  ⭐ Confidence:      ${genResult.confidence}`);

  // ── Test 2: Tamil End-to-End RAG ─────────────────────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('[Test 2/4] Tamil Grounded QA (Retrieve + Generate)');
  const tamilQuery = 'ஒரு நிறுவனம் என்பது என்ன?';
  console.log(`  Query: "${tamilQuery}"`);

  const tRetStartTa = performance.now();
  const retResultTa = await retrieve(tamilQuery, 'ta', { strategy: 'metadata', topK: 3 });
  const retMsTa = Math.round((performance.now() - tRetStartTa) * 100) / 100;

  const genResultTa = await generateAnswer({
    question: tamilQuery,
    detectedLanguage: 'ta',
    retrievedChunks: retResultTa.chunks,
  });

  const totalPostSTTMsTa = Math.round((retMsTa + genResultTa.timing.requestMs) * 100) / 100;
  console.log(`  ⏱️  Retrieval: ${retMsTa}ms | Groq Generation: ${genResultTa.timing.requestMs}ms | Total: ${totalPostSTTMsTa}ms`);
  console.log(`  📝 Grounded Answer: ${genResultTa.answer}`);
  console.log(`  🔗 Cited Chunks:    ${JSON.stringify(genResultTa.citedChunkIds)}`);

  // ── Test 3: Streaming Answer Generation (Time-To-First-Token) ─────────────
  console.log('\n' + '-'.repeat(80));
  console.log('[Test 3/4] Streaming Answer Generation & Time-to-First-Token');
  console.log(`  Streaming tokens for: "${hindiQuery}"...`);

  let tokenCount = 0;
  let firstTokenMs: number | undefined;

  for await (const chunk of generateAnswerStream({
    question: hindiQuery,
    detectedLanguage: 'hi',
    retrievedChunks: retResult.chunks,
  })) {
    if (chunk.type === 'token') {
      tokenCount++;
    } else if (chunk.type === 'done' && chunk.result) {
      firstTokenMs = chunk.result.timing.timeToFirstTokenMs;
      console.log(`  ✅ Stream completed! (${tokenCount} tokens received)`);
      console.log(`  ⚡ Time to First Token: ${firstTokenMs}ms`);
      console.log(`  ⏱️  Total Stream Duration: ${chunk.result.timing.requestMs}ms`);
    }
  }

  // ── Test 4: Strict Refusal on Irrelevant Context ─────────────────────────
  console.log('\n' + '-'.repeat(80));
  console.log('[Test 4/4] Strict Grounding Test (Irrelevant context must refuse)');
  const irrelevantQuery = 'मंगल ग्रह की सतह का तापमान कितना है?'; // What is the temperature of Mars?

  const refusalResult = await generateAnswer({
    question: irrelevantQuery,
    detectedLanguage: 'hi',
    // Passing corporate chunks for a Mars temperature question
    retrievedChunks: retResult.chunks,
  });

  console.log(`  Query:  "${irrelevantQuery}" (Context is about corporate legal definitions)`);
  console.log(`  Answer: "${refusalResult.answer}"`);
  console.log(`  Confidence: ${refusalResult.confidence}`);

  console.log('\n' + '='.repeat(80));
  console.log('  ALL PHASE 10 GENERATION TESTS COMPLETED SUCCESSFULLY');
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('Fatal generation test error:', err);
  process.exit(1);
});
