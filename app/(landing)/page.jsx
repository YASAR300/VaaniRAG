import Link from 'next/link';
import { Mic, Zap, Database, ShieldCheck, ArrowRight, Activity, Cpu, Layers } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-dark text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 p-[1px] glow-brand">
              <div className="w-full h-full bg-surface-dark rounded-[11px] flex items-center justify-center">
                <Mic className="w-5 h-5 text-brand-400 animate-pulse" />
              </div>
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
                VaaniRAG
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-400 bg-brand-950/80 border border-brand-800/60 rounded-full">
                वाणी v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/app"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 hover:bg-brand-400 text-surface-dark font-semibold transition-all duration-200 shadow-lg shadow-brand-500/20 hover:shadow-brand-400/30"
            >
              Launch Workspace
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-brand-600/20 via-sky-500/15 to-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full glass-card border border-brand-500/30 text-brand-300 text-xs font-mono mb-8">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              <span>Target Latency Budget ≤ 200ms End-to-End</span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
              Speak in your Voice.{' '}
              <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                Grounded Answers
              </span>{' '}
              in &lt; 200ms.
            </h1>

            <p className="max-w-2xl mx-auto text-lg text-slate-300 mb-10 font-normal leading-relaxed">
              Built on <strong className="text-white">MS MARCO-XI</strong> (Indian language augmented passage dataset),
              powered by <strong className="text-brand-300">Sarvam AI Speech-to-Text</strong>, and backed by
              Supabase pgvector hybrid search with real-time latency tracing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-surface-dark transition-all duration-200 glow-brand shadow-xl"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Session
              </Link>
              <a
                href="#architecture"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-xl glass-card hover:bg-slate-800/80 text-slate-200 border border-slate-700/80 transition-all duration-200"
              >
                Explore Pipeline
              </a>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="architecture" className="py-16 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-surface-border hover:border-brand-500/30 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">Sarvam AI Voice STT</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sub-second Indian accent & language audio transcription using Sarvam AI Saarika STT model.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-surface-border hover:border-brand-500/30 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">Hybrid Vector Search</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Supabase pgvector dense embedding search combined with sparse BM25 keyword matching for MS MARCO passages.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-surface-border hover:border-brand-500/30 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">Guarded Answer Harness</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Zero hallucination guardrails with explicit passage citation enforcement and low-confidence refusal gates.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-surface-border py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 VaaniRAG — Indian-Context Voice RAG System.</p>
          <div className="flex items-center space-x-6 text-slate-400">
            <span>MS MARCO-XI</span>
            <span>•</span>
            <span>Sarvam AI</span>
            <span>•</span>
            <span>Supabase pgvector</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
