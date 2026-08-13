import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "vaanirag",
    phase: 1,
    checks: {
      sarvam: "not_configured",
      supabase: "not_configured",
      llm: "not_configured",
    },
    timestamp: new Date().toISOString(),
  });
}
