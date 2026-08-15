/**
 * app/api/telemetry/public/route.ts — Public Latency Telemetry Endpoint (Phase 11)
 *
 * Ungated public summary endpoint for embedding live latency badges on the user app.
 * Returns safe rolling aggregate percentiles and the most recent request duration.
 */

import { NextResponse } from 'next/server';
import { getAggregateStats, listTraces } from '@/lib/observability/traceStore';

export async function GET() {
  try {
    const stats = await getAggregateStats();
    const recentTraces = await listTraces({ limit: 1 });
    const lastTrace = recentTraces.length > 0 ? recentTraces[0] : null;

    return NextResponse.json({
      totalRequests: stats.totalRequests,
      p50PostSttMs: stats.latency.postSttMs.p50,
      p70PostSttMs: stats.latency.postSttMs.p70,
      p100PostSttMs: stats.latency.postSttMs.p100,
      recentPostSttMs: lastTrace ? lastTrace.totals.postSttMs : null,
      targetMs: 200,
      isUnderBudget: lastTrace ? lastTrace.totals.postSttMs <= 200 : true,
    });
  } catch (error: any) {
    return NextResponse.json({
      totalRequests: 0,
      p50PostSttMs: 0,
      p70PostSttMs: 0,
      p100PostSttMs: 0,
      recentPostSttMs: null,
      targetMs: 200,
      isUnderBudget: true,
    });
  }
}
