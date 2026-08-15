'use client';

/**
 * components/app/LatencyBadge.jsx — Public Live Latency Indicator (Phase 11)
 *
 * Displays honest, real-time post-STT latency (Retrieval + Generation ≤ 200ms).
 * Functional color coding:
 *   - Emerald Green (#10b981) for ≤ 200ms (Target Met)
 *   - Sindoor Rose  (#f43f5e) for > 200ms (Budget Exceeded)
 */

import React, { useState, useEffect } from 'react';
import { Zap, Activity, Info } from 'lucide-react';

export default function LatencyBadge({ currentLatencyMs, className = '' }) {
  const [telemetry, setTelemetry] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchTelemetry() {
      try {
        const res = await fetch('/api/telemetry/public');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setTelemetry(data);
        }
      } catch {}
    }

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const displayMs = currentLatencyMs !== undefined && currentLatencyMs !== null
    ? currentLatencyMs
    : telemetry?.recentPostSttMs ?? telemetry?.p50PostSttMs ?? null;

  const isUnderBudget = displayMs !== null ? displayMs <= 200 : true;

  if (displayMs === null && !telemetry) {
    return null;
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setShowDetails(prev => !prev)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all duration-150 ${
          isUnderBudget
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
            : 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
        }`}
        title="Post-STT Latency (Click for telemetry details)"
      >
        <Zap className={`w-3 h-3 ${isUnderBudget ? 'text-emerald-400' : 'text-rose-400'}`} />
        <span>
          Retrieval + Answer: <strong className="font-bold">{displayMs !== null ? `${Math.round(displayMs)}ms` : '—'}</strong>
        </span>
        <span className={`w-1.5 h-1.5 rounded-full ${isUnderBudget ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
      </button>

      {/* Expanded Telemetry Popover */}
      {showDetails && (
        <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-64 bg-[#18181b] border border-[#27272a] rounded-xl p-3 shadow-2xl z-50 text-[11px] text-[#a1a1aa] space-y-2 font-mono">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-1.5">
            <span className="font-semibold text-white flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-white" />
              Latency Telemetry
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
              isUnderBudget ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
            }`}>
              {isUnderBudget ? '≤ 200ms PASS' : '> 200ms OVER'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Target Budget:</span>
              <span className="text-white font-medium">≤ 200ms (Post-STT)</span>
            </div>
            <div className="flex justify-between">
              <span>Current Query:</span>
              <span className="text-white font-medium">{displayMs !== null ? `${displayMs}ms` : '—'}</span>
            </div>
            {telemetry && (
              <>
                <div className="flex justify-between">
                  <span>Rolling P50:</span>
                  <span className="text-white">{telemetry.p50PostSttMs}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Rolling P70:</span>
                  <span className="text-white">{telemetry.p70PostSttMs}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Queries:</span>
                  <span className="text-white">{telemetry.totalRequests}</span>
                </div>
              </>
            )}
          </div>

          <p className="text-[10px] text-[#71717a] pt-1 border-t border-[#27272a] leading-tight">
            * STT speech recognition is excluded from the 200ms window per hackathon evaluation guidelines.
          </p>
        </div>
      )}
    </div>
  );
}
