import { NextRequest, NextResponse } from 'next/server'
import { getStoredDocumentById } from '@/lib/documents-store'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doc = await getStoredDocumentById(id)
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
