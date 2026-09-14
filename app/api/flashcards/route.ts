import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decks = await prisma.flashcardDeck.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            fileType: true,
            folder: true,
            fileUrl: true
          }
        },
        cards: {
          orderBy: {
            nextReviewDate: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const now = new Date()
    let totalCards = 0
    let dueCardsCount = 0

    decks.forEach(deck => {
      totalCards += deck.cards.length
      deck.cards.forEach(card => {
        if (new Date(card.nextReviewDate) <= now) {
          dueCardsCount += 1
        }
      })
    })

    return NextResponse.json({
      success: true,
      decks,
      stats: {
        totalDecks: decks.length,
        totalCards,
        dueCardsCount
      }
    })
  } catch (error) {
    console.error('Error fetching flashcard decks:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch flashcard decks') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const deckId = req.nextUrl.searchParams.get('deckId')
    const cardId = req.nextUrl.searchParams.get('cardId')

    if (deckId) {
      const deck = await prisma.flashcardDeck.findUnique({ where: { id: deckId } })
      if (!deck || deck.userId !== userId) {
        return NextResponse.json({ error: 'Deck not found or forbidden' }, { status: 403 })
      }
      await prisma.flashcardDeck.delete({ where: { id: deckId } })
      return NextResponse.json({ success: true, message: 'Deck deleted' })
    }

    if (cardId) {
      const card = await prisma.flashcard.findUnique({ where: { id: cardId } })
      if (!card || card.userId !== userId) {
        return NextResponse.json({ error: 'Card not found or forbidden' }, { status: 403 })
      }
      await prisma.flashcard.delete({ where: { id: cardId } })
      return NextResponse.json({ success: true, message: 'Card deleted' })
    }

    return NextResponse.json({ error: 'Provide deckId or cardId' }, { status: 400 })
  } catch (error) {
    console.error('Error deleting flashcard resource:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete') }, { status: 500 })
  }
}
