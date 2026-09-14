import { NextRequest, NextResponse } from 'next/server'
import { getGeminiClient, GEMINI_MODEL } from '@/lib/ai'
import { getStoredDocumentById } from '@/lib/documents-store'
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
    const { documentId, difficulty = 'Medium', count = 5, quizType = 'MCQ', currentPage = 14, documentTitle = 'Academic Textbook', fileType } = body
    const isVideo = fileType === 'YouTube Video'

    const storedDoc = documentId ? await getStoredDocumentById(documentId, userId) : null
    
    let contextText = ''
    if (storedDoc && storedDoc.pages.length > 0) {
      // Window the context to pages around the student's current page so large
      // textbooks don't blow the model context window.
      const windowStart = Math.max(1, (currentPage || 1) - 5)
      const windowEnd = (currentPage || 1) + 15
      const windowedPages = storedDoc.pages
        .filter((p) => p.pageNumber >= windowStart && p.pageNumber <= windowEnd)
        .slice(0, 20)
      const contextPages = windowedPages.length > 0 ? windowedPages : storedDoc.pages.slice(0, 20)

      contextText = contextPages
        .map((p) => 
          isVideo 
            ? `--- [Video Segment ${p.pageNumber}: ${(p.pageNumber - 1) * 3}:00 to ${p.pageNumber * 3}:00] ---\n${p.text}`
            : `--- [Page ${p.pageNumber}] ---\n${p.text}`
        )
        .join('\n\n')
    } else {
      contextText = `--- [Page ${currentPage}] ---\nDocument Title: ${documentTitle}\n` +
        `Superposition allows a qubit to exist in state |ψ⟩ = α|0⟩ + β|1⟩. The Hadamard gate creates an equal superposition.\n` +
        `--- [Page ${currentPage + 1}] ---\n` +
        `Quantum entanglement states that measuring one entangled qubit instantaneously determines the state of its partner, violating classical Bell inequalities.\n` +
        `--- [Page ${currentPage + 2}] ---\n` +
        `NMDA receptors require both glutamate binding and postsynaptic depolarization to remove the extracellular Mg2+ block, allowing Ca2+ influx and triggering Hebbian plasticity.`
    }

    const isTrueFalse = quizType === 'True/False'
    
    const prompt = isVideo
      ? `You are the Studium Assessment Engine. Create exactly ${count} exam questions at ${difficulty} difficulty based on the following video transcript segments:

${contextText}

OUTPUT RULES:
1. The quiz type requested is: ${quizType}.
2. ${isTrueFalse ? 'For True/False questions, the "options" array MUST contain exactly 2 strings: ["True", "False"].' : 'For Multiple Choice questions, the "options" array MUST contain exactly 4 plausible choices.'}
3. You must output ONLY valid, parseable JSON as a raw array without markdown code fences (\`\`\`json) or conversational preamble.

Each object in the array must strictly follow this exact TypeScript interface:
{
  "id": string; // unique ID like "q-1", "q-2"
  "question": string; // clear academic question about what is taught in the video
  "topic": string; // concise 2-4 word concept name (e.g. 'Entanglement Mechanics', 'Synaptic Plasticity')
  "options": string[]; // ${isTrueFalse ? 'exactly 2 choices: ["True", "False"]' : 'exactly 4 plausible choices'}
  "correctIndex": number; // ${isTrueFalse ? '0 for True, 1 for False' : '0, 1, 2, or 3'}
  "explanation": string; // detailed pedagogical explanation why the answer is correct
  "sourcePage": number; // the exact video segment number (1, 2, 3...) where this concept is taught
}`
      : `You are the Studium Assessment Engine. Create exactly ${count} exam questions at ${difficulty} difficulty based on the following textbook content:

${contextText}

OUTPUT RULES:
1. The quiz type requested is: ${quizType}.
2. ${isTrueFalse ? 'For True/False questions, the "options" array MUST contain exactly 2 strings: ["True", "False"].' : 'For Multiple Choice questions, the "options" array MUST contain exactly 4 plausible choices.'}
3. You must output ONLY valid, parseable JSON as a raw array without markdown code fences (\`\`\`json) or conversational preamble.

Each object in the array must strictly follow this exact TypeScript interface:
{
  "id": string; // unique ID like "q-1", "q-2"
  "question": string; // clear academic question
  "topic": string; // concise 2-4 word concept name (e.g. 'Mitochondrial Structure', 'Bell Inequalities')
  "options": string[]; // ${isTrueFalse ? 'exactly 2 choices: ["True", "False"]' : 'exactly 4 plausible choices'}
  "correctIndex": number; // ${isTrueFalse ? '0 for True, 1 for False' : '0, 1, 2, or 3'}
  "explanation": string; // detailed pedagogical explanation why the answer is correct
  "sourcePage": number; // exact page number where this fact is taught
}`

    const ai = getGeminiClient()
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    })

    const rawText = response.text || '[]'
    let questions = []
    try {
      const startIdx = rawText.indexOf('[')
      const endIdx = rawText.lastIndexOf(']')
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = rawText.substring(startIdx, endIdx + 1)
        questions = JSON.parse(jsonStr)
      } else {
        questions = JSON.parse(rawText)
      }
    } catch {
      console.error('Failed to parse quiz response:', rawText)
      return NextResponse.json({ error: 'AI returned invalid formatting. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, questions })
  } catch (error) {
    console.error('Error in /api/ai/quiz:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to generate quiz') }, { status: 500 })
  }
}
