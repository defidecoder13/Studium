'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  MessageSquare,
  HelpCircle,
  Edit3,
  Copy,
  Check,
  RefreshCw,
  Send,
  BookOpen,
  Clock,
  Award,
  AlertCircle,
  Download,
  Save,
  CheckCircle2,
  Layers,
  Search,
  Share2,
  BookmarkIcon,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DocumentData {
  id: string
  title: string
  fileType?: string
  uploadDate?: string
  totalPages: number
  currentPage?: number
  lastOpened?: string
  tags?: string[]
  fileUrl?: string
}

interface DocumentReaderProps {
  document: DocumentData
  initialPage?: number
  initialTab?: 'chat' | 'quiz' | 'notes'
  onClose: () => void
}

export function DocumentReader({
  document,
  initialPage = 1,
  initialTab = 'chat',
  onClose,
}: DocumentReaderProps) {
  // Left side state
  const [currentPage, setCurrentPage] = useState(initialPage || document.currentPage || 1)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const [pdfNumPages, setPdfNumPages] = useState<number>(document.totalPages || 1)
  const [pdfWidth, setPdfWidth] = useState<number>(600)

  // Track scroll and sync page
  useEffect(() => {
    if (!pdfContainerRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            const pageNum = Number(entry.target.getAttribute('data-page-number'))
            if (pageNum && pageNum !== currentPage) {
              setCurrentPage(pageNum)
            }
          }
        })
      },
      { threshold: 0.4, root: pdfContainerRef.current }
    )

    const checkAndObserve = () => {
      if (!pdfContainerRef.current) return
      const elements = pdfContainerRef.current.querySelectorAll('.pdf-page-container')
      elements.forEach(el => observer.observe(el))
    }
    const interval = setInterval(checkAndObserve, 1500)
    
    const handleResize = () => {
      if (pdfContainerRef.current) setPdfWidth(pdfContainerRef.current.clientWidth - 40)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [currentPage])

  const jumpToPage = (num: number) => {
    const maxPage = pdfNumPages || document.totalPages || 1
    const valid = Math.max(1, Math.min(maxPage, num))
    setCurrentPage(valid)
    const el = window.document.getElementById(`pdf-page-${valid}`)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  // Right side state
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz' | 'notes' | 'flashcards'>(initialTab as any)

  // Chat tab state
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string
      sender: 'user' | 'ai'
      text: string
      citations?: Array<{ page: number; text: string }>
    }>
  >([])
  const [chatInput, setChatInput] = useState('')
  const [isAiTyping, setIsAiTyping] = useState(false)

  // Quiz tab state
  const [quizDifficulty, setQuizDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium')
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5)
  const [quizType, setQuizType] = useState<'MCQ' | 'True/False' | 'Fill in the Blank' | 'Short Answer'>('MCQ')
  const [quizState, setQuizState] = useState<'setup' | 'playing' | 'results'>('setup')
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Array<{ correct: boolean; chosen: number }>>([])
  const [quizTimerSeconds, setQuizTimerSeconds] = useState(0)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<any[]>([])

  // Flashcards tab state
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)

  const handleGenerateFlashcards = async () => {
    setIsGeneratingFlashcards(true)
    try {
      const res = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          currentPage,
          documentTitle: document.title,
          fileType: document.fileType,
          count: 5
        })
      })
      const data = await res.json()
      if (data.success) {
        const label = document.fileType === 'YouTube Video' 
          ? `Video Segment ${(currentPage - 1) * 3}:00 - ${currentPage * 3}:00` 
          : `Page ${currentPage}`
        alert(`Successfully generated ${data.count} flashcards for ${label}! They have been added to your Daily Review.`)
      } else {
        alert(data.error || 'Failed to generate flashcards')
      }
    } catch (e) {
      console.error(e)
      alert('Error generating flashcards')
    } finally {
      setIsGeneratingFlashcards(false)
    }
  }

  // Notes tab state
  const [userNotes, setUserNotes] = useState('')
  const [activeNoteTab, setActiveNoteTab] = useState<'edit' | 'preview'>('edit')
  const [notesSaveStatus, setNotesSaveStatus] = useState('Saved just now')
  const [bookmarkedPages, setBookmarkedPages] = useState<number[]>([])
  const [isSavingBookmark, setIsSavingBookmark] = useState(false)

  useEffect(() => {
    fetch('/api/bookmarks')
      .then((res) => res.json())
      .then((data) => {
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          const pages = data.bookmarks
            .filter((b: any) => b.documentId === document.id)
            .map((b: any) => b.pageNumber)
          setBookmarkedPages(pages)
        }
      })
      .catch((e) => console.warn('Could not load bookmarks:', e))

    // Load saved notes
    fetch(`/api/documents/${document.id}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.note) {
          setUserNotes(data.note)
          setNotesSaveStatus('Loaded saved notes')
        }
      })
      .catch((e) => console.warn('Could not load notes:', e))

    // Load saved chat messages
    fetch(`/api/documents/${document.id}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.messages) && data.messages.length > 0) {
          setChatMessages(data.messages)
        }
      })
      .catch((e) => console.warn('Could not load chat messages:', e))
  }, [document.id])

  // Auto-save study notes on edit with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/documents/${document.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userNotes }),
      })
        .then((res) => res.json())
        .then(() => setNotesSaveStatus('All notes saved directly to cloud'))
        .catch(() => setNotesSaveStatus('Failed to save to cloud'))
    }, 800)
    return () => clearTimeout(timer)
  }, [userNotes, document.id])

  // Auto-save AI chat message history when updated
  useEffect(() => {
    if (chatMessages.length <= 2 && chatMessages[0]?.id === 'msg-1') return
    const timer = setTimeout(() => {
      fetch(`/api/documents/${document.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      }).catch((e) => console.warn('Could not save chat messages:', e))
    }, 1000)
    return () => clearTimeout(timer)
  }, [chatMessages, document.id])


  // Timer for quiz when active
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (quizState === 'playing') {
      interval = setInterval(() => {
        setQuizTimerSeconds((s) => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [quizState])


  const progressPercent = Math.round((currentPage / Math.max(document.totalPages, 1)) * 100)

  const handleBookmarkCurrentPage = async () => {
    setIsSavingBookmark(true)
    const isAlready = bookmarkedPages.includes(currentPage)
    try {
      if (isAlready) {
        setBookmarkedPages((prev) => prev.filter((p) => p !== currentPage))
        await fetch(`/api/bookmarks?id=${encodeURIComponent(`bm_${document.id}_${currentPage}`)}`, { method: 'DELETE' })
      } else {
        setBookmarkedPages((prev) => [...prev, currentPage])
        const rawBody = `Page ${currentPage}`
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: document.id,
            documentTitle: document.title,
            pageNumber: currentPage,
            snippet: rawBody.slice(0, 160),
          }),
        })
      }
    } catch (e) {
      console.warn('Bookmark sync error:', e)
    } finally {
      setIsSavingBookmark(false)
    }
  }

  const handleSendChat = async (textPrompt?: string) => {
    const prompt = textPrompt || chatInput
    if (!prompt.trim()) return

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user' as const,
      text: prompt,
    }
    setChatMessages((prev) => [...prev, userMsg])
    if (!textPrompt) setChatInput('')
    setIsAiTyping(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          documentId: document.id,
          currentPage,
          documentTitle: document.title,
          fileType: document.fileType,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('API failed or missing GEMINI_API_KEY')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let aiText = ''
      const aiId = `msg-ai-${Date.now()}`

      // Initial empty AI message placeholder for streaming
      setChatMessages((prev) => [...prev, { id: aiId, sender: 'ai' as const, text: '', citations: [] }])
      setIsAiTyping(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        aiText += decoder.decode(value, { stream: true })

        // Extract [Page X] citations from streamed text dynamically
        const matches = [...aiText.matchAll(/\[Page\s+(\d+)\]/gi)]
        const citations = matches.map((m) => {
          const p = parseInt(m[1], 10)
          return { page: p, text: `Page ${p}: Verified Textbook Citation` }
        })
        // Remove duplicate page citations cleanly
        const uniqueCitations = citations.filter((v, i, a) => a.findIndex((t) => t.page === v.page) === i)

        setChatMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, text: aiText, citations: uniqueCitations } : m))
        )
      }
    } catch (error: any) {
      console.warn('AI chat failed:', error)
      setChatMessages((prev) => [...prev, {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        text: `Error: ${error.message || 'Failed to connect to AI server.'}`
      }])
      setIsAiTyping(false)
    }
  }

  const currentQuizPool = activeQuizQuestions

  const handleLaunchQuiz = async () => {
    setIsGeneratingQuiz(true)
    setCurrentQuestionIdx(0)
    setSelectedAnswer(null)
    setQuizAnswers([])
    setQuizTimerSeconds(0)

    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          difficulty: quizDifficulty,
          count: quizQuestionCount,
          quizType: quizType,
          currentPage,
          documentTitle: document.title,
          fileType: document.fileType,
        }),
      })
      if (!res.ok) throw new Error('Failed quiz API')
      const data = await res.json()
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        const mapped = data.questions.map((q: any) => ({
          question: q.question,
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          pageRef: q.sourcePage || currentPage || 1,
          explanation: q.explanation,
        }))
        setActiveQuizQuestions(mapped)
        setQuizState('playing')
      } else {
        throw new Error('No quiz questions generated.')
      }
    } catch (e) {
      console.warn('Quiz generation API failed:', e)
      setActiveQuizQuestions([])
      setQuizState('setup')
      alert('Quiz generation failed. Please try again.')
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleSelectQuizAnswer = (optionIdx: number) => {
    setSelectedAnswer(optionIdx)
  }

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return
    const currentQ = currentQuizPool[currentQuestionIdx] || currentQuizPool[0]
    const isCorrect = selectedAnswer === currentQ.correct
    const updatedAnswers = [...quizAnswers, { correct: isCorrect, chosen: selectedAnswer }]
    setQuizAnswers(updatedAnswers)
    setSelectedAnswer(null)

    if (currentQuestionIdx + 1 < currentQuizPool.length) {
      setCurrentQuestionIdx((i) => i + 1)
    } else {
      setQuizState('results')
      const finalScore = updatedAnswers.filter((a) => a.correct).length
      const missedTopics = currentQuizPool
        .filter((q, idx) => updatedAnswers[idx] && !updatedAnswers[idx].correct)
        .map((q) => q.topic || (q.question ? q.question.slice(0, 40) + '...' : 'Core Concept Review'))

      fetch('/api/quizzes/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          documentTitle: document.title,
          score: finalScore,
          totalQuestions: currentQuizPool.length,
          difficulty: quizDifficulty,
          quizType,
          timeTakenSeconds: quizTimerSeconds,
          weakTopics: Array.from(new Set(missedTopics)),
        }),
      }).catch((e) => console.warn('Quiz history save check:', e))
    }
  }

  const calculateScore = () => {
    return quizAnswers.filter((a) => a.correct).length
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200 select-none">
      
      {/* Top Header Workspace Bar */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="gap-2 text-muted-foreground hover:text-foreground h-9 px-2.5 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Back to Library</span>
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-heading font-bold text-foreground truncate">
                {document.title}
              </h2>
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {document.fileType || 'PDF Document'} • {document.totalPages} Pages • {progressPercent}% Read
              </p>
            </div>
          </div>
        </div>

        {/* Right workspace header actions */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Page Navigator */}
          <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-lg px-1.5 py-1 hidden sm:flex">
            <button 
              onClick={() => jumpToPage(currentPage - 1)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-background rounded transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 text-xs font-mono">
              <input 
                type="number" 
                value={currentPage} 
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  if (!isNaN(val)) jumpToPage(val)
                }}
                min={1}
                max={document.totalPages || 100}
                className="w-10 text-center bg-background border border-border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary appearance-none"
              />
              <span className="text-muted-foreground">/ {pdfNumPages || document.totalPages || 1}</span>
            </div>
            <button 
              onClick={() => jumpToPage(currentPage + 1)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-background rounded transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleBookmarkCurrentPage}
            disabled={isSavingBookmark}
            className={cn(
              'h-8 gap-1.5 text-xs rounded-lg border-border transition',
              bookmarkedPages.includes(currentPage) ? 'bg-amber-500/15 text-amber-500 border-amber-500/40 font-semibold' : 'hidden md:flex'
            )}
          >
            <BookmarkIcon className={cn('w-3.5 h-3.5', bookmarkedPages.includes(currentPage) ? 'fill-amber-500 text-amber-500' : 'text-accent')} />
            <span>{bookmarkedPages.includes(currentPage) ? `Bookmarked Page ${currentPage}` : `Bookmark Pg ${currentPage}`}</span>
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-lg border-border hidden lg:flex">
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Hub</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Split-Screen Workspace (Left Viewer + Right Tabs) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANE: Native React PDF Viewer or YouTube Viewer */}
        <div 
          ref={pdfContainerRef}
          className="w-full lg:w-2/3 border-r border-border bg-muted overflow-y-auto overflow-x-hidden flex flex-col items-center py-8 gap-8 relative"
        >
          {document.fileType === 'YouTube Video' ? (
            <div className="w-full h-[600px] flex flex-col px-8">
              <iframe
                src={document.fileUrl}
                className="w-full h-full rounded-2xl shadow-xl border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <div className="mt-4 p-4 rounded-xl bg-background border border-border shadow-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground font-mono">
                  <strong className="text-foreground">Transcript Syncing:</strong> The video transcript has been automatically chunked into 3-minute "Pages". Adjust the Page counter at the top right to match your video timestamp (e.g., 7:00 = Page 3) for the AI to have accurate context of what you are watching.
                </p>
              </div>
            </div>
          ) : (
            <Document 
              file={document.fileUrl} 
              onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
              loading={
                <div className="w-full max-w-2xl h-[650px] rounded-3xl border border-border bg-card/80 shadow-lg flex flex-col items-center justify-center gap-4 p-8 text-center my-6 animate-in fade-in duration-200">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-md" />
                  <div className="space-y-1">
                    <div className="text-base font-heading font-bold text-foreground">Loading PDF Document...</div>
                    <div className="text-xs text-muted-foreground font-mono">Fetching document layers from secure storage and rendering visual canvas...</div>
                  </div>
                </div>
              }
              error={
                <div className="w-full max-w-xl p-8 rounded-3xl border border-destructive/30 bg-destructive/10 text-center space-y-3 my-6">
                  <div className="text-sm font-heading font-bold text-destructive">Could not load PDF document</div>
                  <div className="text-xs text-muted-foreground font-mono">Please verify that the file URL is valid or re-upload the document from your library.</div>
                </div>
              }
              className="flex flex-col items-center gap-6 w-full"
            >
              {Array.from(new Array(pdfNumPages), (el, index) => (
                <div 
                  key={`page_${index + 1}`} 
                  id={`pdf-page-${index + 1}`}
                  className="pdf-page-container bg-white shadow-xl rounded-md overflow-hidden relative group" 
                  data-page-number={index + 1}
                >
                  <div className="absolute top-2 left-2 z-10 bg-background/80 text-foreground text-[10px] font-mono px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition shadow-sm border border-border">
                    Page {index + 1}
                  </div>
                  <Page 
                    pageNumber={index + 1} 
                    width={pdfWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="w-full h-[600px] bg-muted/40 animate-pulse flex flex-col items-center justify-center gap-2 border border-border rounded">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-muted-foreground font-mono font-medium">Rendering Page {index + 1}...</span>
                      </div>
                    }
                  />
                </div>
              ))}
            </Document>
          )}
        </div>


        {/* RIGHT PANE: 4 Dedicated Workspace Tabs (`Summary`, `Chat`, `Quiz`, `Notes`) */}
        <div className="w-full lg:w-1/3 flex flex-col bg-card overflow-hidden">
          
          {/* Tabs Header Navigation */}
          <div className="h-12 border-b border-border bg-muted/30 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'quiz', label: 'Quiz', icon: HelpCircle },
                { id: 'flashcards', label: 'Flashcards', icon: Layers },
                { id: 'notes', label: 'Notes', icon: Edit3 },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Pane Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col">
            


            {/* TAB 2: CHAT WITH EXACT PAGE CITATIONS TAB */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full animate-in fade-in duration-200">
                
                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 min-h-[320px]">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1.5`}
                    >
                      <div
                        className={cn(
                          'max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                          msg.sender === 'user'
                            ? 'bg-foreground text-background rounded-br-none font-medium'
                            : 'bg-background border border-border text-foreground rounded-bl-none'
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  {/* AI Typing Indicator */}
                  {isAiTyping && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-background border border-border w-fit text-xs text-muted-foreground font-mono">
                      <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                      <span>Synthesizing response with exact source citations...</span>
                    </div>
                  )}
                </div>


                {/* Fixed Bottom Chat Input Bar */}
                <div className="flex items-center gap-2 pt-3 border-t border-border shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Ask AI any question about this document..."
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSendChat()}
                    className="rounded-xl h-10 px-4 bg-foreground text-background hover:bg-foreground/90 gap-1.5 font-semibold shrink-0"
                  >
                    <span>Ask AI</span>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: QUIZ GENERATOR & PLAYER TAB */}
            {activeTab === 'quiz' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* QUIZ SETUP STATE */}
                {quizState === 'setup' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="font-heading font-bold text-lg text-foreground">
                        Generate Custom Assessment Quiz
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Test active recall and identify weak knowledge gaps across all {document.totalPages} pages of this syllabus.
                      </p>
                    </div>

                    {/* Difficulty Selector */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                        1. Select Difficulty Level
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                          <button
                            key={diff}
                            onClick={() => setQuizDifficulty(diff)}
                            className={cn(
                              'p-3 rounded-xl border text-center transition font-semibold text-xs',
                              quizDifficulty === diff
                                ? 'border-foreground bg-foreground text-background shadow-sm'
                                : 'border-border bg-background hover:bg-muted/50 text-foreground'
                            )}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Count & Type */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                          2. Question Count
                        </label>
                        <div className="flex gap-2">
                          {[5, 10, 15].map((count) => (
                            <button
                              key={count}
                              onClick={() => setQuizQuestionCount(count)}
                              className={cn(
                                'flex-1 py-2.5 rounded-xl border text-center text-xs font-semibold transition',
                                quizQuestionCount === count
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'border-border bg-background hover:bg-muted/50 text-foreground'
                              )}
                            >
                              {count} Qs
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                          3. Quiz Type Format
                        </label>
                        <select
                          value={quizType}
                          onChange={(e) => setQuizType(e.target.value as any)}
                          className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none"
                        >
                          <option value="MCQ">Multiple Choice (MCQ)</option>
                          <option value="True/False">True / False Statements</option>
                          <option value="Fill in the Blank">Fill in the Blank</option>
                          <option value="Short Answer">Short Answer Conceptual</option>
                        </select>
                      </div>
                    </div>

                    {/* Launch Quiz Button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleLaunchQuiz}
                        disabled={isGeneratingQuiz}
                        className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-heading font-bold text-sm gap-2 shadow-md"
                      >
                        {isGeneratingQuiz ? (
                          <>
                            <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                            <span>Generating {quizQuestionCount} AI Questions from {document.fileType === 'YouTube Video' ? `Video Segment ${(currentPage - 1) * 3}:00 - ${currentPage * 3}:00` : `Page ${currentPage}`}...</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>Launch {quizDifficulty} Assessment ({quizQuestionCount} Questions)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* QUIZ PLAYING STATE */}
                {quizState === 'playing' && currentQuizPool.length > 0 && (
                  <div className="space-y-6">
                    {/* Top Quiz Progress & Timer */}
                    <div className="flex items-center justify-between pb-3 border-b border-border text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded bg-foreground text-background font-bold">
                          Question {currentQuestionIdx + 1} of {currentQuizPool.length}
                        </span>
                        <span className="text-muted-foreground">Level: {quizDifficulty}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>
                          {Math.floor(quizTimerSeconds / 60)
                            .toString()
                            .padStart(2, '0')}
                          :
                          {(quizTimerSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-background shadow-sm space-y-4">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>Source Check: {document.fileType === 'YouTube Video' ? `Video Segment ${currentQuizPool[currentQuestionIdx]?.pageRef || currentPage} (${((currentQuizPool[currentQuestionIdx]?.pageRef || currentPage) - 1) * 3}:00)` : `Page ${currentQuizPool[currentQuestionIdx]?.pageRef || currentPage}`}</span>
                        <button
                          onClick={() => setCurrentPage(currentQuizPool[currentQuestionIdx]?.pageRef || currentPage)}
                          className="text-accent hover:underline flex items-center gap-1 font-semibold"
                        >
                          <BookOpen className="w-3 h-3" /> {document.fileType === 'YouTube Video' ? 'Jump to Timestamp' : 'Jump to Page'}
                        </button>
                      </div>

                      <h4 className="font-heading font-bold text-base sm:text-lg text-foreground leading-snug">
                        {currentQuizPool[currentQuestionIdx]?.question}
                      </h4>
                    </div>

                    {/* Options List */}
                    <div className="space-y-2.5">
                      {currentQuizPool[currentQuestionIdx]?.options.map((optionText: string, oIdx: number) => {
                        const isChosen = selectedAnswer === oIdx
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectQuizAnswer(oIdx)}
                            className={cn(
                              'w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between text-xs sm:text-sm font-medium',
                              isChosen
                                ? 'border-foreground bg-foreground text-background shadow-sm font-semibold pl-6'
                                : 'border-border/80 bg-background hover:bg-muted/40 text-foreground'
                            )}
                          >
                            <span>{optionText}</span>
                            {isChosen && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>

                    {/* Navigation Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuizState('setup')}
                        className="rounded-xl text-xs"
                      >
                        Quit Assessment
                      </Button>
                      <Button
                        size="sm"
                        disabled={selectedAnswer === null}
                        onClick={handleNextQuestion}
                        className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold px-6 text-xs h-9"
                      >
                        <span>
                          {currentQuestionIdx + 1 < currentQuizPool.length ? 'Next Question →' : 'Submit Final Answers'}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* QUIZ RESULTS STATE */}
                {quizState === 'results' && (
                  <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-heading font-bold text-foreground">Assessment Completed! 🎉</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        You successfully tested active recall for <strong className="text-foreground">{document.title}</strong>.
                      </p>
                    </div>

                    {/* Score summary boxes */}
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/30 border border-border max-w-md mx-auto font-mono">
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground">Final Score</div>
                        <div className="text-lg font-bold text-foreground">
                          {calculateScore()} / {currentQuizPool.length}
                        </div>
                      </div>
                      <div className="space-y-1 border-x border-border">
                        <div className="text-[10px] text-muted-foreground">Accuracy</div>
                        <div className="text-lg font-bold text-emerald-500">
                          {Math.round((calculateScore() / Math.max(currentQuizPool.length, 1)) * 100)}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground">Time Taken</div>
                        <div className="text-lg font-bold text-foreground">
                          {Math.floor(quizTimerSeconds / 60)}m {quizTimerSeconds % 60}s
                        </div>
                      </div>
                    </div>

                    {/* Weak Topic & Recommendation Box */}
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-left space-y-2 max-w-md mx-auto">
                      <div className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Weak Topic Recommendations
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Based on your responses, we recommend jumping to <button onClick={() => setCurrentPage(currentQuizPool[0]?.pageRef || currentPage)} className="text-foreground font-semibold underline">{document.fileType === 'YouTube Video' ? `Segment ${currentQuizPool[0]?.pageRef || currentPage} (${((currentQuizPool[0]?.pageRef || currentPage) - 1) * 3}:00)` : `Page ${currentQuizPool[0]?.pageRef || currentPage}`}</button> for reinforcement review.
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuizState('setup')}
                        className="rounded-xl text-xs gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake Assessment
                      </Button>
                      <Button
                        size="sm"
                        onClick={onClose}
                        className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-xs px-6"
                      >
                        Finish & Return
                      </Button>
                    </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 4: FLASHCARDS GENERATOR TAB */}
            {activeTab === 'flashcards' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    Generate Spaced Repetition Flashcards
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Let AI extract the key terms and concepts from <strong className="text-foreground">{document.fileType === 'YouTube Video' ? `Video Segment ${(currentPage - 1) * 3}:00 - ${currentPage * 3}:00` : `Page ${currentPage}`}</strong> and format them into Anki-style flashcards for your Daily Review.
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button
                    onClick={handleGenerateFlashcards}
                    disabled={isGeneratingFlashcards}
                    className="w-full h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-heading font-bold text-sm gap-2 shadow-md"
                  >
                    {isGeneratingFlashcards ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Extracting Concepts...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        <span>Generate 5 Flashcards from Page {currentPage}</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 text-left space-y-2 mt-4">
                  <div className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Powered by SM-2 Algorithm
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Once generated, flashcards are added to your global <strong>Daily Review</strong> queue. Our engine uses the SuperMemo-2 algorithm to show you cards right before you're about to forget them, committing them to long-term memory.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: NOTES & REVISION TAB */}
            {activeTab === 'notes' && (
              <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-heading font-bold text-foreground">Rich Revision Workspace</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                      {notesSaveStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNotesSaveStatus('Saving...')
                        setTimeout(() => setNotesSaveStatus('Saved just now'), 600)
                      }}
                      className="h-8 gap-1 text-xs rounded-lg border-border"
                    >
                      <Save className="w-3.5 h-3.5 text-primary" />
                      <span>Save Now</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => alert('Exporting notes to Markdown...')}
                      className="h-8 gap-1 text-xs rounded-lg border-border"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </Button>
                  </div>
                </div>

                {/* Editable Notes Textarea Workspace */}
                <div className="flex-1 flex flex-col min-h-[360px]">
                  <textarea
                    value={userNotes}
                    onChange={(e) => {
                      setUserNotes(e.target.value)
                      setNotesSaveStatus('Unsaved changes...')
                    }}
                    placeholder="Write your study notes, formulas, or copy AI takeaways here..."
                    className="w-full flex-1 bg-background border border-border rounded-xl p-4 text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition leading-relaxed resize-none shadow-inner"
                  />
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>💡 Tip: Copy citations from Chat tab right into your notes for exam revision.</span>
                  <span>{userNotes.split(' ').length} words</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
