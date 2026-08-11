'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Upload,
  Search,
  ChevronRight,
  FileText,
  Layers,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { DocumentData } from '@/components/reader/document-reader'

const DocumentReader = dynamic(() => import('@/components/reader/document-reader').then(mod => mod.DocumentReader), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
      <div className="text-base font-heading font-bold text-foreground">Loading Document Workspace...</div>
      <div className="text-xs text-muted-foreground font-mono">Initializing interactive canvas, AI chat, and active recall engine...</div>
    </div>
  )
})

interface UserProps {
  id?: string
  name?: string | null
  email?: string | null
}

export function ModernDashboard({ user }: { user?: UserProps }) {
  const [activeReaderDoc, setActiveReaderDoc] = useState<{ doc: DocumentData; page: number } | null>(null)

  const [recentDocuments, setRecentDocuments] = useState<any[]>([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)

  useEffect(() => {
    setIsLoadingRecent(true)
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        if (data.documents && Array.isArray(data.documents)) {
          const formatted = data.documents.slice(0, 3).map((d: any) => ({
             id: d.id,
             title: d.title,
             fileType: d.fileType || 'PDF Textbook',
             folder: d.folder || 'General',
             totalPages: d.totalPages || 15,
             lastOpened: 'Just now',
             uploadDate: new Date(d.uploadedAt).toLocaleDateString(),
             fileUrl: d.fileUrl
          }))
          setRecentDocuments(formatted)
        }
      })
      .catch(e => console.warn('Could not fetch recent docs:', e))
      .finally(() => setIsLoadingRecent(false))
  }, [])

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Upload new study materials or continue reading your existing documents.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold text-foreground">Quick Actions</h2>
          <span className="text-xs font-mono text-muted-foreground">Fast access</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/app/library" className="block">
            <div className="p-4 rounded-2xl border border-border bg-card hover:border-foreground/30 transition flex flex-col items-start gap-3.5 group shadow-sm h-full">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 w-full">
                <div className="font-heading font-bold text-sm text-foreground truncate">Upload</div>
                <div className="text-xs text-muted-foreground truncate">Add PDFs</div>
              </div>
            </div>
          </Link>

          <Link href="/app/library" className="block">
            <div className="p-4 rounded-2xl border border-border bg-card hover:border-foreground/30 transition flex flex-col items-start gap-3.5 group shadow-sm h-full">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 w-full">
                <div className="font-heading font-bold text-sm text-foreground truncate">Search</div>
                <div className="text-xs text-muted-foreground truncate">Find info</div>
              </div>
            </div>
          </Link>

          <Link href="/app/library" className="block">
            <div className="p-4 rounded-2xl border border-border bg-card hover:border-foreground/30 transition flex flex-col items-start gap-3.5 group shadow-sm h-full">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 w-full">
                <div className="font-heading font-bold text-sm text-foreground truncate">Library</div>
                <div className="text-xs text-muted-foreground truncate">Browse files</div>
              </div>
            </div>
          </Link>

          <Link href="/app/review" className="block">
            <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40 transition flex flex-col items-start gap-3.5 group shadow-sm h-full">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 w-full">
                <div className="font-heading font-bold text-sm text-indigo-600 dark:text-indigo-400 truncate">Daily Review</div>
                <div className="text-xs text-muted-foreground truncate">Practice cards</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Continue Studying Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-xl font-heading font-bold text-foreground">Recent Documents</h2>
            <p className="text-xs text-muted-foreground">Jump back into your study materials</p>
          </div>
          <Link href="/app/library" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>View All in Library</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoadingRecent && recentDocuments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-border text-xs font-mono text-muted-foreground">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="font-semibold text-foreground">Loading recent documents from study repository...</span>
            </div>
            <div className="divide-y divide-border animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                    <div className="space-y-1.5">
                      <div className="w-48 h-4 rounded bg-muted" />
                      <div className="w-24 h-3 rounded bg-muted/60 sm:hidden" />
                    </div>
                  </div>
                  <div className="w-20 h-4 rounded bg-muted hidden sm:block" />
                  <div className="w-16 h-4 rounded bg-muted hidden md:block" />
                  <div className="w-24 h-4 rounded bg-muted hidden lg:block" />
                </div>
              ))}
            </div>
          </div>
        ) : recentDocuments.length === 0 ? (
          <div className="w-full p-8 md:p-12 rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-bold text-foreground">No recent documents</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              You haven't uploaded or opened any documents recently. Head over to the library to upload your first PDF.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-mono uppercase tracking-wider">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Folder</th>
                  <th className="py-3 px-4 hidden md:table-cell">Pages</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentDocuments.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => setActiveReaderDoc({ doc, page: 1 })}
                    className="hover:bg-muted/40 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {doc.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono sm:hidden">
                            {doc.folder} • {doc.totalPages} pages
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 hidden sm:table-cell font-mono text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-semibold text-foreground">
                        {doc.folder}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell font-mono font-bold text-foreground">
                      {doc.totalPages} P.
                    </td>
                    <td className="py-3.5 px-4 hidden lg:table-cell font-mono text-muted-foreground">
                      {doc.uploadDate}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-primary font-bold opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          Read Hub <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DEDICATED DOCUMENT READER OVERLAY */}
      {activeReaderDoc && (
        <DocumentReader
          document={activeReaderDoc.doc}
          initialPage={activeReaderDoc.page}
          onClose={() => setActiveReaderDoc(null)}
        />
      )}

    </div>
  )
}
