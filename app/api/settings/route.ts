import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser, DEMO_USER_EMAIL } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

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

export async function GET() {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const body = await req.json()

    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        fullName: typeof body.fullName === 'string' ? body.fullName : undefined,
        institution: typeof body.institution === 'string' ? body.institution : undefined,
        major: typeof body.major === 'string' ? body.major : undefined,
        bio: typeof body.bio === 'string' ? body.bio : undefined,
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
        fullName: body.fullName,
        institution: body.institution,
        major: body.major,
        bio: body.bio,
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
