import { NextRequest, NextResponse } from 'next/server'
import { getStoredDocuments, deleteStoredDocument } from '@/lib/documents-store'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import prisma from '@/lib/db'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const docs = await getStoredDocuments(user.id)
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
    return NextResponse.json({ documents: summaries })
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
    const all = searchParams.get('all')

    // Bulk-clear the whole library (used by Settings → Danger Zone)
    if (all === 'true') {
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
