import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      
    const quizzes = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
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
    return NextResponse.json({ success: true, quizzes })
  } catch (error) {
    console.error('Error fetching quiz history:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch quizzes') }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0

    const newQuiz = await prisma.quizAttempt.create({
      data: {
        userId,
        documentId,
        documentTitle: documentTitle || 'Study Document',
        score,
        totalQuestions,
        accuracy,
        difficulty,
        quizType,
        weakTopics: Array.isArray(weakTopics) ? weakTopics : [],
        timeTakenSeconds,
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
