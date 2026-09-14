import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const plans = await prisma.studyPlan.findMany({
      where: { userId },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
    })

    return NextResponse.json({ success: true, plans })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch study plans') }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    const { title, description, dueDate, priority = 'medium', category } = body

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Title and due date are required' }, { status: 400 })
    }

    const plan = await prisma.studyPlan.create({
      data: {
        userId,
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        priority,
        category: category || null,
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
    if (typeof updates.title === 'string') data.title = updates.title
    if (typeof updates.description === 'string') data.description = updates.description
    if (updates.dueDate) data.dueDate = new Date(updates.dueDate)
    if (updates.priority) data.priority = updates.priority
    if (typeof updates.category === 'string' || updates.category === null) data.category = updates.category

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
