import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser, DEMO_USER_EMAIL } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const THEMES = ['light', 'dark', 'system'] as const
const SUMMARY_MODES = ['quick', 'detailed'] as const
// Canonical vocabulary sent by the settings UI
// (app/app/settings/page.tsx citationStrictness select).
const CITATIONS = ['exact', 'flexible'] as const

function cleanStr(v: unknown, max: number): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined
}

const DEFAULT_SETTINGS = {
  fullName: 'Alex Rivera',
  email: 'alex.rivera@stanford.edu',
  institution: 'Stanford University',
  major: 'Quantum Physics & Computer Science',
  bio: 'PhD candidate studying quantum error correction across topological surface codes.',
  twoFactor: true,
  notifyQuizReminders: true,
  notifyDailySummary: true,
  notifyIndexingDone: true,
  themePreference: 'dark' as const,
  defaultSummaryMode: 'quick' as const,
  citationStrictness: 'exact' as const,
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `read:${user.id}`, RATE_PRESETS.read.limit, RATE_PRESETS.read.windowMs, RATE_PRESETS.read.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const record = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    const settings = {
      fullName: record?.fullName || user.name || DEFAULT_SETTINGS.fullName,
      email: user.email || DEFAULT_SETTINGS.email,
      institution: record?.institution || DEFAULT_SETTINGS.institution,
      major: record?.major || DEFAULT_SETTINGS.major,
      bio: record?.bio || DEFAULT_SETTINGS.bio,
      twoFactor: record?.twoFactor ?? DEFAULT_SETTINGS.twoFactor,
      notifyQuizReminders: record?.notifyQuizReminders ?? DEFAULT_SETTINGS.notifyQuizReminders,
      notifyDailySummary: record?.notifyDailySummary ?? DEFAULT_SETTINGS.notifyDailySummary,
      notifyIndexingDone: record?.notifyIndexingDone ?? DEFAULT_SETTINGS.notifyIndexingDone,
      themePreference: record?.themePreference || DEFAULT_SETTINGS.themePreference,
      defaultSummaryMode: record?.defaultSummaryMode || DEFAULT_SETTINGS.defaultSummaryMode,
      citationStrictness: record?.citationStrictness || DEFAULT_SETTINGS.citationStrictness,
      updatedAt: record?.updatedAt?.toISOString() || new Date().toISOString(),
    }

    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:settings:${user.id}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const body = await req.json()

    if (body.themePreference !== undefined && !(THEMES as readonly string[]).includes(body.themePreference)) {
      return NextResponse.json({ error: 'Invalid themePreference' }, { status: 400 })
    }
    if (body.defaultSummaryMode !== undefined && !(SUMMARY_MODES as readonly string[]).includes(body.defaultSummaryMode)) {
      return NextResponse.json({ error: 'Invalid defaultSummaryMode' }, { status: 400 })
    }
    if (body.citationStrictness !== undefined && !(CITATIONS as readonly string[]).includes(body.citationStrictness)) {
      return NextResponse.json({ error: 'Invalid citationStrictness' }, { status: 400 })
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        fullName: cleanStr(body.fullName, 120),
        institution: cleanStr(body.institution, 160),
        major: cleanStr(body.major, 160),
        bio: cleanStr(body.bio, 2000),
        twoFactor: typeof body.twoFactor === 'boolean' ? body.twoFactor : undefined,
        notifyQuizReminders: typeof body.notifyQuizReminders === 'boolean' ? body.notifyQuizReminders : undefined,
        notifyDailySummary: typeof body.notifyDailySummary === 'boolean' ? body.notifyDailySummary : undefined,
        notifyIndexingDone: typeof body.notifyIndexingDone === 'boolean' ? body.notifyIndexingDone : undefined,
        themePreference: typeof body.themePreference === 'string' ? body.themePreference : undefined,
        defaultSummaryMode: typeof body.defaultSummaryMode === 'string' ? body.defaultSummaryMode : undefined,
        citationStrictness: typeof body.citationStrictness === 'string' ? body.citationStrictness : undefined,
      },
      create: {
        userId: user.id,
        fullName: cleanStr(body.fullName, 120),
        institution: cleanStr(body.institution, 160),
        major: cleanStr(body.major, 160),
        bio: cleanStr(body.bio, 2000),
        twoFactor: body.twoFactor,
        notifyQuizReminders: body.notifyQuizReminders,
        notifyDailySummary: body.notifyDailySummary,
        notifyIndexingDone: body.notifyIndexingDone,
        themePreference: body.themePreference,
        defaultSummaryMode: body.defaultSummaryMode,
        citationStrictness: body.citationStrictness,
      },
    })

    return NextResponse.json({
      success: true,
      settings: { ...updated, email: user.email || DEMO_USER_EMAIL },
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
