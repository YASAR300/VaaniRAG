'use client';

/**
 * components/ui/voice-input.jsx
 *
 * Self-contained voice input component:
 *   - Click to start recording (requests mic, starts MediaRecorder + AnalyserNode)
 *   - Pill expands to show animated frequency bars + elapsed timer
 *   - Click again (or reaches maxDurationMs) to stop
 *   - On stop: POSTs to /api/transcribe, returns transcript via onTranscript(text, lang)
 *
 * Props:
 *   onTranscript(text, lang, latencyMs)  — called on successful transcription
 *   onTranscribeError(message)           — called on STT error
 *   maxDurationMs                        — max recording length (default 30s)
 *   disabled                             — block while parent is busy
 *   className
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const DEFAULT_MAX_MS   = 30_000;
const SILENCE_THRESH   = 12;   // max amplitude seen must exceed this or we flag no-speech
const FFT_SIZE         = 256;
const BAR_COUNT        = 12;
const BAR_HEIGHTS      = [4, 10, 7, 13, 6, 11, 4, 9, 13, 5, 10, 7]; // stable, no Math.random

// States: idle | requesting | recording | transcribing | error
export function VoiceInput({
  className,
  onTranscript,
  onTranscribeError,
  maxDurationMs = DEFAULT_MAX_MS,
  disabled = false,
}) {
  const [phase, setPhase]       = useState('idle');   // idle | requesting | recording | transcribing | error
  const [elapsed, setElapsed]   = useState(0);
  const [errMsg, setErrMsg]     = useState('');

  const streamRef    = useRef(null);
  const recorderRef  = useRef(null);
  const ctxRef       = useRef(null);
  const analyserRef  = useRef(null);
  const chunksRef    = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef     = useRef(null);
  const maxAmpRef    = useRef(0);
  const rafRef       = useRef(null);
  const canvasRef    = useRef(null);

  /* ── cleanup ─────────────────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current)    { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (ctxRef.current)    { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    analyserRef.current  = null;
    recorderRef.current  = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  /* ── canvas waveform (runs while phase === 'recording') ──────────────── */
  useEffect(() => {
    if (phase !== 'recording') {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dataArray  = new Uint8Array(FFT_SIZE / 2);
    const bucketSize = Math.floor((FFT_SIZE / 2) / BAR_COUNT);

    const draw = () => {
      const analyser = analyserRef.current;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width  = w;
      canvas.height = h;

      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > maxAmpRef.current) maxAmpRef.current = dataArray[i];
        }

        ctx.clearRect(0, 0, w, h);
        const barW = Math.max(2, w / BAR_COUNT - 1.5);
        const gap  = w / BAR_COUNT - barW;
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < bucketSize; j++) sum += dataArray[i * bucketSize + j] ?? 0;
          const norm = (sum / bucketSize) / 255;
          const barH = Math.max(2, norm * (h - 2));
          ctx.fillStyle = `rgba(255,255,255,${0.3 + norm * 0.7})`;
          ctx.beginPath();
          ctx.roundRect(i * (barW + gap), (h - barH) / 2, barW, barH, 1.5);
          ctx.fill();
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  /* ── start ───────────────────────────────────────────────────────────── */
  const start = useCallback(async () => {
    if (disabled || phase === 'transcribing') return;
    maxAmpRef.current  = 0;
    chunksRef.current  = [];
    setElapsed(0);
    setErrMsg('');
    setPhase('requesting');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const n   = err?.name ?? '';
      const msg = (n === 'NotAllowedError' || n === 'PermissionDeniedError')
        ? "Microphone access was denied. Check browser site settings and allow mic, then try again."
        : (n === 'NotFoundError' || n === 'DevicesNotFoundError')
        ? "No microphone found on this device."
        : err?.message ?? "Could not access the microphone.";
      setErrMsg(msg);
      setPhase('error');
      onTranscribeError?.(msg);
      return;
    }

    const audioCtx  = new AudioContext();
    const analyser  = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.7;
    audioCtx.createMediaStreamSource(stream).connect(analyser);

    streamRef.current   = stream;
    ctxRef.current      = audioCtx;
    analyserRef.current = analyser;

    const mime     = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    recorder.onstop = async () => {
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      cleanup();

      // Client-side silence check before spending an API call
      if (maxAmpRef.current < SILENCE_THRESH) {
        const msg = "We didn't detect any speech. Try again and speak clearly.";
        setErrMsg(msg);
        setPhase('error');
        onTranscribeError?.(msg);
        return;
      }

      // POST to /api/transcribe (server-side Sarvam call)
      setPhase('transcribing');
      try {
        const form = new FormData();
        form.append('file', blob, 'recording.webm');
        const res  = await fetch('/api/transcribe', { method: 'POST', body: form });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          const msg = data?.error?.message ?? 'Transcription failed. Please try again.';
          setErrMsg(msg);
          setPhase('error');
          onTranscribeError?.(msg);
          return;
        }

        setPhase('idle');
        onTranscript?.(data.text, data.detectedLanguage, data.latencyMs);
      } catch (fetchErr) {
        const msg = 'Network error — could not reach the transcription service.';
        setErrMsg(msg);
        setPhase('error');
        onTranscribeError?.(msg);
      }
    };

    recorder.start(100);
    startedAtRef.current = Date.now();
    setPhase('recording');
    setElapsed(0);

    timerRef.current = setInterval(() => {
      const e = Date.now() - startedAtRef.current;
      setElapsed(e);
      if (e >= maxDurationMs) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        recorderRef.current?.stop();
      }
    }, 50);
  }, [disabled, phase, maxDurationMs, cleanup, onTranscript, onTranscribeError]);

  /* ── stop ────────────────────────────────────────────────────────────── */
  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
  }, []);

  /* ── click handler ───────────────────────────────────────────────────── */
  const handleClick = () => {
    if (phase === 'idle' || phase === 'error') start();
    else if (phase === 'recording') stop();
    // requesting / transcribing → no-op (show spinner, don't re-trigger)
  };

  const isExpanded = phase === 'recording' || phase === 'transcribing' || phase === 'requesting';
  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex items-center', className)}>
      <motion.div
        layout
        transition={{ layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
        onClick={handleClick}
        role="button"
        aria-label={phase === 'recording' ? 'Stop recording' : 'Start recording'}
        aria-pressed={phase === 'recording'}
        className={cn(
          'flex items-center rounded-full cursor-pointer select-none transition-colors',
          'border focus:outline-none',
          phase === 'recording'
            ? 'border-white/30 bg-white/5 px-2 py-1'
            : phase === 'error'
            ? 'border-red-800/40 bg-red-900/10 p-1.5'
            : phase === 'transcribing' || phase === 'requesting'
            ? 'border-[#27272a] bg-transparent p-1.5'
            : 'border-[#27272a] bg-transparent p-1.5 hover:border-white/20',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        {/* Icon */}
        <div className="h-5 w-5 flex items-center justify-center shrink-0">
          {phase === 'transcribing' || phase === 'requesting' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#71717a]" />
          ) : phase === 'recording' ? (
            /* Pulsing red dot = recording indicator */
            <span
              className="w-2.5 h-2.5 rounded-full bg-white"
              style={{ animation: 'recVoicePulse 1s ease-in-out infinite' }}
            />
          ) : (
            <Mic className={cn('w-3.5 h-3.5', phase === 'error' ? 'text-red-400' : 'text-[#71717a]')} />
          )}
        </div>

        {/* Expanded: waveform canvas + timer */}
        <AnimatePresence mode="wait">
          {phase === 'recording' && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: 'auto', marginLeft: 8 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden flex items-center gap-2 pr-1"
            >
              {/* Live waveform canvas */}
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{ width: 60, height: 20, display: 'block' }}
              />
              {/* Timer */}
              <span className="text-[11px] font-mono text-[#a1a1aa] w-9 text-center tabular-nums shrink-0">
                {fmtTime(elapsed)}
              </span>
            </motion.div>
          )}
          {(phase === 'requesting' || phase === 'transcribing') && (
            <motion.span
              key="status"
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: 'auto', marginLeft: 6 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] text-[#71717a] whitespace-nowrap overflow-hidden shrink-0 pr-1"
            >
              {phase === 'requesting' ? 'Allow mic…' : 'Transcribing…'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Screen reader live region */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === 'recording' ? `Recording — ${fmtTime(elapsed)}` :
         phase === 'transcribing' ? 'Transcribing…' :
         phase === 'error' ? `Error: ${errMsg}` : ''}
      </span>

      <style>{`
        @keyframes recVoicePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

export default VoiceInput;
