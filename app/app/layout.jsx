import Link from 'next/link';
import { Mic, Activity, Layers, Database, Shield, Zap, Settings, BarChart2 } from 'lucide-react';

export default function WorkspaceLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-dark text-slate-100 font-sans">
      {/* Left Navigation Sidebar */}
      <aside className="w-64 glass-panel border-r border-surface-border flex flex-col z-20 shrink-0">
        <div className="p-4 border-b border-surface-border flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-sky-400 p-[1px] glow-brand">
            <div className="w-full h-full bg-surface-dark rounded-[7px] flex items-center justify-center">
              <Mic className="w-4 h-4 text-brand-400" />
            </div>
          </div>
          <div>
            <h1 className="font-display font-bold text-base tracking-tight text-white">VaaniRAG</h1>
            <p className="text-[11px] text-slate-400 font-mono">MS MARCO-XI • 200ms Target</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1.5">
            Workspace
          </div>
          <Link
            href="/app"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300 font-medium text-sm transition-all"
          >
            <Mic className="w-4 h-4 text-brand-400" />
            <span>Voice Assistant</span>
          </Link>

          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1.5 mt-6">
            System Modules
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-sm cursor-not-allowed">
            <Database className="w-4 h-4" />
            <span>Chunking Strategy</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-sm cursor-not-allowed">
            <Layers className="w-4 h-4" />
            <span>Hybrid Retrieval</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-sm cursor-not-allowed">
            <Shield className="w-4 h-4" />
            <span>Guardrail Suite</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-sm cursor-not-allowed">
            <BarChart2 className="w-4 h-4" />
            <span>Latency Analytics</span>
          </div>
        </nav>

        <div className="p-3 border-t border-surface-border">
          <div className="glass-card p-3 rounded-lg border border-surface-border text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Status</span>
              <span className="flex items-center text-emerald-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Online
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              STT: Sarvam Saarika
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}
