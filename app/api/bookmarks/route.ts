import { NextRequest, NextResponse } from 'next/server'
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
    const take = Math.max(1, Math.min(Number(searchParams.get('take')) || 100, 200))
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take,
      include: { document: { select: { id: true, title: true } } },
    })
    return NextResponse.json(
      { bookmarks },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' } }
    )
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:bookmarks:${user.id}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const body = await req.json()
    const { documentId, documentTitle, pageNumber, snippet, note } = body

    if (!documentId || pageNumber === undefined || pageNumber === null) {
      return NextResponse.json(
        { error: 'Missing documentId or pageNumber' },
        { status: 400 }
      )
    }
    const pageNum = Number(pageNumber)
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 5000) {
      return NextResponse.json({ error: 'Invalid pageNumber' }, { status: 400 })
    }

    // Ownership check: never attach bookmarks to another user's document.
    const owned = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const newBookmark = await prisma.bookmark.create({
      data: {
        userId: user.id,
        documentId,
        documentTitle: String(documentTitle || 'Study Document').slice(0, 200),
        pageNumber: pageNum,
        snippet: String(snippet || `Bookmarked page ${pageNum}`).slice(0, 2000),
        note: String(note || '').slice(0, 5000),
      }
    })

    return NextResponse.json({ success: true, bookmark: newBookmark })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:bookmarks:${user.id}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const documentId = searchParams.get('documentId')
    const pageNumber = searchParams.get('pageNumber')

    if (!id && !documentId) {
      return NextResponse.json({ error: 'Missing bookmark id or documentId+pageNumber' }, { status: 400 })
    }

    // Ensure they only delete their own bookmark. Supports both
    // `?id=<bookmarkId>` and `?documentId=<id>&pageNumber=<n>`.
    const deleted = await prisma.bookmark.deleteMany({
      where: {
        userId: user.id,
        ...(id ? { id } : {}),
        ...(documentId && pageNumber ? { documentId, pageNumber: Number(pageNumber) } : {}),
      }
    })
    
    return NextResponse.json({ success: deleted.count > 0 })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
