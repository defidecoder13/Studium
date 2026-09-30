import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'
import { checkRateLimitWithIp, rateLimitedResponse } from '@/lib/rate-limit'
import { isSameOrigin } from '@/lib/same-origin'
import { headers } from 'next/headers'

/**
 * Self-service account deletion (Settings → Danger Zone).
 *
 * All user-owned rows (documents, pages, bookmarks, quiz attempts, notes,
 * chat threads, study sessions, flashcard decks/cards, study plans, and the
 * settings row) cascade from the `User` relation via `onDelete: Cascade`,
 * so deleting the user row purges the entire account.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers())
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Strict limit: 5 account deletions/hour per user+IP. Requires
    // ?confirm=DELETE so a forged single request can't wipe the account.
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `danger:${user.id}`, 5, 3_600_000, 10)
    if (!allowed) return rateLimitedResponse(retryAfterSec)
    if (new URL(req.url).searchParams.get('confirm') !== 'DELETE') {
      return NextResponse.json({ error: 'Account deletion requires ?confirm=DELETE' }, { status: 400 })
    }
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Cross-origin request forbidden' }, { status: 403 })
    }

    // Collect R2 keys BEFORE cascade-delete so no storage objects are orphaned.
    const docs = await prisma.document.findMany({
      where: { userId: user.id },
      select: { fileUrl: true },
    })

    // This is destructive and immediate — no soft delete, no recovery.
    await prisma.user.delete({ where: { id: user.id } })

    const { extractKeyFromFileUrl, deleteFile } = await import('@/lib/storage-adapter')
    await Promise.all(
      docs.map((d) => {
        const key = extractKeyFromFileUrl(d.fileUrl)
        return key ? deleteFile(key) : Promise.resolve()
      })
    )

    return NextResponse.json({ success: true, message: 'Account and all study data deleted' })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete account') }, { status: 500 })
  }
}
