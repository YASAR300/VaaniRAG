import { Mic, Activity, Clock, Database, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function WorkspacePage() {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Central Panel: Voice Input & Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface-dark overflow-y-auto">
        {/* Workspace Header */}
        <header className="h-14 border-b border-surface-border px-6 flex items-center justify-between glass-panel sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <h2 className="font-display font-semibold text-sm text-white">Voice & Question Workspace</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/30">
              MS MARCO-XI Dataset Active
            </span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-slate-400 font-mono">
            <span>Budget: &lt;200ms</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span className="text-emerald-400">P50: --ms</span>
          </div>
        </header>

        {/* Conversation / Main Output Stream */}
        <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">
          {/* Welcome Card / Empty State */}
          <div className="glass-card p-8 rounded-2xl border border-surface-border text-center my-8">
            <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto mb-4 glow-brand">
              <Mic className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">Ready to Transcribe & Answer</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Click the microphone button below to record your query in Hindi or Indian English. Transcripts will be synthesized and retrieved from MS MARCO passages in under 200ms.
            </p>

            <div className="flex items-center justify-center space-x-3 text-xs text-slate-400 font-mono">
              <span className="px-3 py-1.5 rounded-lg bg-surface-dark border border-surface-border">
                Sarvam STT Saarika
              </span>
              <span>+</span>
              <span className="px-3 py-1.5 rounded-lg bg-surface-dark border border-surface-border">
                Supabase pgvector
              </span>
              <span>+</span>
              <span className="px-3 py-1.5 rounded-lg bg-surface-dark border border-surface-border">
                Guarded LLM
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Recording Control Bar */}
        <div className="p-4 border-t border-surface-border glass-panel sticky bottom-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center space-x-4">
            <button
              type="button"
              className="w-12 h-12 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-dark flex items-center justify-center shadow-lg shadow-brand-500/25 transition-all duration-200 shrink-0 font-bold"
              title="Click to Record Voice Query"
            >
              <Mic className="w-6 h-6" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Or type a question (e.g., 'What is the eligibility for PM Kisan scheme?')..."
                className="w-full h-12 bg-surface-panel border border-surface-border rounded-xl px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/40"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Right Panel: Pipeline Latency & Activity Telemetry */}
      <aside className="w-80 glass-panel border-l border-surface-border flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-brand-400" />
            <h3 className="font-display font-semibold text-xs text-slate-200 uppercase tracking-wider">
              Pipeline Telemetry
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
            Harness Traced
          </span>
        </div>

        <div className="p-4 space-y-4 text-xs font-mono">
          {/* Latency Stages Breakdown Box */}
          <div className="glass-card p-3 rounded-xl border border-surface-border">
            <div className="text-slate-400 font-semibold mb-3 flex items-center justify-between">
              <span>Latency Stages</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-surface-dark/80 border border-surface-border">
                <span className="text-slate-400">1. STT Transcribe</span>
                <span className="text-slate-400">-- ms</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-dark/80 border border-surface-border">
                <span className="text-slate-400">2. Guardrail Gate</span>
                <span className="text-slate-400">-- ms</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-dark/80 border border-surface-border">
                <span className="text-slate-400">3. Hybrid Retrieval</span>
                <span className="text-slate-400">-- ms</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-dark/80 border border-surface-border">
                <span className="text-slate-400">4. Answer Generation</span>
                <span className="text-slate-400">-- ms</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-dark/80 border border-surface-border">
                <span className="text-slate-400">5. Grounding Check</span>
                <span className="text-slate-400">-- ms</span>
              </div>
            </div>
          </div>

          {/* Verification Metrics Box */}
          <div className="glass-card p-3 rounded-xl border border-surface-border space-y-2">
            <div className="text-slate-400 font-semibold mb-2">Harness Status</div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Retrieval Strategy</span>
              <span className="text-brand-300">Dense + BM25</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Grounding Gate</span>
              <span className="text-emerald-400 flex items-center">
                <ShieldCheck className="w-3 h-3 mr-1" /> Strict
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
