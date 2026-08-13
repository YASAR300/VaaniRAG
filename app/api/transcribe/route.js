import { NextResponse } from 'next/server';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const audioFile = formData.get('file');

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided in request form data' },
        { status: 400 }
      );
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      transcript: 'Placeholder transcript (Sarvam AI integration active in Phase 3)',
      languageCode: 'hi-IN',
      confidence: 0.98,
      latencyMs: durationMs,
      status: 'success',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Transcription failed', details: error.message },
      { status: 500 }
    );
  }
}
