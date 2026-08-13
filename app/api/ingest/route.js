import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { strategy = 'fixed_sliding' } = body;

    return NextResponse.json({
      status: 'success',
      message: 'Ingestion pipeline stub active. Chunking & embeddings configured in Phase 4.',
      strategy,
      processedPassages: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ingestion failed', details: error.message },
      { status: 500 }
    );
  }
}
