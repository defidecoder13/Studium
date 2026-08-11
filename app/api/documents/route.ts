import { NextRequest, NextResponse } from 'next/server'
import { getStoredDocuments, deleteStoredDocument } from '@/lib/documents-store'

export async function GET() {
  try {
    const docs = await getStoredDocuments()
    // Return summaries without huge page text payloads for the listing view
    const summaries = docs.map((d) => ({
      id: d.id,
      title: d.title,
      fileType: d.fileType,
      totalPages: d.totalPages,
      uploadedAt: d.uploadedAt,
      folder: d.folder,
      fileUrl: d.fileUrl,
    }))
    return NextResponse.json({ documents: summaries })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing document ID' }, { status: 400 })

    const deleted = await deleteStoredDocument(id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
