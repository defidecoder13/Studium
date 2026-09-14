'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BrainCircuit,
  Trophy,
  Clock,
  Search,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Filter,
  BookOpen,
  Video,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface QuizAttempt {
  id: string
  documentId: string
  documentTitle: string
  score: number
  totalQuestions: number
  accuracy: number
  difficulty: string
  quizType: string
  weakTopics?: string[] | null
  timeTakenSeconds: number
  completedAt: string
  document?: {
    title: string
    fileType: string
    folder?: string
  }
}

async function fetchQuizHistoryFromApi(): Promise<QuizAttempt[]> {
  const res = await fetch('/api/quizzes/history')
  const data = await res.json()
  if (data.quizzes && Array.isArray(data.quizzes)) return data.quizzes as QuizAttempt[]
  return []
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'Easy' | 'Medium' | 'Hard'>('ALL')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchQuizHistoryFromApi()
      .then((fetched) => {
        if (!cancelled) setQuizzes(fetched)
      })
      .catch((e) => {
        if (!cancelled) console.error('Failed to fetch quizzes:', e)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this quiz record?')) return
    
    setDeletingId(id)
    try {
      await fetch(`/api/quizzes/history?id=${id}`, { method: 'DELETE' })
      setQuizzes(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      console.error('Failed to delete attempt:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = q.documentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.weakTopics && q.weakTopics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    const matchesDiff = difficultyFilter === 'ALL' || q.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
    return matchesSearch && matchesDiff
  })

  // Summary stats
  const totalAttempts = quizzes.length
  const avgAccuracy = totalAttempts > 0 
    ? Math.round(quizzes.reduce((acc, q) => acc + q.accuracy, 0) / totalAttempts) 
    : 0
  
  // Aggregate weak topics
  const allWeakTopics = quizzes
    .flatMap(q => Array.isArray(q.weakTopics) ? q.weakTopics : [])
    .filter(Boolean)
  const topicCounts: Record<string, number> = {}
  allWeakTopics.forEach(t => {
    topicCounts[t] = (topicCounts[t] || 0) + 1
  })
  const topWeakTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <BrainCircuit className="w-8 h-8 text-primary" />
              <span>Quiz History & Assessment Logs</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Review your past exam scores, track progression over time, and target recurring weak concepts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/library">
            <Button className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 transition flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Take New Quiz</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Average Accuracy</div>
            <div className="text-2xl font-heading font-bold text-foreground mt-0.5">
              {avgAccuracy}%
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Quizzes Taken</div>
            <div className="text-2xl font-heading font-bold text-foreground mt-0.5">{totalAttempts}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Identified Weak Topics</div>
            <div className="text-2xl font-heading font-bold text-primary mt-0.5">
              {Object.keys(topicCounts).length} <span className="text-xs font-normal text-muted-foreground font-sans">topics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weak Topics Quick Callout Banner */}
      {topWeakTopics.length > 0 && (
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/[0.04] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Recommended Priority Revision: Top Weak Topics</span>
            </div>
            <Link href="/app/flashcards">
              <span className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                Generate Flashcards for Weak Spots &rarr;
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {topWeakTopics.map(([topic, count]) => (
              <span 
                key={topic}
                className="px-3 py-1 rounded-lg bg-background/80 dark:bg-card border border-primary/20 text-foreground text-xs font-medium shadow-sm flex items-center gap-1.5"
              >
                <span>{topic}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-mono font-bold">
                  Missed {count}x
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search quizzes or topics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Difficulty:</span>
          </span>
          {(['ALL', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${difficultyFilter === diff ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Quiz List Area */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-48 h-5 rounded bg-muted" />
                <div className="w-20 h-5 rounded bg-muted" />
              </div>
              <div className="w-full h-12 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="p-12 md:p-16 rounded-3xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-heading font-bold text-foreground">No quiz attempts found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You haven&apos;t completed any quizzes matching this filter yet. Open any document or YouTube video in your Library and click the <strong className="text-foreground">Quiz</strong> tab to test your mastery!
            </p>
          </div>
          <Link href="/app/library">
            <Button className="mt-2 h-10 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm">
              Go To Library
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuizzes.map(quiz => {
            const isVideo = quiz.document?.fileType === 'YouTube Video'
            const accuracyColor = quiz.accuracy >= 80 
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
              : quiz.accuracy >= 60 
              ? 'text-primary bg-primary/10 border-primary/20' 
              : 'text-destructive bg-destructive/10 border-destructive/20'
            const accuracyBar = quiz.accuracy >= 80 ? 'bg-emerald-500' : quiz.accuracy >= 60 ? 'bg-primary' : 'bg-destructive'

            return (
              <div
                key={quiz.id}
                className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="space-y-3 flex-1">
                  
                  {/* Top Metadata row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-mono font-bold flex items-center gap-1.5">
                      {isVideo ? <Video className="w-3 h-3 text-destructive" /> : <BookOpen className="w-3 h-3 text-primary" />}
                      <span>{quiz.documentTitle}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-muted/60 text-foreground text-[10px] font-mono font-bold">
                      {quiz.difficulty} Difficulty
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-muted/60 text-foreground text-[10px] font-mono font-bold">
                      {quiz.quizType}
                    </span>

                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto md:ml-2 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>
                        {quiz.completedAt ? formatDistanceToNow(new Date(quiz.completedAt), { addSuffix: true }) : 'Recently'}
                      </span>
                    </span>
                  </div>

                  {/* Title & Score summary */}
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    <div className="space-y-0.5">
                      <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        Score: {quiz.score} / {quiz.totalQuestions} Questions Correct
                      </h3>
                      {quiz.timeTakenSeconds > 0 && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Completed in {Math.round(quiz.timeTakenSeconds / 60)}m {quiz.timeTakenSeconds % 60}s
                        </p>
                      )}
                    </div>

                    <span className={`px-3 py-1 rounded-xl border font-mono font-bold text-sm shrink-0 ${accuracyColor}`}>
                      {quiz.accuracy}%
                    </span>
                  </div>

                  {/* Accuracy progress bar */}
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${accuracyBar}`}
                      style={{ width: `${Math.min(100, quiz.accuracy)}%` }}
                    />
                  </div>

                  {/* Weak topics list */}
                  {Array.isArray(quiz.weakTopics) && quiz.weakTopics.length > 0 && (
                    <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-primary" />
                        <span>Missed Concepts:</span>
                      </span>
                      {quiz.weakTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium border border-primary/20"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                  <button
                    onClick={e => handleDelete(quiz.id, e)}
                    disabled={deletingId === quiz.id}
                    className="w-9 h-9 rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground flex items-center justify-center transition"
                    title="Delete Quiz Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {quiz.documentId && (
                    <Link href={`/app/reader/${quiz.documentId}`}>
                      <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center gap-1.5">
                        <span>Review Document</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
