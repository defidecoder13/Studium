import { NextRequest, NextResponse } from 'next/server'
import { getGeminiClient, GEMINI_MODEL } from '@/lib/ai'
import { getStoredDocumentById } from '@/lib/documents-store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { documentId, currentPage = 14, mode = 'quick', documentTitle = 'Academic Textbook' } = body

    const storedDoc = documentId ? await getStoredDocumentById(documentId) : null
    
    let pageText = ''
    if (storedDoc) {
      const targetPage = storedDoc.pages.find((p) => p.pageNumber === currentPage) || storedDoc.pages[0]
      pageText = targetPage ? targetPage.text : ''
    } else {
      pageText = `In quantum computing, qubit superposition allows a state |ψ⟩ to exist as |ψ⟩ = α|0⟩ + β|1⟩, where the normalization condition |α|² + |β|² = 1 holds. ` +
        `Applying a Hadamard matrix H transforms |0⟩ into (|0⟩ + |1⟩)/√2 and |1⟩ into (|0⟩ - |1⟩)/√2. Entangled qubits cannot be factored into independent tensor products.`
    }

    const prompt = `You are the Studium Summary and Formula Extractor.
Synthesize the following textbook page content (Page ${currentPage} of "${documentTitle}") into structured JSON for an academic student review sheet.
Mode: ${mode === 'quick' ? 'Quick 3-bullet Executive Summary' : 'Detailed Comprehensive Analysis with mathematical proofs and definitions'}

Page Text:
${pageText}

OUTPUT RULES:
Output ONLY valid, parseable JSON as a raw object without markdown fences (\`\`\`json). Must follow this interface:
{
  "keyConcepts": string[]; // 3-5 high-yield bullet takeaways
  "formulas": { "name": string; "equation": string; "explanation": string }[]; // Any mathematical formulas, theorems, or biochemical equations found
  "examTips": string[]; // 2-3 specific high-probability exam questions or common pitfalls
  "pageSummary": string; // 2-sentence executive summary
}`

    const ai = getGeminiClient()
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    })

    const rawText = response.text || '{}'
    let summaryData = {}
    try {
      summaryData = JSON.parse(rawText)
    } catch (e) {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      summaryData = JSON.parse(cleaned)
    }

    return NextResponse.json({ success: true, summary: summaryData })
  } catch (error: any) {
    console.error('Error in /api/ai/summary:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 })
  }
}
