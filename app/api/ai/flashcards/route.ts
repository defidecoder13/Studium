import { NextRequest, NextResponse } from 'next/server'
import { getGeminiClient, GEMINI_MODEL } from '@/lib/ai'
import { getStoredDocumentById } from '@/lib/documents-store'
import prisma from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = checkRateLimit(`ai:${userId}`, 20, 60_000)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const body = await req.json()
    const { documentId, currentPage = 1, documentTitle = 'Academic Textbook', count = 5, fileType } = body
    const isVideo = fileType === 'YouTube Video'

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    const storedDoc = await getStoredDocumentById(documentId, userId)
    
    let contextText = ''
    if (storedDoc && storedDoc.pages && storedDoc.pages.length > 0) {
      const page = storedDoc.pages.find((p) => p.pageNumber === currentPage) || storedDoc.pages[0]
      contextText = isVideo
        ? `--- [Video Segment ${(page.pageNumber - 1) * 3}:00 to ${page.pageNumber * 3}:00] ---\n${page.text}`
        : `--- [Page ${page.pageNumber}] ---\n${page.text}`
    } else {
      contextText = isVideo
        ? `--- [Video Segment ${(currentPage - 1) * 3}:00 to ${currentPage * 3}:00] ---\nDocument Title: ${documentTitle}\nThis is placeholder video segment text.`
        : `--- [Page ${currentPage}] ---\nDocument Title: ${documentTitle}\nThis is a placeholder page content because no text was found in the document store.`
    }

    const prompt = isVideo
      ? `You are an expert academic tutor. Extract exactly ${count} key concepts from the following educational video transcript segment (${(currentPage - 1) * 3}:00 to ${currentPage * 3}:00) and convert them into Anki-style Spaced Repetition flashcards.

${contextText}

OUTPUT RULES:
1. You must output ONLY valid, parseable JSON as a raw array without markdown code fences (\`\`\`json) or conversational preamble.
2. The concepts must be central to understanding what was taught in this exact video segment.

Each object in the array must strictly follow this exact interface:
{
  "front": string; // The term, concept, or question taught in this video segment
  "back": string; // The clear definition, explanation, or answer
}
`
      : `You are an expert academic tutor. Extract exactly ${count} key concepts from the following textbook page and convert them into Anki-style Spaced Repetition flashcards.

${contextText}

OUTPUT RULES:
1. You must output ONLY valid, parseable JSON as a raw array without markdown code fences (\`\`\`json) or conversational preamble.
2. The concepts must be central to understanding the page.

Each object in the array must strictly follow this exact interface:
{
  "front": string; // The term, concept, or question (e.g. "What is the mitochondria?")
  "back": string; // The definition, explanation, or answer
}
`

    const ai = getGeminiClient()
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    })

    const rawText = response.text || '[]'
    let cards: Array<{ front: string; back: string }> = []
    try {
      const startIdx = rawText.indexOf('[')
      const endIdx = rawText.lastIndexOf(']')
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = rawText.substring(startIdx, endIdx + 1)
        cards = JSON.parse(jsonStr)
      } else {
        cards = JSON.parse(rawText)
      }
    } catch {
      console.error('Failed to parse AI response:', rawText)
      return NextResponse.json({ error: 'AI returned invalid formatting. Please try again.' }, { status: 500 })
    }

    // Save to Database
    let deck = await prisma.flashcardDeck.findFirst({
      where: { userId, documentId }
    })

    if (!deck) {
      deck = await prisma.flashcardDeck.create({
        data: {
          userId,
          documentId,
          name: documentTitle
        }
      })
    }

    const savedCards = await prisma.$transaction(
      cards.map((c) => 
        prisma.flashcard.create({
          data: {
            userId,
            deckId: deck.id,
            front: c.front,
            back: c.back,
            pageRef: currentPage,
            nextReviewDate: new Date(),
            interval: 0,
            easeFactor: 2.5,
            repetitionCount: 0
          }
        })
      )
    )

    return NextResponse.json({ success: true, count: savedCards.length, deckId: deck.id })
  } catch (error) {
    console.error('Error generating flashcards:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to generate flashcards') }, { status: 500 })
  }
}
