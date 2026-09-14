import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Bookmark as BookmarkIcon, Search, FileText, ChevronRight } from 'lucide-react'

export default async function BookmarksPage() {
  let user = null
  try {
    user = await getCurrentUser(await headers())
  } catch {
    // ignore
  }
  
  if (!user) {
    redirect('/sign-in')
  }

  let bookmarks: Awaited<ReturnType<typeof prisma.bookmark.findMany>> = []
  try {
    bookmarks = await prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { document: true },
    })
  } catch (e) {
    // Silent fallback — log for debugging, show "No bookmarks" UI instead of crashing or amber
    console.error('[BookmarksPage] DB error (showing empty state):', e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300))
    bookmarks = []
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight flex items-center gap-2">
            <BookmarkIcon className="w-8 h-8 text-primary" />
            Bookmarks
          </h1>
          <p className="text-sm text-muted-foreground">View your saved highlights, snippets, and personal notes.</p>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
            <BookmarkIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">No bookmarks saved</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Read a document in your library and use the bookmark feature to save important pages and notes.
            </p>
          </div>
          <Link href="/app/library" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 mt-2 rounded-lg">
            <Search className="w-4 h-4 mr-2" />
            Browse Library
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm) => (
            <div key={bm.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  Page {bm.pageNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(bm.createdAt), { addSuffix: true })}
                </div>
              </div>
              
              <h3 className="font-semibold text-foreground line-clamp-1 mb-3" title={bm.documentTitle}>
                {bm.documentTitle}
              </h3>
              
              <div className="bg-muted/40 p-3 rounded-xl border border-border/50 mb-4 flex-1">
                <p className="text-sm text-foreground italic line-clamp-3">&quot;{bm.snippet}&quot;</p>
              </div>

              {bm.note && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Your Note</p>
                  <p className="text-sm text-foreground line-clamp-2">{bm.note}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border/50 flex items-center justify-end">
                <Link href={`/app/reader/${bm.documentId}?page=${bm.pageNumber}`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open at Page {bm.pageNumber}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
