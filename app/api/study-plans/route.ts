import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const PRIORITIES = ['low', 'medium', 'high'] as const
// Canonical vocabulary sent by the study-planner UI
// (app/app/study-planner/page.tsx CATEGORIES). Matched case-insensitively,
// stored canonicalized so display stays consistent.
const CATEGORIES = ['Exam', 'Assignment', 'Review', 'Project'] as const

function canonicalCategory(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return v as null | undefined
  if (typeof v !== 'string') return undefined
  const hit = CATEGORIES.find((c) => c.toLowerCase() === v.toLowerCase())
  return hit
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `read:${userId}`, RATE_PRESETS.read.limit, RATE_PRESETS.read.windowMs, RATE_PRESETS.read.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { searchParams } = new URL(req.url)
    const take = Math.max(1, Math.min(Number(searchParams.get('take')) || 100, 200))
    const plans = await prisma.studyPlan.findMany({
      where: { userId },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
      take,
    })

    return NextResponse.json(
      { success: true, plans },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' } }
    )
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch study plans') }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:plans:${userId}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)
    const body = await req.json()

    const { title, description, dueDate, priority = 'medium', category } = body

    if (typeof title !== 'string' || !title.trim() || title.length > 200) {
      return NextResponse.json({ error: 'Title is required (max 200 chars)' }, { status: 400 })
    }
    const due = new Date(dueDate)
    if (!dueDate || Number.isNaN(due.getTime())) {
      return NextResponse.json({ error: 'Valid due date is required' }, { status: 400 })
    }
    if (!PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority (low|medium|high)' }, { status: 400 })
    }
    const safeCategory = canonicalCategory(category)
    if (safeCategory === undefined) {
      return NextResponse.json({ error: 'Invalid category (Exam|Assignment|Review|Project)' }, { status: 400 })
    }

    const plan = await prisma.studyPlan.create({
      data: {
        userId,
        title: title.trim().slice(0, 200),
        description: typeof description === 'string' ? description.slice(0, 2000) : null,
        dueDate: due,
        priority,
        category: safeCategory,
      },
    })

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to create study plan') }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:plans:${userId}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const existing = await prisma.studyPlan.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Plan not found or forbidden' }, { status: 403 })
    }

    const data: Prisma.StudyPlanUpdateInput = {}
    if (typeof updates.title === 'string') {
      if (!updates.title.trim() || updates.title.length > 200) {
        return NextResponse.json({ error: 'Invalid title (max 200 chars)' }, { status: 400 })
      }
      data.title = updates.title.trim().slice(0, 200)
    }
    if (typeof updates.description === 'string') data.description = updates.description.slice(0, 2000)
    if (updates.dueDate) {
      const due = new Date(updates.dueDate)
      if (Number.isNaN(due.getTime())) {
        return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
      }
      data.dueDate = due
    }
    if (updates.priority) {
      if (!PRIORITIES.includes(updates.priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      data.priority = updates.priority
    }
    if ('category' in updates) {
      const safe = canonicalCategory(updates.category)
      if (safe === undefined) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      data.category = safe
    }

    if (typeof updates.completed === 'boolean') {
      data.completed = updates.completed
      data.completedAt = updates.completed ? new Date() : null
    }

    const plan = await prisma.studyPlan.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update study plan') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:plans:${userId}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const deleted = await prisma.studyPlan.deleteMany({
      where: { id, userId },
    })

    return NextResponse.json({ success: deleted.count > 0 })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete study plan') }, { status: 500 })
  }
}
