import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers()).catch(() => null)
    const userId = user?.id || 'user-dummy-001'
      
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
  } catch (error: any) {
    console.error('Error fetching quiz history:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch quizzes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers()).catch(() => null)
    const userId = user?.id || 'user-dummy-001'

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
  } catch (error: any) {
    console.error('Error saving quiz attempt:', error)
    return NextResponse.json({ error: error.message || 'Failed to save quiz attempt' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers()).catch(() => null)
    const userId = user?.id || 'user-dummy-001'

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
  } catch (error: any) {
    console.error('Error deleting quiz attempt:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete attempt' }, { status: 500 })
  }
}
