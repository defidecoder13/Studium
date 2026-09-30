import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
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
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Autosave fires debounced per edit — namespaced key so typing bursts
    // never starve other write endpoints sharing a global bucket.
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:notes:${user.id}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { id: documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const { content } = await req.json()
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Valid content string is required' }, { status: 400 })
    }
    if (content.length > 100_000) {
      return NextResponse.json({ error: 'Note too large (max 100k chars)' }, { status: 413 })
    }

    // Ownership check: never attach notes to another user's document.
    const owned = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
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
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
