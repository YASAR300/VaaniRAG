/**
 * app/api/dev/stats/route.ts — Private Developer Stats API (Phase 11)
 * Gated by DEV_DASHBOARD_SECRET. Returns 404 on unauthorized access.
 */

import { NextResponse } from 'next/server';
import { getAggregateStats } from '@/lib/observability/traceStore';

function isAuthorized(request: Request): boolean {
  const secret = process.env.DEV_DASHBOARD_SECRET || 'secret_vaani_dev_2025';
  const url = new URL(request.url);
  const paramKey = url.searchParams.get('key');
  const headerKey = request.headers.get('x-dev-secret');

  return (paramKey === secret) || (headerKey === secret);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const url = new URL(request.url);
    const since = url.searchParams.get('since') || undefined;

    const stats = await getAggregateStats({ since });
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to compute stats', details: error.message }, { status: 500 });
  }
}
