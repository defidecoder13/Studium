'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Layers,
  FileText,
  Clock,
  Search,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  BookOpen,
  Video
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Flashcard {
  id: string
  front: string
  back: string
  pageRef?: number
  nextReviewDate: string
  interval: number
  easeFactor: number
  repetitionCount: number
}

interface FlashcardDeck {
  id: string
  name: string
  documentId: string
  createdAt: string
  document: {
    id: string
    title: string
    fileType: string
    folder?: string
  }
  cards: Flashcard[]
}

interface DeckStats {
  totalDecks: number
  totalCards: number
  dueCardsCount: number
}

const EMPTY_STATS: DeckStats = { totalDecks: 0, totalCards: 0, dueCardsCount: 0 }

async function fetchDecksFromApi(): Promise<{ decks: FlashcardDeck[]; stats: DeckStats }> {
  const res = await fetch('/api/flashcards')
  const data = await res.json()
  if (data.success && data.decks) {
    return { decks: data.decks, stats: data.stats || EMPTY_STATS }
  }
  return { decks: [], stats: EMPTY_STATS }
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [stats, setStats] = useState<DeckStats>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDecksFromApi()
      .then(({ decks: fetchedDecks, stats: fetchedStats }) => {
        if (!cancelled) {
          setDecks(fetchedDecks)
          setStats(fetchedStats)
        }
      })
      .catch((e) => {
        if (!cancelled) console.error('Failed to load decks:', e)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this flashcard deck and all its cards?')) return
    
    setDeletingId(deckId)
    try {
      await fetch(`/api/flashcards?deckId=${deckId}`, { method: 'DELETE' })
      setDecks(prev => prev.filter(d => d.id !== deckId))
      setStats(prev => ({
        ...prev,
        totalDecks: Math.max(0, prev.totalDecks - 1),
        totalCards: Math.max(0, prev.totalCards - (decks.find(d => d.id === deckId)?.cards.length || 0))
      }))
    } catch (err) {
      console.error('Failed to delete deck:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCard = async (cardId: string, deckId: string) => {
    try {
      await fetch(`/api/flashcards?cardId=${cardId}`, { method: 'DELETE' })
      setDecks(prev => prev.map(d => {
        if (d.id !== deckId) return d
        return {
          ...d,
          cards: d.cards.filter(c => c.id !== cardId)
        }
      }))
      setStats(prev => ({
        ...prev,
        totalCards: Math.max(0, prev.totalCards - 1)
      }))
    } catch (err) {
      console.error('Failed to delete card:', err)
    }
  }

  const filteredDecks = decks.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.document?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cards.some(c => c.front.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
              Spaced Repetition Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold">
              SM-2 Active Recall
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your AI-generated flashcard decks, inspect individual cards, and master difficult concepts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/review">
            <Button className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 transition flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Start Daily Review ({stats.dueCardsCount} Due)</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Decks</div>
            <div className="text-2xl font-heading font-bold text-foreground mt-0.5">{stats.totalDecks}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Active Flashcards</div>
            <div className="text-2xl font-heading font-bold text-foreground mt-0.5">{stats.totalCards}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Due For Review</div>
            <div className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.dueCardsCount} <span className="text-xs font-normal text-muted-foreground font-sans">cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search decks or terms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Content Area */}
      {isLoading && decks.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="w-32 h-4 rounded bg-muted" />
                <div className="w-16 h-4 rounded bg-muted" />
              </div>
              <div className="w-3/4 h-6 rounded bg-muted" />
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="w-24 h-8 rounded-lg bg-muted" />
                <div className="w-20 h-8 rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="p-12 md:p-16 rounded-3xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-heading font-bold text-foreground">No flashcard decks found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You haven&apos;t generated any flashcards matching your criteria yet. Open any document or YouTube video in your Library and click the <strong className="text-foreground">Flashcards</strong> tab in the AI panel to instantly generate Anki decks!
            </p>
          </div>
          <Link href="/app/library">
            <Button className="mt-2 h-10 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm">
              Explore Library
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map(deck => {
              const dueCount = deck.cards.filter(c => new Date(c.nextReviewDate) <= new Date()).length
              const isVideo = deck.document?.fileType === 'YouTube Video'

              return (
                <div 
                  key={deck.id}
                  className="rounded-2xl border border-border bg-card hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 shadow-sm flex flex-col justify-between overflow-hidden group"
                >
                  {/* Accent spine */}
                  <div className="h-1 bg-primary/40" />
                  <div className="p-6 space-y-4">
                    
                    {/* Badge & Trash */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-mono font-bold flex items-center gap-1.5 truncate">
                        {isVideo ? <Video className="w-3 h-3 text-destructive shrink-0" /> : <BookOpen className="w-3 h-3 text-primary shrink-0" />}
                        <span className="truncate">{deck.document?.title || 'Study Material'}</span>
                      </span>
                      <button
                        onClick={e => handleDeleteDeck(deck.id, e)}
                        disabled={deletingId === deck.id}
                        className="w-7 h-7 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition shrink-0"
                        title="Delete deck"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <h3 className="font-heading font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                        {deck.name}
                      </h3>
                      <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                        <span>{deck.cards.length} Cards</span>
                        <span>•</span>
                        <span className={dueCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>
                          {dueCount} Due Today
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Actions Bar */}
                  <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
                    <button
                      onClick={() => setExpandedDeckId(expandedDeckId === deck.id ? null : deck.id)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
                    >
                      <span>{expandedDeckId === deck.id ? 'Hide Cards' : 'Inspect Cards'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedDeckId === deck.id ? 'rotate-180' : ''}`} />
                    </button>

                    <Link href={`/app/review?deckId=${deck.id}`}>
                      <Button size="sm" className="h-8 px-3.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition">
                        <span>Study Deck</span>
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  {/* Expanded Cards View Inside Card */}
                  {expandedDeckId === deck.id && (
                    <div className="px-6 py-4 bg-muted/30 border-t border-border space-y-3 max-h-80 overflow-y-auto divide-y divide-border/60">
                      {deck.cards.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground font-mono">No cards in this deck.</div>
                      ) : (
                        deck.cards.map((card, idx) => (
                          <div key={card.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-heading font-bold text-foreground leading-snug flex-1">
                                {idx + 1}. {card.front}
                              </span>
                              <button
                                onClick={() => handleDeleteCard(card.id, deck.id)}
                                className="text-muted-foreground hover:text-destructive transition p-0.5 shrink-0"
                                title="Delete card"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-muted-foreground bg-muted/40 border border-border/60 p-2 rounded-md font-sans">
                              {card.back}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                              {card.pageRef && (
                                <span>Source: {isVideo ? `Seg ${card.pageRef}` : `Page ${card.pageRef}`}</span>
                              )}
                              <span>Interval: {card.interval}d</span>
                              <span>Ease: {card.easeFactor.toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
