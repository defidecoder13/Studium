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

    const record = await prisma.chatThread.findUnique({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId,
        },
      },
    })

    return NextResponse.json({
      messages: record ? record.messagesJson : null,
      updatedAt: record?.updatedAt || null,
    })
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
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `write:chat:${user.id}`, RATE_PRESETS.write.limit, RATE_PRESETS.write.windowMs, RATE_PRESETS.write.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { id: documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const { messages } = await req.json()
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }
    if (messages.length > 200) {
      return NextResponse.json({ error: 'Too many messages (max 200)' }, { status: 413 })
    }

    // Ownership check: never attach threads to another user's document.
    const owned = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const record = await prisma.chatThread.upsert({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId,
        },
      },
      update: { messagesJson: messages },
      create: {
        userId: user.id,
        documentId,
        messagesJson: messages,
      },
    })

    return NextResponse.json({
      success: true,
      messages: record.messagesJson,
      updatedAt: record.updatedAt,
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
