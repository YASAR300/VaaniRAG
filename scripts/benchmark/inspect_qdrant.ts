import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getQdrantClient } from '../../lib/qdrant/client';
import { embed } from '../../lib/embeddings/embed';

async function main() {
  const client = getQdrantClient();
  const vector = await embed('कॉर्पोरेशन क्या है?', { language: 'hi' });
  const results = await client.query('chunks_metadata', {
    query: vector,
    limit: 3,
    with_payload: true,
  });
  console.log('Query results from Qdrant Cloud:');
  for (const pt of results.points) {
    console.log(' - ID:', pt.id, '| Score:', pt.score, '| Lang:', (pt.payload as any)?.language);
    console.log('   Text:', (pt.payload as any)?.text?.slice(0, 80));
  }
}

main().catch(console.error);
