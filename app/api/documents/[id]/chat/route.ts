import { NextRequest, NextResponse } from 'next/server'
import { getStoredChatByDocumentId, saveStoredChatByDocumentId } from '@/lib/reader-data-store'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const record = getStoredChatByDocumentId(documentId)
    return NextResponse.json({ messages: record ? record.messages : null, updatedAt: record?.updatedAt || null })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const { messages } = await req.json()
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const record = saveStoredChatByDocumentId(documentId, messages)
    return NextResponse.json({ success: true, messages: record.messages, updatedAt: record.updatedAt })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
