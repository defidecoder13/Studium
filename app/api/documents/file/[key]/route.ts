import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getR2Client, R2_BUCKET_NAME } from '@/lib/r2'
import { USE_CLOUD_STORAGE, extractKeyFromFileUrl } from '@/lib/storage-adapter'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import prisma from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { headers } from 'next/headers'

function sanitizeFilename(key: string): string {
  // Prevent Content-Disposition header injection (CRLF / quotes).
  return key.replace(/[\r\n"]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'document.pdf'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    
    if (!key) {
      return new NextResponse('Missing file key', { status: 400 })
    }

    // The user must be signed in AND own a document referencing this file,
    // otherwise the endpoint would be an unauthenticated file dump.
    const userId = await getCurrentUserId(await headers())
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    const rl = await checkRateLimitWithIp(req, `heavy:${userId}`, RATE_PRESETS.heavy.limit, RATE_PRESETS.heavy.windowMs, RATE_PRESETS.heavy.ipLimit)
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSec)
    // Strict key validation: flat `timestamp-uuid-filename` strings only.
    if (key.includes('/') || key.includes('..') || key.includes('\0') || key.length > 220) {
      return new NextResponse('Invalid key', { status: 400 })
    }
    // Exact-match ownership: compare extracted storage keys in JS instead of
    // `contains` (%LIKE%) semantics that allow partial-key matches.
    const userDocs = await prisma.document.findMany({
      where: { userId },
      select: { fileUrl: true },
    })
    const owned = userDocs.some((d) => extractKeyFromFileUrl(d.fileUrl) === key)
    if (!owned) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const safeFilename = sanitizeFilename(key)
    if (USE_CLOUD_STORAGE) {
      const result = await getR2Client().send(
        new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        })
      )
      
      if (!result.Body) {
        return new NextResponse('File not found in cloud', { status: 404 })
      }
      
      const webStream = result.Body.transformToWebStream()
      
      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Type': result.ContentType || 'application/pdf',
          'Content-Disposition': `inline; filename="${safeFilename}"`,
          'Cache-Control': 'private, max-age=3600, stale-while-revalidate=600',
        },
      })
    } else {
      const base = path.join(process.cwd(), '.data', 'uploads')
      const filePath = path.join(base, key)
      // Traversal guard: resolved path must stay inside the uploads dir.
      if (!filePath.startsWith(base + path.sep)) {
        return new NextResponse('Invalid key', { status: 400 })
      }

      if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 })
      }

      const fileBuffer = fs.readFileSync(filePath)

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${safeFilename}"`,
        },
      })
    }
  } catch (error) {
    console.error('Error serving file:', error)
    return new NextResponse(getErrorMessage(error, 'Internal Server Error'), { status: 500 })
  }
}
