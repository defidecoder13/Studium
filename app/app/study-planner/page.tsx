'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Circle,
  Flag,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteWithUndo } from '@/components/ui/undo-toast'
import { cn } from '@/lib/utils'

interface StudyPlan {
  id: string
  title: string
  description: string | null
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  category: string | null
  completed: boolean
  completedAt: string | null
  createdAt: string
}

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  medium: { label: 'Medium', className: 'bg-primary/10 text-accent border-primary/20' },
  high: { label: 'High', className: 'bg-destructive/10 text-destructive border-destructive/20' },
}

const CATEGORIES = ['Exam', 'Assignment', 'Review', 'Project']

function formatDueDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dueLabel(dateStr: string): { text: string; overdue: boolean } {
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, overdue: true }
  if (diffDays === 0) return { text: 'Due today', overdue: false }
  if (diffDays === 1) return { text: 'Due tomorrow', overdue: false }
  return { text: `In ${diffDays} days`, overdue: false }
}

async function fetchPlansFromApi(): Promise<StudyPlan[]> {
  const res = await fetch('/api/study-plans')
  const data = await res.json()
  return data.success && Array.isArray(data.plans) ? (data.plans as StudyPlan[]) : []
}

export default function StudyPlannerPage() {
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [category, setCategory] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [planToDelete, setPlanToDelete] = useState<StudyPlan | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPlansFromApi()
      .then((plans) => {
        if (!cancelled) setPlans(plans)
      })
      .catch((e) => {
        if (!cancelled) console.error('Failed to fetch study plans:', e)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) return
    setIsSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueDate,
          priority,
          category,
        }),
      })
      const data = await res.json()
      if (data.success) {
        try {
          const updated = await fetchPlansFromApi()
          setPlans(updated)
        } catch {
          // List refresh is best-effort; the plan itself was created successfully.
        }
        setTitle('')
        setDescription('')
        setDueDate('')
        setPriority('medium')
        setCategory(null)
        setShowForm(false)
      } else {
        setFormError(data.error || 'Failed to create plan. Check your connection and try again.')
      }
    } catch {
      setFormError('Failed to create plan. Check your connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleComplete = async (plan: StudyPlan) => {
    try {
      await fetch('/api/study-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, completed: !plan.completed }),
      })
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id
            ? { ...p, completed: !plan.completed, completedAt: !plan.completed ? new Date().toISOString() : null }
            : p
        )
      )
    } catch (e) {
      console.error('Failed to toggle plan:', e)
    }
  }

  const handleDelete = (plan: StudyPlan) => {
    setPlanToDelete(plan)
  }

  const confirmDelete = () => {
    const plan = planToDelete
    if (!plan) return
    setPlanToDelete(null)
    const index = plans.findIndex((p) => p.id === plan.id)
    deleteWithUndo({
      remove: () => setPlans((prev) => prev.filter((p) => p.id !== plan.id)),
      restore: () =>
        setPlans((prev) => {
          const next = [...prev]
          next.splice(Math.min(Math.max(index, 0), next.length), 0, plan)
          return next
        }),
      commit: async () => {
        const res = await fetch(`/api/study-plans?id=${plan.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
      },
      title: 'Plan deleted',
      message: `"${plan.title}" will be removed for good.`,
    })
  }

  const stats = useMemo(() => {
    const total = plans.length
    const completed = plans.filter((p) => p.completed).length
    const pending = total - completed
    const overdue = plans.filter((p) => !p.completed && dueLabel(p.dueDate).overdue).length
    return { total, completed, pending, overdue }
  }, [plans])

  const sorted = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [plans])

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <CalendarClock className="w-8 h-8 text-accent" />
              <span>Study Planner</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-accent text-xs font-mono font-bold">
              {stats.pending} pending · {stats.overdue} overdue
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Plan exam prep, assignments, and review sessions. Track what&apos;s due and what&apos;s done.
          </p>
        </div>

        <Button
          onClick={() => setShowForm((v) => !v)}
          className="h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition flex items-center gap-2 text-xs"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? 'Close' : 'New Study Plan'}</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card space-y-1.5">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Plans</div>
          <div className="text-2xl font-heading font-bold text-foreground">{stats.total}</div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card space-y-1.5">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Pending</div>
          <div className="text-2xl font-heading font-bold text-accent">{stats.pending}</div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card space-y-1.5">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-heading font-bold text-emerald-700 dark:text-emerald-400">{stats.completed}</div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card space-y-1.5">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Overdue</div>
          <div className={cn('text-2xl font-heading font-bold', stats.overdue > 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {stats.overdue}
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-heading font-bold text-foreground">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Create a new study plan</span>
          </div>

          {formError && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs leading-relaxed text-foreground">
              {formError}
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Review Chapter 4 — Quantum Entanglement"
                  className="w-full h-10 rounded-lg bg-background border border-border px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider">Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 rounded-lg bg-background border border-border px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional notes, goals, or topics to cover..."
                className="w-full rounded-lg bg-background border border-border p-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5" /> Priority:
                </span>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-xs font-bold capitalize transition outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      priority === p
                        ? PRIORITY_LABELS[p].className + ' border'
                        : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider">Category:</span>
                <button
                  onClick={() => setCategory(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition',
                    category === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  General
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(category === c ? null : c)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-xs font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      category === c
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowForm(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || !dueDate || isSaving}
              className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs"
            >
              {isSaving ? 'Creating...' : 'Add Plan'}
            </Button>
          </div>
        </div>
      )}

      {/* Plan List */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="w-48 h-5 rounded bg-muted" />
              <div className="w-full h-4 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-12 md:p-16 rounded-xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 text-accent flex items-center justify-center">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-heading font-bold text-foreground">No study plans yet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Plan your exam prep, assignments, and review sessions. Click <strong className="text-foreground">New Study Plan</strong> to get started.
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="mt-2 h-10 px-6 bg-primary text-primary-foreground font-bold text-xs"
          >
            <Plus className="w-4 h-4" /> Create First Plan
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((plan) => {
            const due = dueLabel(plan.dueDate)
            const priorityStyle = PRIORITY_LABELS[plan.priority] || PRIORITY_LABELS.medium
            return (
              <div
                key={plan.id}
                className={cn(
                  'p-5 rounded-xl border bg-card transition-colors flex items-start gap-4',
                  plan.completed ? 'border-border/50 opacity-60' : 'border-border hover:border-primary/40',
                  !plan.completed && due.overdue && 'border-destructive/40'
                )}
              >
                <button
                  onClick={() => handleToggleComplete(plan)}
                  aria-label={plan.completed ? `Mark ${plan.title} as incomplete` : `Mark ${plan.title} as complete`}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600 transition outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full min-h-10 min-w-10 flex items-center justify-center"
                  title={plan.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {plan.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn('font-heading font-bold text-base text-foreground leading-snug', plan.completed && 'line-through')}>
                      {plan.title}
                    </h3>
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border', priorityStyle.className)}>
                      {priorityStyle.label}
                    </span>
                    {plan.category && (
                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-mono font-bold">
                        {plan.category}
                      </span>
                    )}
                  </div>

                  {plan.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Due {formatDueDate(plan.dueDate)}
                    </span>
                    {!plan.completed && (
                      <span className={cn('font-bold', due.overdue ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400')}>
                        {due.text}
                      </span>
                    )}
                    {plan.completed && plan.completedAt && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        Completed {new Date(plan.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(plan)}
                  className="min-h-10 min-w-10 p-0 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center"
                  title="Delete plan"
                  aria-label={`Delete plan ${plan.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete-plan confirmation with scope summary + Undo window */}
      <ConfirmDialog
        open={planToDelete !== null}
        title="Delete this plan?"
        body={
          planToDelete && (
            <span>
              <strong className="text-foreground">{planToDelete.title}</strong>
              <span className="font-mono text-[11px]"> · due {formatDueDate(planToDelete.dueDate)}</span>
              <br />
              Its schedule and completion history go with it. This can&apos;t be undone after the Undo window closes.
            </span>
          )
        }
        confirmLabel="Delete plan"
        onConfirm={confirmDelete}
        onClose={() => setPlanToDelete(null)}
      />
    </div>
  )
}
