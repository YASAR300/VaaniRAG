import { NextResponse } from 'next/server';
import { env } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: env.NEXT_PUBLIC_APP_NAME || 'VaaniRAG',
    environment: env.NEXT_PUBLIC_APP_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    targetLatencyBudgetMs: 200,
    services: {
      sarvam: env.SARVAM_API_KEY ? 'configured' : 'missing_key',
      supabase: env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing_url',
      llm: env.LLM_API_KEY ? 'configured' : 'missing_key',
    },
  });
}
