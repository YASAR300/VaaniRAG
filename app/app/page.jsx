'use client';
import React, { useState } from 'react';
import {
  Mic,
  Send,
  Bell,
  Star,
  RotateCw,
  CheckCircle2,
  Clock,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { Button, Card, Badge, StatusDot } from '@/components/ui';

export default function WorkspacePage() {
  const [activeFocus, setActiveFocus] = useState('Summarize passages');

  const focusPills = [
    'Summarize passages',
    'Extract key insights',
    'Compare retrieval',
    'Answer questions',
    'Draft response',
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-background text-foreground">
      {/* 2. Central Main Workspace Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto border-r border-border">
        {/* Header Greeting & Controls */}
        <header className="px-8 py-5 border-b border-border/60 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10">
          <div>
            <h1 className="font-display font-bold text-xl text-foreground">
              Good evening, Researcher!
            </h1>
            <p className="text-xs text-muted-foreground">
              What would you like to explore today in MS MARCO-XI?
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-xs">
              <StatusDot status="green" pulse={true} />
              <span className="font-mono text-[11px] text-emerald-400">System Ready</span>
            </div>
            <button
              type="button"
              className="p-2 rounded-lg bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
              aria-label="Favorites"
            >
              <Star className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Choose Your Focus Pill Tags */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Choose your focus
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {focusPills.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setActiveFocus(pill)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeFocus === pill
                      ? 'bg-emerald-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20'
                      : 'bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground border border-border'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Central AI Workspace Card */}
          <Card className="p-7 bg-surface-1 border-border relative space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-base text-foreground">
                Ask something about your workspace or passages.
              </h2>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Mascot Visual & User Prompt Bubble */}
            <div className="flex items-center justify-between gap-6 py-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-accent via-accent-2 to-emerald-400 p-[2px] shadow-2xl glow-accent">
                  <div className="w-full h-full bg-surface-2 rounded-[14px] flex items-center justify-center">
                    <Sparkles className="w-9 h-9 text-accent-2 animate-pulse" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-accent text-[9px] font-mono text-white font-bold">
                  वाणी
                </div>
              </div>

              <div className="flex-1 bg-surface-2 p-4 rounded-2xl border border-border text-sm text-foreground shadow-sm">
                "Generate a one-page grounded summary of MS MARCO passage context."
              </div>
            </div>

            {/* Goal Section */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Badge variant="info" className="text-[10px] uppercase font-bold">
                GOAL
              </Badge>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deliver a unified, intelligent voice workspace that connects all MS MARCO passages and enables contextual answers in real time under a 200ms processing budget.
              </p>
            </div>

            {/* Pipeline Progress Stages */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-surface-2 border border-border">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">Phase 1 — Speech Transcription (Sarvam STT)</div>
                  <div className="text-[11px] text-muted-foreground">Audio stream captured and transcribed in real time.</div>
                </div>
                <div className="flex items-center text-emerald-400 font-semibold text-xs shrink-0">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Completed
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-surface-2 border border-border">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">Phase 2 — Hybrid Retrieval (Supabase pgvector)</div>
                  <div className="text-[11px] text-muted-foreground">Dense cosine similarity + BM25 sparse keyword ranking active.</div>
                </div>
                <div className="flex items-center text-amber-400 font-semibold text-xs shrink-0">
                  <StatusDot status="amber" pulse={true} className="mr-2" />
                  In Progress
                </div>
              </div>
            </div>

            {/* Floating Bottom Input Capsule */}
            <div className="pt-4">
              <div className="bg-surface-2 p-2 rounded-2xl border border-border flex items-center space-x-3 shadow-xl">
                <button type="button" className="p-2 rounded-xl text-muted-foreground hover:text-foreground">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  placeholder="Ask VaaniRAG..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  className="p-2 rounded-xl bg-accent-2/10 text-accent-2 border border-accent-2/20 hover:bg-accent-2/20 transition-colors"
                  title="Record Voice Input"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <Button variant="primary" size="md" className="rounded-xl px-5">
                  Send
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* 3. Right Activity & Context Panel */}
      <aside className="w-80 bg-surface-1 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-accent" />
            <h3 className="font-display font-bold text-sm text-foreground">
              Recent conversations
            </h3>
          </div>
        </div>

        {/* Filters Dropdown */}
        <div className="p-4 border-b border-border/60 flex items-center space-x-2 text-xs">
          <span className="text-muted-foreground">Filters:</span>
          <button type="button" className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-foreground flex items-center space-x-1">
            <span>Docs</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          <button type="button" className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-foreground flex items-center space-x-1">
            <span>Summaries</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {/* Recent Items List */}
        <div className="p-4 space-y-3 text-xs text-muted-foreground border-b border-border/60">
          <div className="hover:text-foreground cursor-pointer truncate">1. Summary: Product launch notes</div>
          <div className="hover:text-foreground cursor-pointer truncate">2. Comparison: Aurora vs Nebula</div>
          <div className="hover:text-foreground cursor-pointer truncate">3. Extracted 5 insights from HR feedback</div>
          <div className="hover:text-foreground cursor-pointer truncate">4. Q4 Strategy deck — summarized into 3 key themes</div>
          <div className="hover:text-foreground cursor-pointer truncate">5. Security policy mentions across internal docs</div>
          <div className="hover:text-foreground cursor-pointer truncate">6. Generated report: AI adoption trends 2026</div>
          <div className="hover:text-foreground cursor-pointer truncate">7. Meeting recap: Marketing sync — Oct 10</div>
        </div>

        {/* Activity & Insight Cluster Cards */}
        <div className="p-4 space-y-3">
          <Card className="p-3.5 bg-surface-2/80 border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <Badge variant="info" className="text-[10px]">
                Mapping
              </Badge>
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="font-semibold text-foreground">Knowledge graph update</div>
            <div className="text-[11px] text-muted-foreground">Mapping new links between MS MARCO passages and design teams.</div>
          </Card>

          <Card className="p-3.5 bg-surface-2/80 border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <Badge variant="success" className="text-[10px]">
                Analyzing
              </Badge>
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="font-semibold text-foreground">Cross-referencing 12 documents</div>
            <div className="text-[11px] text-muted-foreground">Finding repeating insights across internal reports.</div>
          </Card>

          <Card className="p-3.5 bg-surface-2/80 border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <Badge variant="warning" className="text-[10px]">
                Ready to review
              </Badge>
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="font-semibold text-foreground">Generated Insight cluster: "AI Strategy 2026"</div>
            <div className="text-[11px] text-muted-foreground">Extracted patterns and themes from R&D notes.</div>
          </Card>
        </div>
      </aside>
    </div>
  );
}
