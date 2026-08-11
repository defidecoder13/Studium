'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  TrendingUp,
  BrainCircuit,
  Trophy,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
  ChevronRight,
  BookOpen,
  Layers,
  CheckCircle2,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface AnalyticsData {
  stats: {
    totalDocuments: number
    totalFlashcards: number
    totalQuizzesTaken: number
    avgAccuracy: number
    totalQuestionsAnswered: number
    studyTimeHours: string
  }
  subjectBreakdown: Array<{
    subject: string
    count: number
    percentage: number
  }>
  topWeakTopics: Array<{
    topic: string
    count: number
    lastMissedAt: string
    documentTitle: string
  }>
  recentActivity: Array<{
    id: string
    type: 'read' | 'quiz' | 'upload'
    title: string
    detail: string
    timestamp: string
  }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData)
        }
      })
      .catch(e => console.error('Failed to load analytics:', e))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-pulse">
        <div className="w-64 h-8 rounded bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-card border border-border p-5 space-y-2">
              <div className="w-24 h-4 rounded bg-muted" />
              <div className="w-16 h-8 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-card border border-border" />
      </div>
    )
  }

  const stats = data?.stats || {
    totalDocuments: 0,
    totalFlashcards: 0,
    totalQuizzesTaken: 0,
    avgAccuracy: 0,
    totalQuestionsAnswered: 0,
    studyTimeHours: '0.0'
  }
  const weakTopics = data?.topWeakTopics || []
  const subjects = data?.subjectBreakdown || []
  const activity = data?.recentActivity || []

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-8 h-8 text-primary" />
              <span>Learning & Weak Topic Analytics</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold">
              AI Diagnostic Matrix
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Analyze your quiz performance trends, diagnose recurring weak spots, and inspect mastery metrics across courses.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/quizzes">
            <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold border-border shadow-sm">
              All Quiz Attempts
            </Button>
          </Link>
          <Link href="/app/flashcards">
            <Button className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 transition flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Study Weak Topics</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Average Quiz Score</span>
            <Trophy className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-bold text-foreground">{stats.avgAccuracy}%</span>
            <span className="text-xs text-muted-foreground font-mono">({stats.totalQuestionsAnswered} Qs)</span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, stats.avgAccuracy)}%` }} 
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Completed Quizzes</span>
            <BrainCircuit className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-heading font-bold text-foreground">{stats.totalQuizzesTaken}</div>
          <div className="text-xs text-muted-foreground">
            Assessments taken across your library
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Active Flashcards</span>
            <Layers className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-heading font-bold text-foreground">{stats.totalFlashcards}</div>
          <div className="text-xs text-muted-foreground">
            Spaced repetition SM-2 recall cards
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Study Time</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-heading font-bold text-foreground">{stats.studyTimeHours}</span>
            <span className="text-sm font-medium text-muted-foreground">hrs</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Active reading & practice session logs
          </div>
        </div>

      </div>

      {/* Main Diagnostic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Priority Weak Concept Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-heading font-bold text-foreground">Priority Diagnostic: Weak Concepts Matrix</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Ranked by miss frequency</span>
          </div>

          {weakTopics.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No weak concepts detected!</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                You have maintained high mastery across your recent quizzes or haven't missed any targeted topic questions yet. Keep up the excellent work!
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border/60">
              {weakTopics.map((item, idx) => (
                <div key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-heading font-bold text-base text-foreground leading-snug">
                        {item.topic}
                      </h4>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 pl-7">
                      <span>Source: {item.documentTitle}</span>
                      <span>•</span>
                      <span>Last missed: {item.lastMissedAt ? formatDistanceToNow(new Date(item.lastMissedAt), { addSuffix: true }) : 'Recently'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-7 sm:pl-0">
                    <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20 font-mono">
                      Missed {item.count}x
                    </span>
                    <Link href="/app/flashcards">
                      <Button size="sm" className="h-8 px-3 rounded-lg bg-foreground text-background text-xs font-bold hover:bg-primary hover:text-primary-foreground transition">
                        <span>Review Topic</span>
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Subject Distribution & Recent Activity */}
        <div className="space-y-6">
          
          {/* Subject Distribution Card */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Library Subject Distribution</span>
            </h3>

            {subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">No documents categorized yet.</p>
            ) : (
              <div className="space-y-3">
                {subjects.map((sub, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{sub.subject}</span>
                      <span className="font-mono text-muted-foreground">{sub.count} items ({sub.percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${sub.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Timeline */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Recent Activity Logs</span>
            </h3>

            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3.5 divide-y divide-border/60">
                {activity.map((item, i) => (
                  <div key={i} className="pt-3.5 first:pt-0 space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground truncate max-w-[200px]">{item.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{item.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-sans">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
