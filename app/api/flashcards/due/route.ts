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
    const deckId = req.nextUrl.searchParams.get('deckId')

    // Get flashcards that are due today or earlier
    const dueCards = await prisma.flashcard.findMany({
      where: {
        userId,
        ...(deckId && { deckId }),
        nextReviewDate: {
          lte: new Date()
        }
      },
      include: {
        deck: {
          include: {
            document: true
          }
        }
      },
      orderBy: {
        nextReviewDate: 'asc'
      },
      take: 50
    })

    return NextResponse.json({ success: true, cards: dueCards })
  } catch (error) {
    console.error('Error fetching due flashcards:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch flashcards') }, { status: 500 })
  }
}
