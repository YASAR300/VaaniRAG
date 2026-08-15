/**
 * app/api/dev/traces/route.ts — Private Developer Traces API (Phase 11)
 * Gated by DEV_DASHBOARD_SECRET. Returns 404 on unauthorized access.
 */

import { NextResponse } from 'next/server';
import { listTraces, getTrace, PipelineTrace } from '@/lib/observability/traceStore';

function isAuthorized(request: Request): boolean {
  const secret = process.env.DEV_DASHBOARD_SECRET || 'secret_vaani_dev_2025';
  const url = new URL(request.url);
  const paramKey = url.searchParams.get('key');
  const headerKey = request.headers.get('x-dev-secret');

  return (paramKey === secret) || (headerKey === secret);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    // Return 404 Not Found to avoid confirming route existence to unauthorized probers
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const url = new URL(request.url);
    const traceId = url.searchParams.get('id');

    if (traceId) {
      const trace = await getTrace(traceId);
      if (!trace) {
        return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
      }
      return NextResponse.json(trace);
    }

    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 100;
    const since = url.searchParams.get('since') || undefined;
    const outcome = (url.searchParams.get('outcome') as PipelineTrace['outcome']) || undefined;

    const traces = await listTraces({ limit, since, outcome });
    return NextResponse.json(traces);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch traces', details: error.message }, { status: 500 });
  }
}
