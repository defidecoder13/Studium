import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentPages } from '@/lib/documents-store'
import { getStoredBookmarks } from '@/lib/bookmarks-store'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const q = query.toLowerCase().trim()

    if (!q) {
      return NextResponse.json({ results: [] })
    }

    // 1. Search across stored document PDF chunks
    const docResults = await searchDocumentPages(q)

    // 2. Search across saved bookmarks & annotations
    const bookmarks = getStoredBookmarks()
    const bookmarkResults = bookmarks
      .filter(
        (b) =>
          (b.snippet && b.snippet.toLowerCase().includes(q)) ||
          (b.note && b.note.toLowerCase().includes(q)) ||
          (b.documentTitle && b.documentTitle.toLowerCase().includes(q))
      )
      .map((b) => ({
        documentId: b.documentId,
        documentTitle: b.documentTitle || 'Bookmarked Document.pdf',
        pageNumber: b.pageNumber || 1,
        snippet: `[Bookmark / Note] ${b.snippet || ''} ${b.note ? `— Note: ${b.note}` : ''}`,
        sourceType: 'bookmark',
      }))

    // 3. Starter curriculum concept search (ensures immediate matches for textbook topics)
    const starterCurriculum = [
      {
        documentId: 'doc-quantum',
        documentTitle: 'Quantum Computing & Qubit Superposition.pdf',
        pageNumber: 14,
        text: 'Born rule measurement postulate and linear superposition state vector |ψ⟩ = α|0⟩ + β|1⟩ where |α|² + |β|² = 1. A qubit exists in orthogonal basis states.',
      },
      {
        documentId: 'doc-quantum',
        documentTitle: 'Quantum Computing & Qubit Superposition.pdf',
        pageNumber: 15,
        text: 'The Hadamard gate (H) applies matrix 1/√2 [[1,1],[1,-1]] to generate equal superposition vectors |+⟩ and |-⟩. Combined with CNOT generates Bell states.',
      },
      {
        documentId: 'doc-neuro',
        documentTitle: 'Principles of Neurobiology & Synaptic Plasticity.pdf',
        pageNumber: 6,
        text: 'Hebbian Plasticity dictates that simultaneous pre- and post-synaptic firing increases synaptic efficiency ("Neurons that fire together, wire together").',
      },
      {
        documentId: 'doc-neuro',
        documentTitle: 'Principles of Neurobiology & Synaptic Plasticity.pdf',
        pageNumber: 18,
        text: 'NMDA receptor coincidence detection requires glutamate binding and post-synaptic depolarization to expel the magnesium (Mg²⁺) ion block.',
      },
      {
        documentId: 'doc-macro',
        documentTitle: 'Advanced Macroeconomics & Monetary Policy.pdf',
        pageNumber: 1,
        text: 'Taylor Rule dictates nominal central bank interest rate adjustments in response to inflation gaps and real GDP divergence.',
      },
      {
        documentId: 'doc-algo',
        documentTitle: 'Dynamic Programming & Graph Algorithms.pdf',
        pageNumber: 22,
        text: 'Bellman-Ford and Dijkstra shortest path optimization algorithms across weighted graphs with overlapping subproblem memoization.',
      },
    ]

    const starterResults = starterCurriculum
      .filter(
        (item) =>
          item.text.toLowerCase().includes(q) ||
          item.documentTitle.toLowerCase().includes(q)
      )
      .map((item) => ({
        documentId: item.documentId,
        documentTitle: item.documentTitle,
        pageNumber: item.pageNumber,
        snippet: item.text,
        sourceType: 'curriculum',
      }))

    // Merge & deduplicate results based on documentId + pageNumber + snippet start
    const allResults = [
      ...docResults.map((r) => ({ ...r, sourceType: 'document' })),
      ...bookmarkResults,
      ...starterResults,
    ]

    const seen = new Set<string>()
    const uniqueResults = allResults.filter((r) => {
      const key = `${r.documentId}_${r.pageNumber}_${r.snippet.slice(0, 30)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ results: uniqueResults.slice(0, 20) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
