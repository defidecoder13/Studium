'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Upload,
  Folder,
  FileText,
  Clock,
  Calendar,
  MoreVertical,
  Star,
  Share2,
  Edit2,
  Trash2,
  BookOpen,
  Plus,
  ArrowUpDown,
  Check,
  Sparkles,
  Layers,
  X,
  Video,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFolder, setActiveFolder] = useState<string>('All Documents')
  const [sortBy, setSortBy] = useState<'opened' | 'name' | 'date'>('opened')
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'pdf'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setGlobalSearchResults([])
      setIsSearchingGlobal(false)
      return
    }
    setIsSearchingGlobal(true)
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.results && Array.isArray(data.results)) {
            setGlobalSearchResults(data.results)
          } else {
            setGlobalSearchResults([])
          }
        })
        .catch((e) => console.warn('Search API error:', e))
        .finally(() => setIsSearchingGlobal(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Document Reader Overlay State
  const [activeReaderDoc, setActiveReaderDoc] = useState<LibraryDocument | null>(null)
  
  // Drag & Drop Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showYoutubeModal, setShowYoutubeModal] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isImportingYoutube, setIsImportingYoutube] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)

  // Documents State
  const [documents, setDocuments] = useState<LibraryDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)

  const dynamicFolders = Array.from(new Set(documents.map(d => d.folder || 'General')))
  const folders = [
    'All Documents',
    ...dynamicFolders.filter(f => f !== 'All Documents')
  ]

  useEffect(() => {
    setIsLoadingDocs(true)
    fetch('/api/documents')
      .then((res) => res.json())
      .then((data) => {
        if (data.documents && Array.isArray(data.documents)) {
          const apiDocs: LibraryDocument[] = data.documents.map((d: any) => ({
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
            fileSize: d.fileType === 'YouTube Video' ? 'Video' : '3.4 MB',
            fileUrl: d.fileUrl,
          }))
          setDocuments((prev) => {
            const existingIds = new Set(apiDocs.map((a) => a.id))
            return [...apiDocs, ...prev.filter((p) => !existingIds.has(p.id))]
          })
        }
      })
      .catch((e) => console.warn('Could not load real documents:', e))
      .finally(() => setIsLoadingDocs(false))
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
    } catch (err: any) {
      console.error('PDF upload error:', err)
      alert(`Could not upload PDF: ${err.message}. Make sure it is a valid PDF or document file.`)
    } finally {
      setUploadingFile(null)
    }
  }

  const handleImportYoutube = async () => {
    if (!youtubeUrl) return
    setIsImportingYoutube(true)
    try {
      const res = await fetch('/api/documents/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: youtubeUrl,
          folder: activeFolder === 'All Documents' ? 'General' : activeFolder
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
        setShowYoutubeModal(false)
        setYoutubeUrl('')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import YouTube video')
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
            className="rounded-xl px-5 h-10 font-semibold gap-2 shadow-sm text-xs sm:text-sm border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Import YouTube</span>
          </Button>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="rounded-xl px-5 h-10 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 shadow-sm text-xs sm:text-sm"
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
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Folder className={cn('w-3.5 h-3.5', isActive ? 'text-background' : 'text-primary/70')} />
                <span>{folderName}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                    isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
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
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
          />
        </div>

        {/* Sorting, Filtering, and Toggle */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
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
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
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
                      fileSize: '3.4 MB',
                      tags: ['Search Match'],
                    } as any)
                  }
                  className="p-4 rounded-2xl border border-border bg-card hover:border-foreground/50 transition cursor-pointer flex flex-col justify-between space-y-3 shadow-sm group"
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
                      "{res.snippet}"
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <Button size="sm" className="h-7 text-[11px] rounded-lg bg-foreground text-background font-semibold gap-1">
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
          <div className="divide-y divide-border animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                  <div className="space-y-1.5">
                    <div className="w-48 h-4 rounded bg-muted" />
                    <div className="w-24 h-3 rounded bg-muted/60 sm:hidden" />
                  </div>
                </div>
                <div className="w-24 h-4 rounded bg-muted hidden sm:block" />
                <div className="w-16 h-4 rounded bg-muted hidden md:block" />
                <div className="w-20 h-4 rounded bg-muted hidden lg:block" />
                <div className="w-16 h-6 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredDocs.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-mono uppercase tracking-wider">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Folder</th>
                  <th className="py-3 px-4 hidden md:table-cell">Pages</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Last Opened</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setActiveReaderDoc(doc)}
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
                      {doc.lastOpened}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleToggleFavorite(e, doc.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-400 transition"
                        >
                          <Star className={cn('w-4 h-4', doc.isFavorite ? 'fill-amber-400 text-amber-400' : '')} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteDoc(e, doc.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  : 'Your study repository is currently empty. Upload your first PDF textbook, lecture recording, or Word document to get started!'}
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
                className="rounded-xl px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 text-xs h-10 shadow-sm"
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
                Supported formats: PDF textbooks, Word DOCX, and lecture transcriptions.
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
                  ? 'border-foreground bg-foreground/5 scale-[1.02]'
                  : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-foreground/40'
              )}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.pdf,.docx,.doc,.txt'
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
                    Maximum file size: 50 MB
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
              onClick={() => setShowYoutubeModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" /> Import YouTube Video
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
                onClick={handleImportYoutube}
                disabled={!youtubeUrl || isImportingYoutube}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
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
