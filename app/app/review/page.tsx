'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Layers, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DueFlashcard {
  id: string
  front: string
  back: string
  pageRef?: number | null
  nextReviewDate: string
  deck?: {
    name: string
    document?: { fileType: string } | null
  } | null
}

function DailyReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deckId = searchParams?.get('deckId')

  const [cards, setCards] = useState<DueFlashcard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Reset to loading state when the target deck changes without a remount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    const url = deckId ? `/api/flashcards/due?deckId=${deckId}` : '/api/flashcards/due'
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.cards) {
          setCards(data.cards)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [deckId])

  const handleRate = async (rating: 'again' | 'hard' | 'medium' | 'easy') => {
    setIsSubmitting(true)
    const currentCard = cards[currentIndex]
    
    try {
      await fetch(`/api/flashcards/${currentCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      })
      
      setIsFlipped(false)
      setCurrentIndex((prev) => prev + 1)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-3xl font-heading font-bold text-foreground">You&apos;re all caught up!</h2>
          <p className="text-muted-foreground">
            You&apos;ve reviewed all your due flashcards for today. The SuperMemo-2 algorithm will schedule your next reviews to maximize long-term retention.
          </p>
        </div>
        <Button onClick={() => router.push('/app/dashboard')} className="h-12 px-8 rounded-xl font-bold bg-primary text-primary-foreground">
          Return to Dashboard
        </Button>
      </div>
    )
  }

  const card = cards[currentIndex]

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20">
      <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/app/dashboard')} className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 font-heading font-bold text-lg">
            <Layers className="w-5 h-5 text-accent" />
            <span>Daily Review</span>
          </div>
        </div>
        <div className="text-sm font-mono text-muted-foreground">
          Card {currentIndex + 1} of {cards.length}
        </div>
      </header>

      {/* Session progress */}
      <div className="h-1 bg-muted/40 shrink-0">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / Math.max(cards.length, 1)) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-2xl flex flex-col items-center gap-8">
          
          {/* Flashcard */}
          <div 
            className="w-full aspect-[4/3] sm:aspect-[16/9] cursor-pointer group"
            style={{ perspective: '1000px' }}
            onClick={() => !isFlipped && setIsFlipped(true)}
          >
            <div 
              className="relative w-full h-full transition-all duration-500 shadow-xl rounded-3xl"
              style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)' }}
            >
              
              {/* FRONT */}
              <div 
                className="absolute inset-0 bg-background border border-border rounded-3xl p-8 sm:p-12 flex flex-col justify-center items-center text-center overflow-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="absolute top-6 left-6 text-xs font-mono text-accent/80 uppercase tracking-widest">
                  {card.deck?.name || 'Flashcard'}
                </span>
                <h3 className="text-2xl sm:text-4xl font-heading font-bold text-foreground leading-tight">
                  {card.front}
                </h3>
                {!isFlipped && (
                  <div className="absolute bottom-6 inset-x-0 flex justify-center opacity-50 group-hover:opacity-100 transition">
                    <span className="text-xs bg-muted px-3 py-1.5 rounded-full font-mono text-muted-foreground">Click to flip</span>
                  </div>
                )}
              </div>

              {/* BACK */}
              <div 
                className="absolute inset-0 bg-secondary/40 border border-border rounded-3xl p-8 sm:p-12 flex flex-col justify-center items-center text-center overflow-hidden"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
              >
                <span className="absolute top-6 left-6 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Answer
                </span>
                <p className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed">
                  {card.back}
                </p>
                {card.pageRef && (
                  <div className="absolute bottom-6 right-6 text-xs font-mono text-muted-foreground/50">
                    Source: {card.deck?.document?.fileType === 'YouTube Video' 
                      ? `Segment ${card.pageRef} (${(card.pageRef - 1) * 3}:00 - ${card.pageRef * 3}:00)` 
                      : `Page ${card.pageRef}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className={`w-full flex items-center justify-center transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
              <Button 
                onClick={() => handleRate('again')} 
                disabled={isSubmitting}
                className="h-14 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-2xl border-b-4 border-foreground/20 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span>Again</span>
                <span className="text-[10px] opacity-70 font-mono font-normal">&lt;10m</span>
              </Button>
              <Button 
                onClick={() => handleRate('hard')} 
                disabled={isSubmitting}
                className="h-14 bg-destructive/10 hover:bg-destructive/15 text-destructive font-bold rounded-2xl border-b-4 border-destructive/40 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span>Hard</span>
                <span className="text-[10px] opacity-70 font-mono font-normal">1d</span>
              </Button>
              <Button 
                onClick={() => handleRate('medium')} 
                disabled={isSubmitting}
                className="h-14 bg-primary/10 hover:bg-primary/15 text-primary font-bold rounded-2xl border-b-4 border-primary/40 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span>Good</span>
                <span className="text-[10px] opacity-70 font-mono font-normal">~3d</span>
              </Button>
              <Button 
                onClick={() => handleRate('easy')} 
                disabled={isSubmitting}
                className="h-14 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl border-b-4 border-emerald-500/40 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span>Easy</span>
                <span className="text-[10px] opacity-70 font-mono font-normal">~4d+</span>
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default function DailyReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-8 min-h-screen bg-muted/20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DailyReviewContent />
    </Suspense>
  )
}
