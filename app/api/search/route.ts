import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentPages } from '@/lib/documents-store'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const q = query.toLowerCase().trim()

    if (!q) {
      return NextResponse.json({ results: [] })
    }

    // 1. Search across the user's stored document PDF chunks
    const docResults = await searchDocumentPages(q, undefined, user.id)

    // 2. Search across the user's saved bookmarks & annotations
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

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

    // Merge & deduplicate results based on documentId + pageNumber + snippet start
    const allResults = [
      ...docResults.map((r) => ({ ...r, sourceType: 'document' })),
      ...bookmarkResults,
    ]

    const seen = new Set<string>()
    const uniqueResults = allResults.filter((r) => {
      const key = `${r.documentId}_${r.pageNumber}_${r.snippet.slice(0, 30)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ results: uniqueResults.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
