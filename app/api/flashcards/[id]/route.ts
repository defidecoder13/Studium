import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Generous: review sessions legitimately fire one PATCH per card.
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:review:${userId}`, 120, 60_000, 200)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const body = await req.json()
    const { rating } = body // 'again', 'hard', 'medium', 'easy'

    const VALID_RATINGS = ['again', 'hard', 'medium', 'easy']
    if (!rating || !VALID_RATINGS.includes(rating)) {
      return NextResponse.json({ error: 'rating must be one of: again, hard, medium, easy' }, { status: 400 })
    }

    const { id: cardId } = await params

    const card = await prisma.flashcard.findUnique({
      where: { id: cardId }
    })

    if (!card) return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 })
    if (card.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let { interval, easeFactor, repetitionCount } = card

    // Canonical SM-2 spaced repetition algorithm (Anki-compatible).
    // Intervals grow 1 → 6 → I×EF for "good", and the ease factor adapts
    // ±0.15 per review — it is what drives long-term interval growth.
    const MIN_EASE = 1.3
    const EASY_BONUS = 1.3

    if (rating === 'again') {
      // Failed: restart the learning sequence; ease drops 0.20 (floor 1.3).
      repetitionCount = 0
      interval = 1
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.2)
    } else if (rating === 'hard') {
      // Passed but struggled: 1.2× interval, ease drops 0.15.
      // Hard is still a successful review, so repetition is NOT reset.
      interval = Math.max(1, Math.round(interval * 1.2))
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.15)
    } else if (rating === 'medium') {
      // Classic SM-2 "good": 1 day → 6 days → I × EF. Ease unchanged.
      interval = repetitionCount === 0 ? 1 : repetitionCount === 1 ? 6 : Math.round(interval * easeFactor)
      repetitionCount += 1
    } else if (rating === 'easy') {
      // Fast progression: 4 → 7 → I × EF × easy bonus. Ease rises 0.15.
      interval = repetitionCount === 0 ? 4 : repetitionCount === 1 ? 7 : Math.round(interval * easeFactor * EASY_BONUS)
      easeFactor = Math.min(3, easeFactor + 0.15) // Anki caps ease at 3.0
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
  } catch (error) {
    console.error('Error updating flashcard:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update flashcard') }, { status: 500 })
  }
}
