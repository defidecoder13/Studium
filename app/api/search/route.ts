import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentPages } from '@/lib/documents-store'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `read:${user.id}`, RATE_PRESETS.read.limit, RATE_PRESETS.read.windowMs, RATE_PRESETS.read.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('q') || '').slice(0, 200)
    const q = query.toLowerCase().trim()

    if (!q) {
      return NextResponse.json({ results: [] })
    }

    // 1. Search across the user's stored document PDF chunks
    const docResults = await searchDocumentPages(q, undefined, user.id)

    // 2. Search across the user's saved bookmarks & annotations (DB-level, capped)
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: user.id,
        OR: [
          { snippet: { contains: q, mode: 'insensitive' } },
          { note: { contains: q, mode: 'insensitive' } },
          { documentTitle: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const bookmarkResults = bookmarks.map((b) => ({
      documentId: b.documentId,
      documentTitle: b.documentTitle || 'Bookmarked Document.pdf',
      pageNumber: b.pageNumber || 1,
      snippet: `[Bookmark / Note] ${b.snippet || ''} ${b.note ? `— Note: ${b.note}` : ''}`.slice(0, 500),
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
