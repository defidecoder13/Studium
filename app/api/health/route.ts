import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * Public liveness + dependency check for uptime monitors.
 * Returns 200 when DB reachable and required env present,
 * 503 otherwise. Never leaks secret values.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'missing' | 'error'> = {
    database: 'ok',
    env_database_url: process.env.DATABASE_URL ? 'ok' : 'missing',
    env_gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'ok' : 'missing',
    env_r2: process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY ? 'ok' : 'missing',
  }

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (e) {
    console.error('[health] DB check failed:', e)
    checks.database = 'error'
  }

  const degraded = Object.values(checks).some((v) => v !== 'ok')
  return NextResponse.json(
    { status: degraded ? 'degraded' : 'ok', checks, time: new Date().toISOString() },
    { status: degraded ? 503 : 200 }
  )
}
