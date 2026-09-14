import { NextRequest, NextResponse } from 'next/server'
import { getStoredDocumentById } from '@/lib/documents-store'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const doc = await getStoredDocumentById(id, user.id)
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const pageParam = searchParams.get('page')
    if (pageParam) {
      const pageNum = parseInt(pageParam, 10)
      const page = doc.pages.find((p) => p.pageNumber === pageNum)
      if (!page) {
        return NextResponse.json({ error: `Page ${pageNum} not found` }, { status: 404 })
      }
      return NextResponse.json({ page })
    }

    return NextResponse.json({ document: doc })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
