/**
 * Hybrid Retrieval & Re-ranking Module Stub (Phase 5)
 */
export async function hybridSearch(query, topK = 5) {
  return {
    query,
    passages: [],
    retrievalMs: 0,
    strategy: 'hybrid_dense_bm25',
  };
}
