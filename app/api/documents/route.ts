import { NextRequest, NextResponse } from 'next/server'
import { getStoredDocuments, deleteStoredDocument } from '@/lib/documents-store'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { isSameOrigin } from '@/lib/same-origin'
import prisma from '@/lib/db'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `read:${user.id}`, RATE_PRESETS.read.limit, RATE_PRESETS.read.windowMs, RATE_PRESETS.read.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { searchParams } = new URL(req.url)
    const take = Math.max(1, Math.min(Number(searchParams.get('take')) || 50, 100))
    const cursor = searchParams.get('cursor') || undefined
    const docs = await getStoredDocuments(user.id, { take, cursor })
    // Return summaries without huge page text payloads for the listing view
    const summaries = docs.map((d) => ({
      id: d.id,
      title: d.title,
      fileType: d.fileType,
      totalPages: d.totalPages,
      uploadedAt: d.uploadedAt,
      folder: d.folder,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
    }))
    return NextResponse.json(
      { documents: summaries },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' } }
    )
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `docs-delete:${user.id}`, 20, 60_000, 20)
    if (!allowed) return rateLimitedResponse(retryAfterSec)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const all = searchParams.get('all')

    // Bulk-clear the whole library (used by Settings → Danger Zone).
    // Requires explicit ?confirm=DELETE plus same-origin (a forged cross-site
    // request can include the query param, so the Origin check closes that gap).
    if (all === 'true') {
      if (searchParams.get('confirm') !== 'DELETE') {
        return NextResponse.json({ error: 'Bulk delete requires ?confirm=DELETE' }, { status: 400 })
      }
      if (!isSameOrigin(req)) {
        return NextResponse.json({ error: 'Cross-origin request forbidden' }, { status: 403 })
      }
      const docs = await prisma.document.findMany({ where: { userId: user.id }, select: { id: true, fileUrl: true } })
      await prisma.document.deleteMany({ where: { userId: user.id } })
      // Best-effort R2 cleanup so bulk-delete doesn't orphan storage objects.
      const { extractKeyFromFileUrl, deleteFile } = await import('@/lib/storage-adapter')
      await Promise.all(
        docs.map((d) => {
          const key = extractKeyFromFileUrl(d.fileUrl)
          return key ? deleteFile(key) : Promise.resolve()
        })
      )
      return NextResponse.json({ success: true, deleted: docs.length })
    }

    if (!id) return NextResponse.json({ error: 'Missing document ID' }, { status: 400 })

    const deleted = await deleteStoredDocument(id, user.id)
    return NextResponse.json({ success: deleted })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
