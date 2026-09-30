import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `read:${userId}`, RATE_PRESETS.read.limit, RATE_PRESETS.read.windowMs, RATE_PRESETS.read.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { searchParams } = new URL(req.url)
    const take = Math.max(1, Math.min(Number(searchParams.get('take')) || 50, 100))
    const quizzes = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take,
      include: {
        document: {
          select: {
            title: true,
            fileType: true,
            folder: true
          }
        }
      }
    })
    return NextResponse.json(
      { success: true, quizzes },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' } }
    )
  } catch (error) {
    console.error('Error fetching quiz history:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch quizzes') }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:quiz:${userId}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const body = await req.json()
    const {
      documentId,
      documentTitle,
      score,
      totalQuestions,
      difficulty = 'Medium',
      quizType = 'MCQ',
      timeTakenSeconds = 0,
      weakTopics = [],
    } = body

    if (!documentId || typeof score !== 'number' || typeof totalQuestions !== 'number') {
      return NextResponse.json(
        { error: 'Missing documentId, score, or totalQuestions' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(score) || !Number.isInteger(totalQuestions) || score < 0 || totalQuestions < 1 || totalQuestions > 100 || score > totalQuestions) {
      return NextResponse.json({ error: 'Invalid score/totalQuestions' }, { status: 400 })
    }
    const safeDifficulty = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium'
    const safeQuizType = quizType === 'True/False' ? 'True/False' : 'MCQ'
    const safeTime = Math.max(0, Math.min(Number(timeTakenSeconds) || 0, 86400))
    const safeWeakTopics = Array.isArray(weakTopics) ? weakTopics.map((t) => String(t).slice(0, 120)).slice(0, 20) : []

    // Ownership check: never attach attempts to another user's document.
    const owned = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0

    const newQuiz = await prisma.quizAttempt.create({
      data: {
        userId,
        documentId,
        documentTitle: String(documentTitle || 'Study Document').slice(0, 200),
        score,
        totalQuestions,
        accuracy,
        difficulty: safeDifficulty,
        quizType: safeQuizType,
        weakTopics: safeWeakTopics,
        timeTakenSeconds: safeTime,
      }
    })

    return NextResponse.json({ success: true, quiz: newQuiz })
  } catch (error) {
    console.error('Error saving quiz attempt:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to save quiz attempt') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:quiz:${userId}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing quiz attempt id' }, { status: 400 })
    }

    const quiz = await prisma.quizAttempt.findUnique({ where: { id } })
    if (!quiz || quiz.userId !== userId) {
      return NextResponse.json({ error: 'Quiz not found or forbidden' }, { status: 403 })
    }

    await prisma.quizAttempt.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Quiz attempt deleted' })
  } catch (error) {
    console.error('Error deleting quiz attempt:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete attempt') }, { status: 500 })
  }
}
