/**
 * scripts/benchmark/test_qdrant_cloud_retrieval.ts — Verify Qdrant Cloud Similarity Search
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getQdrantClient, QDRANT_COLLECTIONS } from '../../lib/qdrant/client';
import { embed } from '../../lib/embeddings/embed';

async function main() {
  console.log('='.repeat(80));
  console.log('  Testing Qdrant Cloud Similarity Search Live');
  console.log('='.repeat(80));

  const qdrant = getQdrantClient();
  const testQueries = [
    { query: 'कॉर्पोरेशन क्या है?', lang: 'hi' },
    { query: 'What is a corporation?', lang: 'en' },
    { query: 'રેચેલ કાર્સને શા માટે સહન કરવાની જવાબદારી લખી?', lang: 'gu' },
  ];

  for (const item of testQueries) {
    console.log(`\n🔍 Query: "${item.query}" (${item.lang.toUpperCase()})`);
    const t0 = performance.now();
    const queryVector = await embed(item.query, { language: item.lang });
    const embedMs = performance.now() - t0;

    const t1 = performance.now();
    try {
      const searchRes = await qdrant.search('chunks_metadata', {
        vector: queryVector,
        limit: 3,
        with_payload: true,
      });
      const searchMs = performance.now() - t1;

      console.log(`   ⏱️  Embed Latency:  ${embedMs.toFixed(2)}ms`);
      console.log(`   ⏱️  Qdrant Search:  ${searchMs.toFixed(2)}ms (Cloud roundtrip)`);
      console.log(`   📊 Results Found:   ${searchRes.length}`);

      for (let i = 0; i < searchRes.length; i++) {
        const hit = searchRes[i];
        const payload = hit.payload as any;
        console.log(`     [#${i + 1}] Score: ${hit.score.toFixed(4)} | Lang: ${payload?.language} | ID: ${payload?.chunkId}`);
        console.log(`         Snippet: "${(payload?.text || '').slice(0, 90)}..."`);
      }
    } catch (err: any) {
      console.log(`   ⚠️ Search error on Qdrant Cloud:`, err?.message || err);
    }
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
