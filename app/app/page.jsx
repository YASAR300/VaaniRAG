'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Bell,
  Star,
  RotateCw,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  MoreHorizontal,
  AtSign,
  Wand2,
  Mic,
  Square,
  Loader2,
} from 'lucide-react';
import { VoiceInput } from '@/components/ui/voice-input';

/* ── Inline Waveform for live recording visualization (Monochrome White) ──── */
function InlineWaveform({ analyserRef, maxAmplitudeSeenRef }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const BAR_COUNT = 36;
  const FFT       = 256;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dataArray = new Uint8Array(FFT / 2);
    const bucketSize = Math.floor(FFT / 2 / BAR_COUNT);

    const draw = () => {
      const analyser = analyserRef.current;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;

      if (!analyser) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxAmplitudeSeenRef.current) {
          maxAmplitudeSeenRef.current = dataArray[i];
        }
      }

      ctx.clearRect(0, 0, w, h);
      const barW = Math.max(2, (w / BAR_COUNT) - 1.5);
      const gap  = w / BAR_COUNT - barW;

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < bucketSize; j++) {
          sum += dataArray[i * bucketSize + j] ?? 0;
        }
        const norm = (sum / bucketSize) / 255;
        const barH = Math.max(3, norm * (h - 4));
        const x = i * (barW + gap);
        const y = (h - barH) / 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + norm * 0.65})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyserRef, maxAmplitudeSeenRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

/* ── RecorderBar component (Black & White Theme) ────────────────────────── */
function RecorderBar({ onRecordingComplete, onError, maxDurationMs = 30000, onExpandChange }) {
  const [status, setStatus]   = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [errType, setErrType] = useState(null);

  const streamRef    = useRef(null);
  const recorderRef  = useRef(null);
  const ctxRef       = useRef(null);
  const analyserRef  = useRef(null);
  const chunksRef    = useRef([]);
  const startRef     = useRef(0);
  const timerRef     = useRef(null);
  const maxAmpRef    = useRef(0);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    analyserRef.current = null;
    recorderRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    onExpandChange?.(['requesting', 'recording', 'processing'].includes(status));
  }, [status, onExpandChange]);

  const start = useCallback(async () => {
    maxAmpRef.current = 0;
    chunksRef.current = [];
    setErrType(null);
    setStatus('requesting');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const n = err?.name ?? '';
      const t = (n === 'NotAllowedError' || n === 'PermissionDeniedError') ? 'permission-denied'
              : (n === 'NotFoundError'   || n === 'DevicesNotFoundError')   ? 'device-unavailable'
              : 'unknown';
      setStatus('error');
      setErrType(t);
      onError?.({ type: t, message: err?.message });
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    ctx.createMediaStreamSource(stream).connect(analyser);

    streamRef.current   = stream;
    ctxRef.current      = ctx;
    analyserRef.current = analyser;

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    const rec  = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorderRef.current = rec;

    rec.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    rec.onstop = () => {
      const dur  = Date.now() - startRef.current;
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      cleanup();
      setElapsed(0);
      setStatus('processing');
      setTimeout(() => {
        if (maxAmpRef.current < 15) {
          setStatus('error');
          setErrType('no-speech');
          onError?.({ type: 'no-speech-detected' });
        } else {
          onRecordingComplete(blob, dur);
          setStatus('idle');
        }
      }, 100);
    };

    rec.start(100);
    startRef.current = Date.now();
    setStatus('recording');
    setElapsed(0);

    timerRef.current = setInterval(() => {
      const e = Date.now() - startRef.current;
      setElapsed(e);
      if (e >= maxDurationMs) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        recorderRef.current?.stop();
      }
    }, 50);
  }, [cleanup, maxDurationMs, onError, onRecordingComplete]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
  }, []);

  const fmt = ms => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  /* Expanded recording strip state (Monochrome B&W) */
  if (status === 'recording' || status === 'processing' || status === 'requesting') {
    return (
      <div className="flex-1 flex items-center gap-3 px-2 py-1">
        <div className="flex items-center gap-2 shrink-0">
          {status === 'requesting' || status === 'processing' ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#a1a1aa]" />
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ animation: 'recPulse 1s ease-in-out infinite' }}
            />
          )}
          <span className="font-mono text-[12px] text-[#a1a1aa] tabular-nums">
            {status === 'requesting' ? 'Waiting for mic…' : status === 'processing' ? 'Processing audio…' : fmt(elapsed)}
          </span>
        </div>

        <div className="flex-1 h-7 rounded-lg overflow-hidden bg-[#09090b] border border-[#27272a]">
          {status === 'recording' && (
            <InlineWaveform analyserRef={analyserRef} maxAmplitudeSeenRef={maxAmpRef} />
          )}
        </div>

        {status === 'recording' && (
          <button
            onClick={stop}
            type="button"
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white text-black hover:bg-[#e4e4e7] transition-colors shadow"
            title="Stop recording"
          >
            <Square className="w-3.5 h-3.5 fill-black" />
          </button>
        )}
        <style>{`@keyframes recPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>
    );
  }

  /* Compact mic button state */
  const isErr = status === 'error';
  return (
    <button
      id="recorder-mic-btn"
      type="button"
      onClick={start}
      aria-label={isErr ? 'Retry recording' : 'Record voice query'}
      title={isErr ? 'Mic error — click to retry' : 'Start voice recording'}
      className="p-2 text-[#71717a] hover:text-white transition-colors focus:outline-none"
    >
      <Mic className={`w-4 h-4 ${isErr ? 'text-white animate-pulse' : ''}`} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D Monochrome Mascot Component (Black & White 3D Robot)
═══════════════════════════════════════════════════════════════════════════ */
function Mascot3DRobotMonochrome() {
  return (
    <div className="relative w-[120px] h-[115px] flex items-center justify-center">
      {/* Background Subtle White Radial Glow */}
      <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />

      {/* SVG Mascot Character (Black & White / Monochrome Grayscale) */}
      <svg
        viewBox="0 0 160 150"
        className="w-full h-full relative z-10 drop-shadow-[0_10px_20px_rgba(255,255,255,0.15)]"
      >
        <defs>
          <linearGradient id="bwHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#a1a1aa" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>

          <linearGradient id="bwBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#71717a" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>

          <linearGradient id="bwVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          <radialGradient id="bwEyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d4d4d8" />
          </radialGradient>

          <linearGradient id="bwCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#71717a" />
          </linearGradient>
        </defs>

        {/* Robot Head */}
        <rect x="35" y="25" width="90" height="65" rx="32" fill="url(#bwHeadGrad)" />

        {/* Ear Antennas */}
        <circle cx="28" cy="58" r="8" fill="#ffffff" />
        <circle cx="132" cy="58" r="8" fill="#ffffff" />

        {/* Glowing Visor Display */}
        <rect x="48" y="40" width="64" height="34" rx="17" fill="#000000" />
        <rect x="50" y="42" width="60" height="30" rx="15" fill="url(#bwVisorGrad)" opacity="0.9" />

        {/* Glowing White Eyes */}
        <ellipse cx="66" cy="57" rx="7" ry="8" fill="url(#bwEyeGlow)" />
        <ellipse cx="94" cy="57" rx="7" ry="8" fill="url(#bwEyeGlow)" />

        {/* Body Base */}
        <path
          d="M 50 92 Q 80 82 110 92 Q 100 125 60 125 Z"
          fill="url(#bwBodyGrad)"
        />

        {/* Floating Cloud Icon at Bottom */}
        <g transform="translate(68, 102)">
          <path
            d="M 6 16 A 10 10 0 0 1 24 10 A 12 12 0 0 1 44 14 A 8 8 0 0 1 42 26 L 8 26 A 8 8 0 0 1 6 16 Z"
            fill="url(#bwCloudGrad)"
            opacity="0.95"
          />
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN WORKSPACE PAGE COMPONENT (Strict Black & White Monochrome)
═══════════════════════════════════════════════════════════════════════════ */
export default function WorkspacePage() {
  const [activeFocus, setActiveFocus] = useState('Summarize reports');
  const [inputVal, setInputVal]       = useState('');
  const [notice, setNotice]           = useState(null);
  const [expanded, setExpanded]       = useState(false);

  const onRecordingComplete = useCallback((blob, durationMs) => {
    setNotice({ durationMs });
    console.log('[Phase4] Audio Captured blob size:', blob.size, 'duration:', durationMs, 'ms');
  }, []);

  const onError = useCallback(err => console.warn('[Phase4] Mic error:', err), []);

  const focusPills = [
    'Summarize reports',
    'Extract key insights',
    'Compare projects',
    'Answer questions',
    'Draft documents',
  ];

  const recentConversations = [
    'Summary: Product launch notes',
    'Comparison: Aurora vs Nebula',
    'Extracted 5 insights from HR feedback',
    'Q4 Strategy deck — summarized into 3 key themes',
    'Security policy mentions across internal docs',
    'Generated report: AI adoption trends 2025',
    'Meeting recap: Marketing sync — Oct 10',
    'Sprint retrospective & roadmap priorities',
    'Customer interview transcripts — Batch 4',
    'Competitive analysis: Features breakdown',
    'Architecture RFC: Vector DB performance',
    'Legal & compliance audit summary 2025',
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-[#09090b] text-[#f4f4f5]">

      {/* ── Center Main Panel ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto border-r border-[#27272a] bg-[#09090b] custom-scrollbar">

        {/* Top Header Bar */}
        <header className="px-8 py-5 flex items-center justify-between border-b border-[#27272a] sticky top-0 bg-[#09090b]/90 backdrop-blur-md z-10">
          <div>
            <h1 className="font-bold text-[20px] text-white tracking-tight leading-none">
              Good evening, Researcher!
            </h1>
            <p className="text-[13px] text-[#71717a] mt-1 font-medium">
              What would you like to explore today?
            </p>
          </div>

          {/* Top Right Controls Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
              <button type="button" className="text-[#71717a] hover:text-white transition-colors" title="Notifications">
                <Bell className="w-4 h-4" />
              </button>
              <div className="w-px h-3.5 bg-[#27272a]" />
              <button type="button" className="text-[#71717a] hover:text-white transition-colors" title="Favorites">
                <Star className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <div className="p-8 max-w-4xl mx-auto w-full space-y-6">

          {/* "Choose your focus" Section */}
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              Choose your focus
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {focusPills.map(pill => {
                const isActive = activeFocus === pill;
                return (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setActiveFocus(pill)}
                    className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-black shadow-lg shadow-white/10 scale-[1.02]'
                        : 'bg-[#18181b] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] border border-[#27272a]'
                    }`}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Central AI Workspace Card (SCROLLABLE INNER CONTENT + FIXED SEARCH DOCK) */}
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] overflow-hidden shadow-2xl flex flex-col max-h-[520px]">

            {/* Fixed Top Header inside Workspace Card */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#18181b] shrink-0">
              <h3 className="font-semibold text-[15px] text-white">
                Ask something about your workspace or documents.
              </h3>
              <button type="button" className="text-[#71717a] hover:text-white transition-colors" title="Refresh">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Container inside Workspace Card */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

              {/* 3D Mascot Robot + Speech Bubble */}
              <div className="flex items-center justify-between gap-6 py-1">
                {/* Mascot & Typing Status */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <Mascot3DRobotMonochrome />
                  <span className="text-[11px] text-[#71717a] font-mono tracking-tight">
                    ... Wait a minute
                  </span>
                </div>

                {/* User Prompt Speech Bubble */}
                <div className="flex-1 bg-[#09090b] border border-[#27272a] p-4 rounded-2xl text-[14px] text-[#f4f4f5] leading-relaxed shadow-sm">
                  Generate a one-page summary of the product roadmap.
                </div>
              </div>

              {/* GOAL Banner */}
              <div className="pt-3 border-t border-[#27272a] space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-white text-black text-[10px] font-bold uppercase tracking-wider">
                  GOAL
                </span>
                <p className="text-[13.5px] text-[#a1a1aa] leading-relaxed">
                  Deliver a unified, intelligent workspace that connects all company knowledge and enables contextual answers in real time.
                </p>
              </div>

              {/* Phase Progress Stages */}
              <div className="space-y-3 pt-2">
                {/* Phase 1 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                  <div className="space-y-0.5">
                    <div className="text-[13px] font-semibold text-white">
                      Phase 1 — Speech Transcription (Sarvam STT)
                    </div>
                    <div className="text-[12px] text-[#71717a]">
                      Connect Google Drive, Notion, Slack and Confluence as data sources.
                    </div>
                  </div>
                  <div className="flex items-center text-white font-semibold text-[12px] shrink-0 ml-4">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-white" />
                    Completed
                  </div>
                </div>

                {/* Phase 2 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                  <div className="space-y-0.5">
                    <div className="text-[13px] font-semibold text-white">
                      Phase 2 — Hybrid Retrieval (Supabase pgvector)
                    </div>
                    <div className="text-[12px] text-[#71717a]">
                      Launch Ask AI interface with smart document linking and reference citations.
                    </div>
                  </div>
                  <div className="flex items-center text-white font-semibold text-[12px] shrink-0 ml-4">
                    <span className="w-2 h-2 rounded-full bg-white mr-2 shadow-[0_0_6px_#ffffff]" />
                    In Progress
                  </div>
                </div>

                {/* Phase 3 (Peeking / Scrollable) */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                  <div className="space-y-0.5">
                    <div className="text-[13px] font-semibold text-white">
                      Phase 3 — Contextual RAG Synthesis
                    </div>
                    <div className="text-[12px] text-[#71717a]">
                      Synthesize grounded responses across retrieved passages with low latency.
                    </div>
                  </div>
                  <div className="flex items-center text-[#71717a] font-medium text-[12px] shrink-0 ml-4">
                    Upcoming
                  </div>
                </div>

                {/* Phase 4 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#09090b] border border-[#27272a]">
                  <div className="space-y-0.5">
                    <div className="text-[13px] font-semibold text-white">
                      Phase 4 — Voice Stream Latency Optimizer
                    </div>
                    <div className="text-[12px] text-[#71717a]">
                      Optimize audio chunking & response pipeline for sub-200ms processing.
                    </div>
                  </div>
                  <div className="flex items-center text-[#71717a] font-medium text-[12px] shrink-0 ml-4">
                    Upcoming
                  </div>
                </div>
              </div>

              {/* Audio Recording Capture Notice (If recorded) */}
              {notice && (
                <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-[12px] text-white flex items-center justify-between">
                  <span>
                    🎤 Audio captured ({(notice.durationMs / 1000).toFixed(1)}s). Ready for Sarvam STT transcription in Phase 5.
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotice(null)}
                    className="text-white hover:text-white font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

            </div>

            {/* Fixed / Docked Bottom Input Bar inside Card */}
            <div className="p-4 bg-[#18181b] border-t border-[#27272a] shrink-0">
              <div className="bg-[#09090b] border border-[#27272a] rounded-2xl flex items-center px-3 py-1.5 shadow-xl min-h-[52px]">

                {/* Left Action Icons */}
                <div className="flex items-center gap-1.5 shrink-0 text-[#71717a]">
                  <button type="button" className="p-1.5 hover:text-white transition-colors" title="Mention">
                    <AtSign className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-[#27272a]" />
                  <button type="button" className="p-1.5 hover:text-white transition-colors" title="Magic Prompts">
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Input Field OR Recording Bar */}
                <div className="flex-1 min-w-0 mx-2">
                  {expanded ? (
                    <RecorderBar
                      onRecordingComplete={onRecordingComplete}
                      onError={onError}
                      onExpandChange={setExpanded}
                      maxDurationMs={30000}
                    />
                  ) : (
                    <input
                      type="text"
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      placeholder="Ask mindlink..."
                      className="w-full bg-transparent text-[13px] text-white placeholder:text-[#71717a] focus:outline-none px-2"
                    />
                  )}
                </div>

                {/* Right Mic & Send Button */}
                {!expanded && (
                  <div className="flex items-center gap-2 shrink-0">
                    {/* VoiceInput pill — expands on click, triggers the RecorderBar strip */}
                    <VoiceInput
                      onStart={() => setExpanded(true)}
                      onStop={() => setExpanded(false)}
                    />
                    <div className="w-px h-4 bg-[#27272a]" />
                    <button
                      type="button"
                      className="px-5 py-2 rounded-xl text-[13px] font-bold text-black bg-white hover:bg-[#e4e4e7] transition-all shadow-md active:scale-[0.97]"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Right Panel ("Recent conversations") ────────────────────────────── */}
      <aside className="w-[290px] bg-[#09090b] border-l border-[#27272a] flex flex-col shrink-0 overflow-y-auto custom-scrollbar">

        {/* Header */}
        <div className="p-5 border-b border-[#27272a]">
          <div className="flex items-center gap-2 text-white font-semibold text-[14px]">
            <Clock className="w-4 h-4 text-[#71717a]" />
            <h3>Recent conversations</h3>
          </div>
        </div>

        {/* Filters Dropdowns */}
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between text-[12px]">
          <span className="text-[#71717a] font-medium">Filters:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-[#f4f4f5] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <span>Docs</span>
              <ChevronDown className="w-3 h-3 text-[#71717a]" />
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-[#f4f4f5] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <span>Summaries</span>
              <ChevronDown className="w-3 h-3 text-[#71717a]" />
            </button>
          </div>
        </div>

        {/* Numbered Conversations List (SCROLLABLE CONTAINER) */}
        <div className="p-5 space-y-3 text-[12.5px] border-b border-[#27272a] max-h-[190px] overflow-y-auto custom-scrollbar pr-2">
          {recentConversations.map((item, i) => (
            <div
              key={i}
              className="text-[#a1a1aa] hover:text-white cursor-pointer truncate transition-colors leading-snug"
            >
              {i + 1}. {item}
            </div>
          ))}
        </div>

        {/* Activity & Insight Cards Stack (Black & White Monochrome) */}
        <div className="p-5 space-y-3.5">

          {/* Card 1: Mapping */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-bold">
                Mapping
              </span>
              <button type="button" className="text-[#71717a] hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="font-semibold text-[13px] text-white">
              Knowledge graph update
            </div>
            <div className="text-[11.5px] text-[#a1a1aa] leading-relaxed">
              Mapping new links between product and design teams.
            </div>
          </div>

          {/* Card 2: Analyzing */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#27272a] border border-[#3f3f46] text-white text-[10px] font-bold">
                Analyzing
              </span>
              <button type="button" className="text-[#71717a] hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="font-semibold text-[13px] text-white">
              Cross-referencing 12 documents
            </div>
            <div className="text-[11.5px] text-[#a1a1aa] leading-relaxed">
              Finding repeating insights across internal reports.
            </div>
          </div>

          {/* Card 3: Ready to review */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#09090b] border border-[#27272a] text-[#a1a1aa] text-[10px] font-bold">
                Ready to review
              </span>
              <button type="button" className="text-[#71717a] hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="font-semibold text-[13px] text-white">
              Generated insight cluster: "AI Strategy 2025"
            </div>
            <div className="text-[11.5px] text-[#a1a1aa] leading-relaxed">
              Extracted patterns and themes from R&D notes.
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}
