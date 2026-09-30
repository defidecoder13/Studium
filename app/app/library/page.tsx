'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Upload,
  Folder,
  FileText,
  Star,
  Trash2,
  BookOpen,
  ArrowUpDown,
  Sparkles,
  X,
  Video,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
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

interface LibraryDocument extends DocumentData {
  folder: string
  isFavorite: boolean
  fileSize: string
}

interface GlobalSearchResult {
  documentId: string
  documentTitle: string
  pageNumber: number
  snippet: string
  sourceType: string
}

interface ApiDocumentSummary {
  id: string
  title: string
  fileType?: string
  totalPages?: number
  uploadedAt?: string
  folder?: string
  fileUrl?: string
  fileSize?: string
}

export default function LibraryPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFolder, setActiveFolder] = useState<string>('All Documents')
  const [sortBy, setSortBy] = useState<'opened' | 'name' | 'date'>('opened')
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'pdf'>('all')
  
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) return

    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setIsSearchingGlobal(true)
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((res) => res.json())
        .then((data) => {
          setGlobalSearchResults(data.results && Array.isArray(data.results) ? data.results : [])
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          console.warn('Search API error:', e)
        })
        .finally(() => setIsSearchingGlobal(false))
    }, 300)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [searchQuery])
  
  // Document Reader Overlay State
  const [activeReaderDoc, setActiveReaderDoc] = useState<LibraryDocument | null>(null)
  
  // Drag & Drop Upload Modal State (auto-opens via ?upload=1 from the dashboard quick action)
  const [showUploadModal, setShowUploadModal] = useState(() => searchParams.get('upload') === '1')
  const [showYoutubeModal, setShowYoutubeModal] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isImportingYoutube, setIsImportingYoutube] = useState(false)
  const [youtubeError, setYoutubeError] = useState<string | null>(null)
  const [showManualPaste, setShowManualPaste] = useState(false)
  const [manualTranscript, setManualTranscript] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)

  // Drop the ?upload=1 param from the URL once the modal has been opened by it
  useEffect(() => {
    if (searchParams.get('upload') === '1') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [searchParams])

  // Documents State
  const [documents, setDocuments] = useState<LibraryDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)

  const dynamicFolders = Array.from(new Set(documents.map(d => d.folder || 'General')))
  const folders = [
    'All Documents',
    ...dynamicFolders.filter(f => f !== 'All Documents')
  ]

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/documents?take=100', { signal: ctrl.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.documents && Array.isArray(data.documents)) {
          const apiDocs: LibraryDocument[] = data.documents.map((d: ApiDocumentSummary) => ({
            id: d.id,
            title: d.title,
            fileType: d.fileType || 'PDF Textbook',
            uploadDate: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : 'Recently',
            totalPages: d.totalPages || 15,
            currentPage: 1,
            lastOpened: 'Just now',
            folder: d.folder || 'General',
            tags: d.fileType === 'YouTube Video' ? ['YouTube', 'AI Indexed'] : ['Real PDF', 'AI Indexed'],
            isFavorite: false,
            fileSize: d.fileType === 'YouTube Video' ? 'Video' : (d.fileSize || 'PDF'),
            fileUrl: d.fileUrl,
          }))
          setDocuments((prev) => {
            const existingIds = new Set(apiDocs.map((a) => a.id))
            return [...apiDocs, ...prev.filter((p) => !existingIds.has(p.id))]
          })
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        console.warn('Could not load real documents:', e)
      })
      .finally(() => setIsLoadingDocs(false))
    return () => ctrl.abort()
  }, [])

  const handleToggleFavorite = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, isFavorite: !d.isFavorite } : d))
    )
  }

  const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this document from your library?')) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      try {
        await fetch(`/api/documents?id=${encodeURIComponent(docId)}`, { method: 'DELETE' })
      } catch (err) {
        console.warn('Delete check:', err)
      }
    }
  }

  const handleSimulatedUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setUploadingFile(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', activeFolder === 'All Documents' ? 'General' : activeFolder)

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Upload failed')
      }

      const data = await res.json()
      if (data.success && data.document) {
        const newDoc: LibraryDocument = {
          id: data.document.id,
          title: data.document.title,
          fileType: 'PDF Textbook',
          uploadDate: 'Just now',
          totalPages: data.document.totalPages || 15,
          currentPage: 1,
          lastOpened: 'Just now',
          folder: data.document.folder || 'General',
          tags: ['Real Upload', 'AI Indexed'],
          isFavorite: true,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fileUrl: data.document.fileUrl,
        }
        setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)])
        setUploadingFile(null)
        setShowUploadModal(false)
        setActiveReaderDoc(newDoc)
        return
      }
    } catch (err) {
      console.error('PDF upload error:', err)
      const reason = err instanceof Error && err.message ? err.message : 'Make sure it is a valid PDF or document file.'
      alert(`Could not upload PDF: ${reason}`)
    } finally {
      setUploadingFile(null)
    }
  }

  const resetYoutubeModal = () => {
    setShowYoutubeModal(false)
    setYoutubeUrl('')
    setYoutubeError(null)
    setShowManualPaste(false)
    setManualTranscript('')
  }

  const handleImportYoutube = async (pastedTranscript?: string) => {
    if (!youtubeUrl) return
    setIsImportingYoutube(true)
    setYoutubeError(null)
    try {
      const res = await fetch('/api/documents/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: youtubeUrl,
          folder: activeFolder === 'All Documents' ? 'General' : activeFolder,
          ...(pastedTranscript && pastedTranscript.trim() ? { transcript: pastedTranscript } : {}),
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Import failed')
      }

      const data = await res.json()
      if (data.success && data.document) {
        const newDoc: LibraryDocument = {
          id: data.document.id,
          title: data.document.title,
          fileType: 'YouTube Video',
          uploadDate: 'Just now',
          totalPages: data.document.totalPages || 1,
          currentPage: 1,
          lastOpened: 'Just now',
          folder: data.document.folder || 'General',
          tags: ['YouTube', 'AI Indexed'],
          isFavorite: true,
          fileSize: 'Video',
          fileUrl: data.document.fileUrl,
        }
        setDocuments(prev => [newDoc, ...prev.filter(d => d.id !== newDoc.id)])
        resetYoutubeModal()
      }
    } catch (err) {
      // Inline (not alert): the server message is already user-safe and may
      // contain a `ref:` trail. Keep the modal open so the user can retry or
      // fall back to pasting the transcript manually.
      setYoutubeError(err instanceof Error && err.message ? err.message : 'Failed to import YouTube video')
    } finally {
      setIsImportingYoutube(false)
    }
  }

  // Filter & Sort Logic
  const filteredDocs = documents
    .filter((doc) => {
      const matchesFolder = activeFolder === 'All Documents' || doc.folder === activeFolder
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesType =
        filterType === 'all' ||
        (filterType === 'favorites' && doc.isFavorite) ||
        (filterType === 'pdf' && doc.fileType?.includes('PDF'))

      return matchesFolder && matchesSearch && matchesType
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      if (sortBy === 'date') return a.id.localeCompare(b.id)
      return 0 // default 'opened' keeps recent first
    })

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-full flex flex-col">
      
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
            My Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your study repository, organize by subject, and click any document to launch the interactive AI reader.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => setShowYoutubeModal(true)}
            variant="outline"
            className="rounded-xl px-5 h-10 font-semibold gap-2 shadow-sm text-xs sm:text-sm border-destructive/30 text-destructive hover:bg-destructive/10 dark:text-red-400 dark:hover:bg-destructive/15 transition-colors"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Import YouTube</span>
          </Button>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="rounded-xl px-5 h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-sm text-xs sm:text-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Document</span>
          </Button>
        </div>
      </div>

      {/* Folder Organization & Subject Filter Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          {folders.map((folderName) => {
            const count =
              folderName === 'All Documents'
                ? documents.length
                : documents.filter((d) => d.folder === folderName).length
            const isActive = activeFolder === folderName

            return (
              <button
                key={folderName}
                onClick={() => setActiveFolder(folderName)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Folder className={cn('w-3.5 h-3.5', isActive ? 'text-primary-foreground' : 'text-primary/70')} />
                <span>{folderName}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Top Controls Bar (Search, Sorting, Filter, Grid/List Toggle) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by filename or concept tags..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
          />
        </div>

        {/* Sorting, Filtering, and Toggle */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'favorites' | 'pdf')}
              className="bg-transparent font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-lg cursor-pointer"
            >
              <option value="all">Filter: All Types</option>
              <option value="favorites">Favorites ⭐</option>
              <option value="pdf">PDF Textbooks</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'opened' | 'name' | 'date')}
              className="bg-transparent font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-lg cursor-pointer"
            >
              <option value="opened">Sort: Last Opened</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="date">Sort: Upload Date</option>
            </select>
          </div>

          {/* Grid vs List View Toggle Removed */}
        </div>
      </div>

      {/* Global Deep Search Results Overlay (Triggered by searching across chunks & concepts) */}
      {searchQuery.trim().length >= 2 && (
        <div className="p-6 rounded-3xl border border-primary/40 bg-primary/5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <h2 className="text-base font-heading font-bold text-foreground">
                Global Multi-Document Deep Search & Citation Results
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-mono text-xs font-bold">
                {isSearchingGlobal ? 'Searching...' : `${globalSearchResults.length} matches across all chunks`}
              </span>
            </div>
          </div>

          {globalSearchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {globalSearchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setActiveReaderDoc({
                      id: res.documentId,
                      title: res.documentTitle,
                      fileType: 'PDF Document',
                      totalPages: 30,
                      currentPage: res.pageNumber,
                      lastOpened: 'Just now',
                      folder: 'General',
                      isFavorite: false,
                      fileSize: 'PDF',
                      tags: ['Search Match'],
                    })
                  }
                  className="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3 shadow-sm group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span className="text-primary font-bold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> Page {res.pageNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] uppercase font-semibold">
                        {res.sourceType} match
                      </span>
                    </div>
                    <div className="font-heading font-bold text-sm text-foreground group-hover:text-primary transition line-clamp-1">
                      {res.documentTitle}
                    </div>
                    <p className="text-xs text-muted-foreground italic font-mono line-clamp-3 bg-muted/30 p-2 rounded-lg border border-border/50">
                      &quot;{res.snippet}&quot;
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <Button size="sm" className="h-7 text-[11px] rounded-lg bg-primary text-primary-foreground font-semibold gap-1">
                      <span>Jump to Page {res.pageNumber}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : !isSearchingGlobal ? (
            <div className="p-4 text-center text-xs text-muted-foreground font-mono">
              No deep text matches found across chunks. Showing exact filename/tag matches below if any.
            </div>
          ) : null}
        </div>
      )}

      {/* Documents List / Skeleton Loader */}
      {isLoadingDocs && documents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3 pb-6 border-b border-border text-xs font-mono text-muted-foreground">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="font-semibold text-foreground">Loading study repository from database...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-4 sm:p-5 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-muted" />
                  <div className="w-8 h-8 rounded-lg bg-muted/60" />
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 h-4 rounded bg-muted" />
                  <div className="w-1/2 h-3 rounded bg-muted/60" />
                </div>
                <div className="pt-3 border-t border-border/70 flex justify-between">
                  <div className="w-16 h-3 rounded bg-muted/60" />
                  <div className="w-8 h-3 rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setActiveReaderDoc(doc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveReaderDoc(doc)
                  }
                }}
                role="button"
                tabIndex={0}
                className="group relative rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col gap-3.5 animate-in fade-in duration-200 outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                {/* Type icon tile + favorite */}
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-colors',
                      doc.fileType === 'YouTube Video'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                    )}
                  >
                    {doc.fileType === 'YouTube Video' ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <button
                    onClick={(e) => handleToggleFavorite(e, doc.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-500 transition"
                    title={doc.isFavorite ? 'Remove favorite' : 'Mark favorite'}
                  >
                    <Star className={cn('w-4 h-4', doc.isFavorite ? 'fill-amber-500 text-amber-500' : '')} />
                  </button>
                </div>

                {/* Title + meta + tags */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {doc.folder} • {doc.totalPages} pages • {doc.lastOpened}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {doc.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-muted/60 text-[10px] font-mono font-semibold text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: size + open hint + delete */}
                <div className="pt-3 border-t border-border/70 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">{doc.fileSize}</span>
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Open Reader <BookOpen className="w-3 h-3" />
                    </span>
                    <button
                      onClick={(e) => handleDeleteDoc(e, doc.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      ) : (
        /* BEAUTIFUL EMPTY STATE WHEN NO DOCUMENTS MATCH / EXIST */
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="max-w-md w-full text-center p-8 sm:p-12 rounded-3xl border-2 border-dashed border-border bg-card/50 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-heading font-bold text-foreground">No documents found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {searchQuery || filterType !== 'all' || activeFolder !== 'All Documents'
                  ? "We couldn't find any study materials matching your current filter criteria. Try clearing filters or uploading a new syllabus."
                  : 'Your study repository is currently empty. Upload your first PDF textbook or import a YouTube lecture to get started!'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              {(searchQuery || filterType !== 'all' || activeFolder !== 'All Documents') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterType('all')
                    setActiveFolder('All Documents')
                  }}
                  className="rounded-xl text-xs"
                >
                  Clear Filters
                </Button>
              )}
              <Button
                onClick={() => setShowUploadModal(true)}
                className="rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 text-xs h-10 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DRAG AND DROP UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-xl text-foreground">Upload Study Materials</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Supported format: PDF textbooks and lecture slides. The text is extracted per page and AI-indexed for chat, quizzes, and flashcards.
              </p>
            </div>

            {/* Dropzone Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleSimulatedUpload(e.dataTransfer.files)
              }}
              className={cn(
                'w-full h-56 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40'
              )}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.pdf,application/pdf'
                input.onchange = (e) => handleSimulatedUpload((e.target as HTMLInputElement).files)
                input.click()
              }}
            >
              {uploadingFile ? (
                <div className="space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary mx-auto flex items-center justify-center animate-bounce">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground">{uploadingFile}</div>
                    <div className="text-xs text-muted-foreground font-mono">Indexing document vectors...</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground">Drag and drop your PDF or syllabus here</div>
                    <div className="text-xs text-muted-foreground">or click to browse from your computer</div>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground pt-1">
                    Maximum file size: 4.5 MB · up to 50 pages
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* YOUTUBE IMPORT MODAL */}
      {showYoutubeModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={resetYoutubeModal}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                <Video className="w-5 h-5 text-destructive" /> Import YouTube Video
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Paste a link to any educational YouTube video. We will automatically fetch the transcript and index it as a document.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleImportYoutube()
                  }}
                />
              </div>

              <Button
                onClick={() => handleImportYoutube()}
                disabled={!youtubeUrl || isImportingYoutube}
                className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold gap-2"
              >
                {isImportingYoutube ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Fetching Transcript...
                  </>
                ) : (
                  'Import Video'
                )}
              </Button>

              {youtubeError && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs leading-relaxed text-foreground">
                  {youtubeError}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowManualPaste((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition"
              >
                {showManualPaste ? 'Hide manual paste' : 'Auto-fetch failing? Paste the transcript manually'}
              </button>

              {showManualPaste && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Open the video on YouTube → expand the description → <span className="text-foreground font-semibold">Show transcript</span> →
                    copy the text (timestamps are fine, we strip them) and paste it below.
                  </p>
                  <textarea
                    value={manualTranscript}
                    onChange={(e) => setManualTranscript(e.target.value)}
                    placeholder="Paste the full video transcript here (at least 50 words)..."
                    rows={6}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-y min-h-28"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {manualTranscript.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <Button
                      onClick={() => handleImportYoutube(manualTranscript)}
                      disabled={!youtubeUrl || isImportingYoutube || manualTranscript.split(/\s+/).filter(Boolean).length < 50}
                      className="h-10 rounded-xl font-bold gap-2"
                    >
                      {isImportingYoutube ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import from pasted text'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED DOCUMENT READER WORKSPACE OVERLAY */}
      {activeReaderDoc && (
        <DocumentReader
          document={activeReaderDoc}
          initialPage={activeReaderDoc.currentPage || 1}
          onClose={() => setActiveReaderDoc(null)}
        />
      )}

    </div>
  )
}
