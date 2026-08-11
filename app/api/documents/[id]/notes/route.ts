import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const record = await prisma.documentNote.findUnique({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId: documentId
        }
      }
    })
    
    return NextResponse.json({ note: record ? record.content : null, updatedAt: record?.updatedAt || null })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const { content } = await req.json()
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Valid content string is required' }, { status: 400 })
    }

    const record = await prisma.documentNote.upsert({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId: documentId
        }
      },
      update: {
        content: content
      },
      create: {
        userId: user.id,
        documentId: documentId,
        content: content
      }
    })

    return NextResponse.json({ success: true, note: record.content, updatedAt: record.updatedAt })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
