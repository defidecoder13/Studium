import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { document: true }
    })
    return NextResponse.json({ bookmarks })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { documentId, documentTitle, pageNumber, snippet, note } = body

    if (!documentId || !pageNumber) {
      return NextResponse.json(
        { error: 'Missing documentId or pageNumber' },
        { status: 400 }
      )
    }

    const newBookmark = await prisma.bookmark.create({
      data: {
        userId: user.id,
        documentId,
        documentTitle: documentTitle || 'Study Document',
        pageNumber: Number(pageNumber),
        snippet: snippet || `Bookmarked page ${pageNumber} inside ${documentTitle}`,
        note: note || '',
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
