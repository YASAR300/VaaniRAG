'use client';

/**
 * Recorder.jsx — Phase 4 (Dashboard-Inline variant)
 *
 * Renders in two modes depending on the `recorderState`:
 *   IDLE / ERROR   → compact mic button (sits in the input bar)
 *   REQUESTING     → spinner mic button
 *   RECORDING      → full-width recording strip (waveform + timer + stop)
 *   PROCESSING     → spinner strip
 *
 * The parent controls layout by checking `recorder.isExpanded` to hide/show
 * the text input field. All audio logic is identical to the original.
 *
 * @typedef {{ type: 'permission-denied' }
 *          | { type: 'no-speech-detected' }
 *          | { type: 'device-unavailable' }
 *          | { type: 'unknown'; message: string }} RecorderError
 *
 * @typedef {{ status: 'idle' }
 *          | { status: 'requesting-permission' }
 *          | { status: 'recording'; startedAt: number }
 *          | { status: 'processing' }
 *          | { status: 'error'; error: RecorderError }} RecorderState
 *
 * @typedef {{
 *   onRecordingComplete: (blob: Blob, durationMs: number) => void,
 *   onError?: (error: RecorderError) => void,
 *   maxDurationMs?: number,
 *   disabled?: boolean,
 * }} RecorderProps
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
const DEFAULT_MAX_DURATION_MS = 30_000;
const SILENCE_THRESHOLD       = 15;
const BAR_COUNT               = 40;
const ANALYSER_FFT_SIZE       = 256;
const TIMER_TICK_MS           = 50;

/* ─────────────────────────────────────────────────────────────────────────────
   LiveWaveform — canvas bars, no React re-renders in the hot path
───────────────────────────────────────────────────────────────────────────── */
function LiveWaveform({ analyserRef, isActive, maxAmplitudeSeenRef }) {
  const canvasRef = useRef(null);
  const rafIdRef  = useRef(null);

  useEffect(() => {
    if (!isActive) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Size the canvas to its rendered size
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const bucketSize = Math.floor(ANALYSER_FFT_SIZE / 2 / BAR_COUNT);
    const dataArray  = new Uint8Array(ANALYSER_FFT_SIZE / 2);

    const draw = () => {
      const analyser = analyserRef.current;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      if (!analyser) { rafIdRef.current = requestAnimationFrame(draw); return; }

      analyser.getByteFrequencyData(dataArray);

      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxAmplitudeSeenRef.current) {
          maxAmplitudeSeenRef.current = dataArray[i];
        }
      }

      ctx.clearRect(0, 0, w, h);

      const barW  = Math.max(2, (w / BAR_COUNT) - 1.5);
      const gap   = w / BAR_COUNT - barW;

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < bucketSize; j++) sum += dataArray[i * bucketSize + j] ?? 0;
        const avg        = sum / bucketSize;
        const normalised = avg / 255;
        const minH       = 2;
        const barH       = minH + normalised * (h - minH);
        const x          = i * (barW + gap);
        const y          = (h - barH) / 2; // vertically centred

        const alpha = 0.35 + normalised * 0.65;
        // --marigold (#F2A93B-family) — matches Phase 1 WaveformSignature visual language
        ctx.fillStyle = `hsla(38, 88%, 60%, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 1.5);
        ctx.fill();
      }

      rafIdRef.current = requestAnimationFrame(draw);
    };

    rafIdRef.current = requestAnimationFrame(draw);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [isActive, analyserRef, maxAmplitudeSeenRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ProgressArc — thin circular arc for the mic button (recording state)
───────────────────────────────────────────────────────────────────────────── */
function ProgressArc({ elapsedMs, maxDurationMs, size = 36 }) {
  const r    = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(elapsedMs / maxDurationMs, 1);
  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', pointerEvents: 'none' }}
    >
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="hsl(var(--border))" strokeWidth={2.5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="hsl(var(--sindoor))" strokeWidth={2.5}
        strokeDasharray={circ} strokeDashoffset={circ * pct}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────────── */
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function errorCopy(error) {
  switch (error.type) {
    case 'permission-denied':
      return {
        title: 'Mic access denied',
        body:  'Microphone access was denied. Open your browser\'s site settings, allow microphone access for this page, then try again.',
      };
    case 'no-speech-detected':
      return {
        title: 'No speech detected',
        body:  'We didn\u2019t detect any speech in that recording. Try again and speak clearly into your microphone.',
      };
    case 'device-unavailable':
      return {
        title: 'No microphone found',
        body:  'No microphone was found on this device. Voice input isn\u2019t available right now — check that a mic is connected and allowed in system settings.',
      };
    default:
      return {
        title: 'Recording failed',
        body:  (error.message ? `${error.message} — ` : '') + 'Something went wrong while recording. Please try again.',
      };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component — two rendering modes
   MODE A (compact): just a mic button, fits in an input bar
   MODE B (expanded): full-width recording strip
───────────────────────────────────────────────────────────────────────────── */

/**
 * @param {RecorderProps} props
 */
export function Recorder({
  onRecordingComplete,
  onError,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
  disabled = false,
}) {
  const [recorderState, setRecorderState] = useState({ status: 'idle' });
  const [elapsedMs, setElapsedMs]         = useState(0);
  const [errorMsg, setErrorMsg]           = useState(null);

  const streamRef           = useRef(null);
  const mediaRecorderRef    = useRef(null);
  const audioContextRef     = useRef(null);
  const analyserRef         = useRef(null);
  const chunksRef           = useRef([]);
  const startedAtRef        = useRef(0);
  const timerRef            = useRef(null);
  const maxAmplitudeSeenRef = useRef(0);

  /* cleanup ---------------------------------------------------------------- */
  const cleanupAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current      = null;
    mediaRecorderRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  /* start ------------------------------------------------------------------ */
  const startRecording = useCallback(async () => {
    if (disabled) return;
    maxAmplitudeSeenRef.current = 0;
    chunksRef.current = [];
    setErrorMsg(null);
    setRecorderState({ status: 'requesting-permission' });

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err?.name ?? '';
      const recorderError =
        (name === 'NotAllowedError' || name === 'PermissionDeniedError') ? { type: 'permission-denied' } :
        (name === 'NotFoundError'   || name === 'DevicesNotFoundError')   ? { type: 'device-unavailable' } :
                                                                            { type: 'unknown', message: err?.message ?? String(err) };
      setRecorderState({ status: 'error', error: recorderError });
      setErrorMsg(errorCopy(recorderError).body);
      onError?.(recorderError);
      return;
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = ANALYSER_FFT_SIZE;
    analyser.smoothingTimeConstant = 0.7;
    audioCtx.createMediaStreamSource(stream).connect(analyser);

    streamRef.current       = stream;
    audioContextRef.current = audioCtx;
    analyserRef.current     = analyser;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      cleanupAudio();
      setElapsedMs(0);
      setRecorderState({ status: 'processing' });
      setTimeout(() => {
        if (maxAmplitudeSeenRef.current < SILENCE_THRESHOLD) {
          const silenceErr = { type: 'no-speech-detected' };
          setRecorderState({ status: 'error', error: silenceErr });
          setErrorMsg(errorCopy(silenceErr).body);
          onError?.(silenceErr);
        } else {
          onRecordingComplete(blob, durationMs);
          setRecorderState({ status: 'idle' });
        }
      }, 80);
    };

    recorder.start(100);
    startedAtRef.current = Date.now();
    setRecorderState({ status: 'recording', startedAt: Date.now() });
    setElapsedMs(0);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= maxDurationMs) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      }
    }, TIMER_TICK_MS);
  }, [disabled, cleanupAudio, maxDurationMs, onError, onRecordingComplete]);

  /* stop ------------------------------------------------------------------- */
  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const handleMicClick = () => {
    if (recorderState.status === 'idle' || recorderState.status === 'error') startRecording();
    else if (recorderState.status === 'recording') stopRecording();
  };

  /* derived ---------------------------------------------------------------- */
  const isIdle       = recorderState.status === 'idle';
  const isRequesting = recorderState.status === 'requesting-permission';
  const isRecording  = recorderState.status === 'recording';
  const isProcessing = recorderState.status === 'processing';
  const isError      = recorderState.status === 'error';
  const isExpanded   = isRecording || isProcessing || isRequesting;

  const remainingMs = Math.max(0, maxDurationMs - elapsedMs);

  /* ── MODE B: expanded recording strip ─────────────────────────────────── */
  if (isExpanded) {
    // aria-live status text — updated at ≤1s intervals via elapsedMs (which ticks at 50ms)
    // Only re-announce to screen readers when second boundary crosses
    const remainingSec = Math.ceil(remainingMs / 1000);
    const liveText = isRequesting
      ? 'Waiting for microphone access…'
      : isProcessing
      ? 'Processing recording…'
      : `Recording… ${remainingSec} second${remainingSec !== 1 ? 's' : ''} remaining`;

    return (
      <div
        className="flex-1 flex items-center gap-3 px-1"
        aria-label="Recording in progress"
      >
        {/* Screen-reader live region — announces state transitions */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {liveText}
        </span>

        {/* Record dot + timer */}
        <div className="flex items-center gap-2 shrink-0">
          {isRequesting ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: 'hsl(var(--sindoor))',
                animation: 'recorderDotPulse 1s ease-in-out infinite',
              }}
            />
          )}
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {isRequesting ? 'Waiting…' : isProcessing ? 'Processing…' : formatTime(elapsedMs)}
          </span>
        </div>

        {/* Waveform canvas — stretches to fill */}
        <div className="flex-1 h-8 rounded-lg overflow-hidden bg-surface-3/40">
          {isRecording && (
            <LiveWaveform
              analyserRef={analyserRef}
              isActive={true}
              maxAmplitudeSeenRef={maxAmplitudeSeenRef}
            />
          )}
        </div>

        {/* Time remaining */}
        {isRecording && (
          <span className="font-mono text-[11px] text-muted-foreground shrink-0 tabular-nums">
            -{formatTime(remainingMs)}
          </span>
        )}

        {/* Separator */}
        <div className="w-px h-5 bg-border shrink-0" />

        {/* Stop button */}
        <button
          id="recorder-stop-btn"
          type="button"
          onClick={isRecording ? stopRecording : undefined}
          disabled={!isRecording}
          aria-label="Stop recording"
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: 'hsl(var(--sindoor))',
            opacity: !isRecording ? 0.5 : 1,
            cursor: !isRecording ? 'not-allowed' : 'pointer',
          }}
        >
          <Square className="w-3.5 h-3.5 text-white" fill="white" />
        </button>

        <style>{`
          @keyframes recorderDotPulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  /* ── MODE A: compact mic button ────────────────────────────────────────── */
  return (
    <div className="flex items-center gap-2">
      {/* Error tooltip */}
      {isError && errorMsg && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] max-w-[200px] truncate"
          style={{
            background: 'hsl(var(--sindoor) / 0.1)',
            border: '1px solid hsl(var(--sindoor) / 0.25)',
            color: 'hsl(var(--sindoor))',
          }}
          title={errorMsg}
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{errorCopy(recorderState.error).title}</span>
        </div>
      )}

      {/* Mic button */}
      <div className="relative flex items-center justify-center">
        <button
          id="recorder-mic-btn"
          type="button"
          onClick={handleMicClick}
          disabled={disabled}
          aria-label={isError ? 'Retry recording' : 'Start recording'}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{
            background: isError
              ? 'hsl(var(--sindoor) / 0.12)'
              : 'hsl(var(--accent-2) / 0.12)',
            border: isError
              ? '1px solid hsl(var(--sindoor) / 0.3)'
              : '1px solid hsl(var(--accent-2) / 0.25)',
            color: isError
              ? 'hsl(var(--sindoor))'
              : 'hsl(var(--accent-2))',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {isError
            ? <RefreshCw className="w-3.5 h-3.5" />
            : <Mic       className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </div>
  );
}

export default Recorder;
