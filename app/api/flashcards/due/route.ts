import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    }).catch(() => null)
    
    const userId = session?.user?.id || 'user-dummy-001'
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
  } catch (error: any) {
    console.error('Error fetching due flashcards:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch flashcards' }, { status: 500 })
  }
}
