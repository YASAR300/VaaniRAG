/**
 * lib/qdrant/client.ts — Qdrant Vector DB Client & Collection Manager (Phase 8)
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import * as crypto from 'crypto';

let qdrantInstance: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (qdrantInstance) return qdrantInstance;

  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;

  qdrantInstance = new QdrantClient({
    url,
    apiKey: apiKey && apiKey.trim().length > 0 ? apiKey : undefined,
    checkCompatibility: false,
  });

  return qdrantInstance;
}

export const QDRANT_COLLECTIONS = {
  fixed: 'chunks_fixed',
  semantic: 'chunks_semantic',
  metadata: 'chunks_metadata',
  hierarchical: 'chunks_hierarchical',
} as const;

/**
 * Generate a deterministic UUIDv5 or valid UUID from a string chunk ID.
 * Qdrant requires point IDs to be unsigned 64-bit integers or standard UUID strings.
 */
export function chunkIdToUUID(chunkId: string): string {
  const hash = crypto.createHash('md5').update(chunkId).digest('hex');
  // Format into 8-4-4-4-12 UUID format
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Ensure a collection exists in Qdrant with 1024-dim Cosine configuration.
 */
export async function ensureCollection(
  client: QdrantClient,
  collectionName: string,
  vectorSize = 1024
): Promise<void> {
  try {
    const exists = await client.collectionExists(collectionName);
    if (!exists.exists) {
      console.log(`[Qdrant] Creating collection: "${collectionName}" (dim: ${vectorSize}, distance: Cosine)...`);
      await client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
        sparse_vectors: {
          bm25: {},
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
    }
  } catch (err: any) {
    // If sparse_vectors is not supported in the target Qdrant version, retry with standard dense vector config
    try {
      await client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
    } catch (innerErr) {
      console.warn(`[Qdrant] Note on collection "${collectionName}":`, innerErr?.message || innerErr);
    }
  }
}
