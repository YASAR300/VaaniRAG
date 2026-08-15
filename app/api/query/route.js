import { NextResponse } from 'next/server';
import { retrieve, warmupRetrievalIndex } from '@/lib/retrieval/retrieve';
import { generateAnswer } from '@/lib/generation/answer';

// Warm up the retrieval vector index on server startup
try {
  warmupRetrievalIndex('metadata');
} catch (e) {
  // ignore during build
}

export async function POST(request) {
  const startTime = performance.now();

  try {
    const body = await request.json();
    const { query, language = 'hi' } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    // ── 1. Phase 9: Retrieval & Reranking ─────────────────────────────
    const tRetStart = performance.now();
    const retrievalResult = await retrieve(query, language, {
      strategy: 'metadata',
      topK: 4,
    });
    const retrievalMs = Math.round((performance.now() - tRetStart) * 100) / 100;

    // ── 2. Guardrail Check: No Relevant Context ───────────────────────
    if (retrievalResult.noRelevantContext || retrievalResult.chunks.length === 0) {
      const totalLatencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      return NextResponse.json({
        answer: 'I do not have sufficient verified context in the dataset to answer this question.',
        citations: [],
        confidence: 'low',
        telemetry: {
          totalLatencyMs,
          budgetMet: totalLatencyMs <= 200,
          stages: {
            guardrailMs: 1,
            retrievalMs,
            generationMs: 0,
            groundingCheckMs: 1,
          },
        },
      });
    }

    // ── 3. Phase 10: Grounded Groq LLM Answer Generation ─────────────
    const tGenStart = performance.now();
    const genResult = await generateAnswer({
      question: query,
      detectedLanguage: language,
      retrievedChunks: retrievalResult.chunks,
    });
    const generationMs = Math.round((performance.now() - tGenStart) * 100) / 100;

    const totalLatencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    // Map citations to client format
    const citations = retrievalResult.chunks.map(chunk => ({
      passageId: chunk.id,
      text: chunk.text,
      language: chunk.language,
      score: chunk.score,
    }));

    return NextResponse.json({
      answer: genResult.answer,
      citations,
      citedChunkIds: genResult.citedChunkIds,
      confidence: genResult.confidence,
      telemetry: {
        totalLatencyMs,
        budgetMet: totalLatencyMs <= 200,
        stages: {
          retrievalTiming: retrievalResult.timing,
          retrievalMs,
          generationMs,
        },
      },
    });
  } catch (error) {
    console.error('API /api/query error:', error);
    return NextResponse.json(
      { error: 'Query execution failed', details: error.message },
      { status: 500 }
    );
  }
}
