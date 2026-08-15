import { NextResponse } from 'next/server';
import { warmupRetrievalIndex } from '@/lib/retrieval/retrieve';
import { runTracedQuery } from '@/lib/observability/tracedPipeline';

// Warm up the retrieval vector index on server startup
try {
  warmupRetrievalIndex('metadata');
} catch (e) {
  // ignore during build
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, language = 'hi', sttDurationMs } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    // Execute traced sequencing pipeline (Retrieval + Generation + Fire-and-forget Trace Saving)
    const { result, generation, trace } = await runTracedQuery(query, language, {
      strategy: 'metadata',
      topK: 4,
      sttDurationMs,
    });

    const citations = result.chunks.map(chunk => ({
      passageId: chunk.id,
      text: chunk.text,
      language: chunk.language,
      score: chunk.score,
    }));

    return NextResponse.json({
      answer: generation.answer,
      citations,
      citedChunkIds: generation.citedChunkIds,
      confidence: generation.confidence,
      traceId: trace.id,
      telemetry: {
        totalLatencyMs: trace.totals.postSttMs,
        budgetMet: trace.totals.postSttMs <= 200,
        stages: {
          retrievalTiming: result.timing,
          retrievalMs: trace.stages.retrieval?.durationMs || 0,
          generationMs: trace.stages.generation?.durationMs || 0,
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
