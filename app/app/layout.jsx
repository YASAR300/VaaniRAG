'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mic,
  Search,
  MessageSquarePlus,
  History,
  FileText,
  Layers,
  Database,
  Shield,
  Activity,
  ChevronDown,
  Bell,
  Star,
  Sparkles,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import { Button, StatusDot, Badge } from '@/components/ui';

export default function WorkspaceLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-accent selection:text-accent-foreground font-sans">
      {/* 1. Left Sidebar Rail */}
      <aside className="w-64 bg-surface-1 border-r border-border flex flex-col z-20 shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent to-accent-2 p-[1px] glow-accent">
              <div className="w-full h-full bg-background rounded-[7px] flex items-center justify-center">
                <Mic className="w-4 h-4 text-accent" />
              </div>
            </div>
            <span className="font-display font-bold text-base tracking-tight text-foreground">
              VaaniRAG
            </span>
          </Link>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded border border-border">
            v1.0
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-8 bg-surface-2 border border-border rounded-lg pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/60"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground bg-surface-3 px-1 py-0.2 rounded border border-border">
              ⌘K
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {/* Ask AI Section */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-2 py-1">
              <span>Ask AI</span>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="mt-1 space-y-0.5">
              <Link
                href="/app"
                className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent font-medium text-xs border border-accent/20"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-accent" />
                <span>New Voice Chat</span>
              </Link>
              <a
                href="#"
                className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 text-xs transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>Recent Transcripts</span>
              </a>
            </div>
          </div>

          {/* Core Modules Section */}
          <div className="space-y-0.5">
            <a
              href="#"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 text-xs transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Passages Corpus</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-1.5 py-0.2 rounded border border-border">
                11
              </span>
            </a>

            <a
              href="#"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 text-xs transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Chunking Engine</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-1.5 py-0.2 rounded border border-border">
                3
              </span>
            </a>

            <a
              href="#"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 text-xs transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Database className="w-3.5 h-3.5" />
                <span>Hybrid Retrieval</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                0.98
              </span>
            </a>

            <a
              href="#"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 text-xs transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Guardrail Suite</span>
              </div>
            </a>

            <a
              href="#"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 text-xs transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Telemetry Log</span>
              </div>
              <span className="text-[10px] font-mono text-accent-2 bg-accent-2/10 px-1.5 py-0.2 rounded border border-accent-2/20">
                &lt;200ms
              </span>
            </a>
          </div>
        </nav>

        {/* Bottom Promo Card */}
        <div className="p-3 border-t border-border/80">
          <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs space-y-2">
            <div className="font-semibold text-foreground">Context View</div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              See how your voice queries connect directly to MS MARCO passages.
            </p>
            <Button variant="primary" size="sm" className="w-full text-xs font-semibold">
              Launch Session
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Center & Right Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}
