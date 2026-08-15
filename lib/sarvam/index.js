/**
 * lib/sarvam/index.js — Sarvam AI STT client wrapper (Phase 5)
 *
 * API verified against live docs on 2026-08-15:
 *   https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/rest-api
 *
 * Contract:
 *   - Endpoint:  POST https://api.sarvam.ai/speech-to-text
 *   - Auth:      header  api-subscription-key: <key>
 *   - Request:   multipart/form-data
 *                  file    → audio blob (webm/ogg/mp3/wav/flac all supported)
 *                  model   → "saaras:v3"  (current recommended model)
 *                  mode    → "transcribe" (returns transcript + language_code)
 *   - Response:  { request_id, transcript, language_code }
 *   - Errors:    { error: { message, code, request_id } }
 *                  400 → bad request / audio issue
 *                  403 → invalid API key
 *                  422 → unprocessable (silent, too-short, or unsupported content)
 *                  429 → rate limit
 *                  5xx → upstream Sarvam error
 *
 * This function THROWS a typed SarvamTranscriptionError on failure.
 * Phase 12's harness wraps this in its own retry/error layer — do not add
 * retry logic here; keep this as a single-attempt, typed, low-level client.
 *
 * @typedef {{
 *   text: string,
 *   detectedLanguage: string,
 *   confidence?: number,
 *   requestId?: string,
 *   raw?: unknown,
 * }} SarvamTranscriptionResult
 *
 * @typedef {{
 *   type: 'unsupported-language' | 'audio-too-short' | 'silent-audio' | 'timeout' | 'api-error' | 'unknown',
 *   message: string,
 *   statusCode?: number,
 * }} SarvamTranscriptionError
 */

const SARVAM_STT_URL   = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_MODEL     = 'saaras:v3';
const DEFAULT_TIMEOUT  = 10_000; // ms — keeps pipeline latency sane

// Minimum blob size to send
const MIN_BLOB_BYTES = 100;

/**
 * Transcribe an audio Blob using Sarvam AI Saarika/Saaras v3.
 *
 * @param {Blob} audioBlob
 * @param {{ languageHint?: string; timeoutMs?: number }} [options]
 * @returns {Promise<SarvamTranscriptionResult>}
 * @throws {SarvamTranscriptionError}
 */
export async function transcribeAudio(audioBlob, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT } = options;

  // ── Pre-flight: reject empty blobs before spending an API call
  if (!audioBlob || audioBlob.size < MIN_BLOB_BYTES) {
    /** @type {SarvamTranscriptionError} */
    const err = {
      type: 'silent-audio',
      message: `Audio recording is empty (${audioBlob?.size ?? 0} bytes). Please speak into the mic and try again.`,
    };
    throw err;
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    /** @type {SarvamTranscriptionError} */
    const err = {
      type: 'unknown',
      message: 'SARVAM_API_KEY is not set. Cannot call the transcription API.',
    };
    throw err;
  }

  // ── Build the multipart/form-data request
  // Normalize MIME type to pure 'audio/webm' or 'audio/wav' (strip parameters like codecs=opus which Sarvam rejects)
  const cleanMimeType = (audioBlob.type && audioBlob.type.includes(';'))
    ? audioBlob.type.split(';')[0].trim()
    : (audioBlob.type || 'audio/webm');

  const arrayBuf = await audioBlob.arrayBuffer();
  const normalizedBlob = new Blob([arrayBuf], { type: cleanMimeType });

  const form = new FormData();
  // Sarvam docs: field name is "file", model is "saaras:v3", mode is "transcribe"
  form.append('file', normalizedBlob, 'recording.webm');
  form.append('model', SARVAM_MODEL);
  form.append('mode', 'transcribe');

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(SARVAM_STT_URL, {
      method:  'POST',
      headers: {
        // Sarvam auth header — verified from live docs
        'api-subscription-key': apiKey,
      },
      body:   form,
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr?.name === 'AbortError') {
      /** @type {SarvamTranscriptionError} */
      const err = {
        type:    'timeout',
        message: `Sarvam STT request timed out after ${timeoutMs}ms.`,
      };
      throw err;
    }
    /** @type {SarvamTranscriptionError} */
    const err = {
      type:    'unknown',
      message: fetchErr?.message ?? 'Network error while contacting Sarvam AI.',
    };
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // ── Parse the JSON body (Sarvam always returns JSON, even for errors)
  let body;
  try {
    body = await response.json();
  } catch {
    /** @type {SarvamTranscriptionError} */
    const err = {
      type:       'api-error',
      message:    `Sarvam returned a non-JSON response (HTTP ${response.status}).`,
      statusCode: response.status,
    };
    throw err;
  }

  // ── Handle non-2xx responses
  if (!response.ok) {
    const apiMessage = body?.error?.message ?? body?.message ?? JSON.stringify(body);
    const apiCode    = body?.error?.code    ?? '';
    const status     = response.status;

    /** @type {SarvamTranscriptionError} */
    let err;

    if (status === 422) {
      // 422 = unprocessable — audio content issue (silent, too short, bad format, unsupported language)
      const lower = apiMessage.toLowerCase();
      if (lower.includes('language') || lower.includes('unsupported')) {
        err = { type: 'unsupported-language', message: apiMessage, statusCode: status };
      } else if (lower.includes('short') || lower.includes('duration')) {
        err = { type: 'audio-too-short', message: apiMessage, statusCode: status };
      } else if (lower.includes('silent') || lower.includes('speech') || lower.includes('empty')) {
        err = { type: 'silent-audio', message: apiMessage, statusCode: status };
      } else {
        // Generic 422 — treat as silent/unprocessable
        err = { type: 'silent-audio', message: apiMessage || 'Audio could not be transcribed.', statusCode: status };
      }
    } else if (status === 400) {
      err = { type: 'audio-too-short', message: apiMessage || 'Bad audio request.', statusCode: status };
    } else {
      err = { type: 'api-error', message: apiMessage || `Sarvam API error (HTTP ${status}).`, statusCode: status };
    }

    throw err;
  }

  // ── Success — map to our typed result
  // Sarvam v3 transcription response: { request_id, transcript, language_code, language_probability }
  const text             = body.transcript   ?? '';
  const detectedLanguage = body.language_code ?? 'unknown';
  const confidence       = typeof body.language_probability === 'number'
    ? Math.round(body.language_probability * 100) / 100
    : undefined;

  if (!text.trim()) {
    // API returned 200 but empty transcript → treat as silent audio
    /** @type {SarvamTranscriptionError} */
    const err = {
      type:    'silent-audio',
      message: 'No speech detected in the recording. Please speak clearly into your mic.',
    };
    throw err;
  }

  return {
    text,
    detectedLanguage,
    confidence,
    requestId: body.request_id,
    raw:       body,
  };
}
