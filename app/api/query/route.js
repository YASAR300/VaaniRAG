import { NextResponse } from 'next/server';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      answer: 'This is a placeholder answer from VaaniRAG pipeline. Harness & LLM generation will be connected in Phase 6.',
      citations: [
        {
          passageId: 'msmarco_sample_01',
          text: 'Sample passage from MS MARCO-XI dataset.',
          score: 0.92,
        },
      ],
      telemetry: {
        totalLatencyMs: durationMs,
        budgetMet: durationMs <= 200,
        stages: {
          guardrailMs: 5,
          retrievalMs: 45,
          generationMs: 110,
          groundingCheckMs: 15,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Query execution failed', details: error.message },
      { status: 500 }
    );
  }
}
