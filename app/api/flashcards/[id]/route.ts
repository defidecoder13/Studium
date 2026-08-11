import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function PATCH(req: NextRequest, { params }: { params: any }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    }).catch(() => null)
    
    const userId = session?.user?.id || 'user-dummy-001'

    const body = await req.json()
    const { rating } = body // 'again', 'hard', 'medium', 'easy'

    if (!rating) {
      return NextResponse.json({ error: 'rating is required' }, { status: 400 })
    }

    const resolvedParams = await Promise.resolve(params)
    const cardId = resolvedParams.id

    const card = await prisma.flashcard.findUnique({
      where: { id: cardId }
    })

    if (!card) return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 })
    if (card.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let { interval, easeFactor, repetitionCount } = card

    // SM-2 Spaced Repetition Algorithm
    if (rating === 'again') {
      repetitionCount = 0
      interval = 0 // Due immediately or same day
      easeFactor = Math.max(1.3, easeFactor - 0.25)
    } else if (rating === 'hard') {
      repetitionCount = 0
      interval = 1
      easeFactor = Math.max(1.3, easeFactor - 0.15)
    } else if (rating === 'medium') {
      interval = repetitionCount === 0 ? 1 : repetitionCount === 1 ? 3 : Math.round(interval * 1.5)
      easeFactor = Math.max(1.3, easeFactor - 0.1)
      repetitionCount += 1
    } else if (rating === 'easy') {
      interval = repetitionCount === 0 ? 1 : repetitionCount === 1 ? 4 : Math.round(interval * easeFactor)
      easeFactor = easeFactor + 0.15
      repetitionCount += 1
    }

    // Add days to current date
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + interval)

    const updatedCard = await prisma.flashcard.update({
      where: { id: cardId },
      data: {
        interval,
        easeFactor,
        repetitionCount,
        nextReviewDate
      }
    })

    return NextResponse.json({ success: true, card: updatedCard })
  } catch (error: any) {
    console.error('Error updating flashcard:', error)
    return NextResponse.json({ error: error.message || 'Failed to update flashcard' }, { status: 500 })
  }
}
