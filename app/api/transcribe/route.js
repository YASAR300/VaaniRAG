/**
 * app/api/transcribe/route.js — Phase 5: Sarvam STT proxy route
 *
 * Design decision: this route proxies audio to Sarvam AI server-side so
 * SARVAM_API_KEY never reaches the browser. Recorder.jsx (Phase 4) produces
 * a Blob; the client POSTs it here as multipart/form-data with field "file".
 *
 * Request:  POST /api/transcribe
 *           Content-Type: multipart/form-data
 *           Body field:   file → audio Blob (webm/ogg/wav/mp3 etc.)
 *
 * Response (success, 200):
 *   { ok: true, text, detectedLanguage, confidence?, requestId?, latencyMs }
 *
 * Response (failure, 4xx/5xx):
 *   { ok: false, error: { type, message } }
 *
 * HTTP status codes on failure (important for Phase 12 harness):
 *   400 → no audio payload / malformed request
 *   413 → payload too large (> MAX_AUDIO_BYTES)
 *   422 → audio received but could not be transcribed (silent, too-short, unsupported language)
 *   504 → Sarvam request timed out
 *   502 → Sarvam upstream API error
 *   500 → unexpected server error
 */

import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/sarvam';

// Max audio bytes we'll accept from the client (~5 MB covers 30s of webm/opus comfortably)
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

export async function POST(request) {
  const startTime = Date.now();

  // ── 1. Parse the multipart body
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: { type: 'unknown', message: 'Could not parse request body as multipart/form-data.' } },
      { status: 400 }
    );
  }

  const audioFile = formData.get('file');

  // ── 2. Basic validation
  if (!audioFile) {
    return NextResponse.json(
      { ok: false, error: { type: 'unknown', message: 'No audio file provided. Send the recording as a "file" field in multipart/form-data.' } },
      { status: 400 }
    );
  }

  // audioFile is a File/Blob in Next.js App Router
  const audioBlob = audioFile instanceof Blob ? audioFile : null;
  if (!audioBlob) {
    return NextResponse.json(
      { ok: false, error: { type: 'unknown', message: 'The "file" field is not a valid audio blob.' } },
      { status: 400 }
    );
  }

  if (audioBlob.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          type:    'unknown',
          message: `Audio is too large (${Math.round(audioBlob.size / 1024)}KB). Maximum accepted size is ${Math.round(MAX_AUDIO_BYTES / 1024)}KB.`,
        },
      },
      { status: 413 }
    );
  }

  // ── 3. Call Sarvam STT (server-side only — key never leaves this file)
  try {
    const result = await transcribeAudio(audioBlob, { timeoutMs: 12_000 });
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      ok:               true,
      text:             result.text,
      detectedLanguage: result.detectedLanguage,
      confidence:       result.confidence,
      requestId:        result.requestId,
      latencyMs,
    });

  } catch (sttError) {
    const latencyMs = Date.now() - startTime;

    // Map typed SarvamTranscriptionError → HTTP status + user message
    const type = sttError?.type ?? 'unknown';
    const msg  = sttError?.message ?? 'Transcription failed.';

    let status;
    let userMessage;

    switch (type) {
      case 'unsupported-language':
        status      = 422;
        userMessage = "We couldn't recognize the language you spoke. Try again in one of the supported languages.";
        break;
      case 'audio-too-short':
        status      = 422;
        userMessage = "We didn't catch that — try recording again and speak a bit more.";
        break;
      case 'silent-audio':
        status      = 422;
        userMessage = "We didn't catch that — try recording again and speak clearly.";
        break;
      case 'timeout':
        status      = 504;
        userMessage = 'The transcription took too long and timed out. Please try again.';
        break;
      case 'api-error':
        status      = 502;
        userMessage = 'Something went wrong while transcribing your question. Please try again in a moment.';
        break;
      default:
        status      = 500;
        userMessage = msg || 'Something went wrong. Please try again.';
    }

    console.error(`[/api/transcribe] ${type} after ${latencyMs}ms:`, msg);

    return NextResponse.json(
      { ok: false, error: { type, message: userMessage } },
      { status }
    );
  }
}
