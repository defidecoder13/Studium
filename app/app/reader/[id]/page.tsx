'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { DocumentData } from '@/components/reader/document-reader'

const DocumentReader = dynamic(
  () => import('@/components/reader/document-reader').then((mod) => mod.DocumentReader),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
        <div className="text-base font-heading font-bold text-foreground">Loading Document Workspace...</div>
        <div className="text-xs text-muted-foreground font-mono">Fetching document, AI chat, and active recall engine...</div>
      </div>
    ),
  }
)

export default function ReaderPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const documentId = params?.id
  const requestedPage = searchParams?.get('page')
  const initialPage = requestedPage ? Math.max(1, parseInt(requestedPage, 10) || 1) : 1

  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) return

    fetch(`/api/documents/${documentId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Document not found')
        return res.json()
      })
      .then((data) => {
        const d = data.document
        setDoc({
          id: d.id,
          title: d.title,
          fileType: d.fileType || 'PDF Textbook',
          totalPages: d.totalPages || 1,
          currentPage: initialPage,
          lastOpened: 'Just now',
          tags: d.fileType === 'YouTube Video' ? ['YouTube', 'AI Indexed'] : ['PDF', 'AI Indexed'],
          fileUrl: d.fileUrl,
        })
      })
      .catch((e) => setError(e.message || 'Failed to load document'))
      .finally(() => setIsLoading(false))
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="text-sm font-heading font-bold text-destructive">Could not load document</div>
        <div className="text-xs text-muted-foreground font-mono">{error || 'Document not found'}</div>
        <button
          onClick={() => router.push('/app/library')}
          className="h-10 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs"
        >
          Back to Library
        </button>
      </div>
    )
  }

  return (
    <DocumentReader
      document={doc}
      initialPage={initialPage}
      onClose={() => router.push('/app/library')}
    />
  )
}
