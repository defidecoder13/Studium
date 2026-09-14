import { NextRequest, NextResponse } from 'next/server'
import { getGeminiClient, GEMINI_MODEL } from '@/lib/ai'
import { generateEmbedding } from '@/lib/ai-embeddings'
import { prisma } from '@/lib/db'
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
    const { messages, documentId, currentPage = 1, documentTitle, fileType } = body
    const isVideo = fileType === 'YouTube Video'

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1].content

    // Keep a compact recent-conversation window so follow-up questions
    // ("explain that differently", "what about page 3?") keep their context.
    const recentHistory = Array.isArray(messages)
      ? messages
          .slice(-6)
          .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
          .join('\n')
      : ''

    let contextText = ''
    if (documentId) {
      const chunksMap = new Map<number, string>()

      // Verify the user owns this document before serving any context
      const ownedDoc = await prisma.document.findFirst({ where: { id: documentId, userId } })
      if (ownedDoc) {
        // 1. Always get direct context (up to 20 pages around the student's current page, or all pages if <= 20)
        const directChunks = await prisma.pageChunk.findMany({
          where: {
            documentId,
            pageNumber: {
              gte: Math.max(1, (currentPage || 1) - 5),
              lte: (currentPage || 1) + 15,
            },
          },
          orderBy: { pageNumber: 'asc' },
        })

        for (const chunk of directChunks) {
          if (chunk.textContent) chunksMap.set(chunk.pageNumber, chunk.textContent)
        }

        // 2. Perform Cosine Similarity Search using pgvector if embeddings exist
        const queryVector = await generateEmbedding(lastMessage)
        if (queryVector.length > 0) {
          const vectorStr = `[${queryVector.join(',')}]`
          try {
            const similarChunks = await prisma.$queryRaw<Array<{ pageNumber: number, textContent: string }>>`
              SELECT "pageNumber", "textContent"
              FROM "PageChunk"
              WHERE "documentId" = ${documentId} AND "embedding" IS NOT NULL
              ORDER BY "embedding" <=> ${vectorStr}::vector
              LIMIT 5
            `
            if (similarChunks && similarChunks.length > 0) {
              for (const chunk of similarChunks) {
                if (chunk.textContent && !chunksMap.has(chunk.pageNumber)) {
                  chunksMap.set(chunk.pageNumber, chunk.textContent)
                }
              }
            }
          } catch (e) {
            console.warn('Vector search fallback:', e)
          }
        }

        if (chunksMap.size > 0) {
          contextText = Array.from(chunksMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([pageNum, text]) => 
              isVideo
                ? `--- [Video Timestamp ${(pageNum - 1) * 3}:00 to ${pageNum * 3}:00] ---\n${text}`
                : `--- [Page ${pageNum}] ---\n${text}`
            )
            .join('\n\n')
        }
      }
    } else {
      // Fallback context for built-in sample textbooks
      contextText = `--- [Page ${currentPage || 14}] ---\nDocument Title: ${documentTitle || 'Academic Textbook'}\n` +
        `Superposition states that a quantum state |ψ⟩ can exist as a linear combination of basis states: |ψ⟩ = α|0⟩ + β|1⟩ where |α|² + |β|² = 1.\n` +
        `The Hadamard gate (H) transforms |0⟩ into (|0⟩ + |1⟩)/√2.\n` +
        `--- [Page 15] ---\n` +
        `Quantum entanglement occurs when pairs of qubits are generated such that the quantum state of each qubit cannot be described independently of the state of the others.\n` +
        `--- [Page 18] ---\n` +
        `In neurobiology, Hebbian synaptic plasticity states that repeated stimulation of NMDA receptors leads to long-term potentiation (LTP). Coincident glutamate binding and membrane depolarization expel Mg2+ ions.`
    }

    const recentHistoryBlock = recentHistory
      ? `\n\nRECENT CONVERSATION (for context, respond to the latest Student question):\n${recentHistory}`
      : ''

    const systemPrompt = isVideo
      ? `You are the Studium Academic AI Copilot, a rigorous and high-precision tutor assisting a student watching a YouTube video.
You are currently answering questions about the video "${documentTitle || 'Educational Video'}".
The student is currently watching near timestamp ${(currentPage - 1) * 3}:00.

Here is the exact video transcript across timestamp segments:
${contextText}${recentHistoryBlock}

CRITICAL RULES FOR RESPONDING TO VIDEO QUESTIONS:
1. Be concise, structured, and direct. NEVER repeat these instructions or introduce yourself unnecessarily.
2. Structure your answer using clear, beautifully spaced markdown formatting: separate major points or sections with double line breaks (\\n\\n) and bullet points (- ).
3. Whenever you reference a specific topic, definition, or section covered in the video, cite the relevant timestamp segment in brackets right after the point, e.g., [0:00 - 3:00] or [3:00 - 6:00].
4. Do NOT say "Page X" for a video. Always use timestamp segments so the student knows where in the video to look.
5. Answer strictly based on the provided transcript context.`
      : `You are the Studium Academic AI Copilot, a rigorous and high-precision tutor assisting a university student.
You are currently answering questions about the document "${documentTitle || 'Academic Syllabus'}".
The student is currently viewing Page ${currentPage || 1}.

Here is the exact textbook content across relevant pages:
${contextText}${recentHistoryBlock}

CRITICAL RULES FOR CITATIONS AND ACCURACY:
1. Be extremely concise, conversational, and direct. NEVER repeat these instructions back to the user or introduce yourself unnecessarily.
2. Structure your answer using clear, beautifully spaced markdown formatting: separate major points or sections with double line breaks (\\n\\n) and bullet points (- ).
3. Answer strictly using the facts, mathematical derivations, and terminology present in the textbook text above.
4. Whenever you state a key concept, formula, theorem, or explanation, you MUST append an exact page citation right after the sentence in the exact format: [Page X] (for example: [Page 14] or [Page 15]).
5. Do not invent page numbers that aren't in the provided text blocks.`

    const ai = getGeminiClient()

    // Create a streaming response using Gemini's generateContentStream
    const responseStream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nStudent Question: ${lastMessage}` }
          ]
        }
      ]
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkData = chunk as { text?: string | (() => string) }
            const text = typeof chunkData.text === 'function' ? chunkData.text() : chunkData.text
            if (text && typeof text === 'string') {
              controller.enqueue(new TextEncoder().encode(text))
            }
          }
          controller.close()
        } catch (err) {
          console.error('Streaming error inside Gemini iterator:', err)
          controller.error(err)
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    console.error('Error in /api/ai/chat:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to generate AI chat response') }, { status: 500 })
  }
}
