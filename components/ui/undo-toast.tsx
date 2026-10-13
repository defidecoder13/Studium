'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { AlertTriangle, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UndoToastInput {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  /** Fires when the toast expires or is dismissed without undoing. */
  onExpire?: () => void
  tone?: 'default' | 'error'
  duration?: number
}

interface ActiveToast extends UndoToastInput {
  id: number
  duration: number
}

const DEFAULT_DURATION = 6000
const MAX_VISIBLE = 3

let nextId = 1
let active: ActiveToast[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function pushToast(input: UndoToastInput): number {
  const id = nextId++
  active = [...active.slice(-(MAX_VISIBLE - 1)), { ...input, id, duration: input.duration ?? DEFAULT_DURATION }]
  emit()
  return id
}

export function dismissToast(id: number) {
  active = active.filter((t) => t.id !== id)
  emit()
}

/**
 * Gmail-style delayed delete. The item leaves the list immediately and can be
 * restored with Undo; only when the toast expires does `commit` fire.
 * Fail-safe: if the host unmounts (navigation) before expiry, timers clear
 * and the delete is abandoned — nothing is destroyed.
 * On commit failure the item is restored and an error toast is shown.
 */
export function deleteWithUndo(opts: {
  remove: () => void
  restore: () => void
  commit: () => Promise<void> | void
  title: string
  message?: string
  duration?: number
}): void {
  const { remove, restore, commit, title, message, duration } = opts
  remove()
  pushToast({
    title,
    message,
    actionLabel: 'Undo',
    duration,
    onAction: () => restore(),
    onExpire: async () => {
      try {
        await commit()
      } catch {
        restore()
        pushToast({
          tone: 'error',
          title: 'Delete failed',
          message: 'Your item was restored. Check your connection and try again.',
        })
      }
    },
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return active
}

function ToastCard({ toast }: { toast: ActiveToast }) {
  const settled = useRef(false)
  // Latest callbacks without re-subscribing the timer.
  const cbRef = useRef({ onAction: toast.onAction, onExpire: toast.onExpire, id: toast.id })
  useEffect(() => {
    cbRef.current = { onAction: toast.onAction, onExpire: toast.onExpire, id: toast.id }
  })

  const settle = (undo: boolean) => {
    if (settled.current) return
    settled.current = true
    const cb = cbRef.current
    dismissToast(cb.id)
    if (undo) cb.onAction?.()
    else cb.onExpire?.()
  }

  useEffect(() => {
    const timer = setTimeout(() => settle(false), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration])

  return (
    <div
      role="status"
      className="relative overflow-hidden w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 motion-reduce:animate-none"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            toast.tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-accent'
          )}
        >
          {toast.tone === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Undo2 className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
          <div className="text-xs font-bold text-foreground">{toast.title}</div>
          {toast.message && (
            <div className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{toast.message}</div>
          )}
        </div>
        {toast.actionLabel && (
          <button
            onClick={() => settle(true)}
            className="h-10 px-4 rounded-lg border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          onClick={() => settle(false)}
          aria-label="Dismiss"
          className="min-h-10 min-w-10 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <span
        aria-hidden
        className="toast-progress absolute bottom-0 left-0 h-0.5 w-full bg-primary/60 motion-reduce:hidden"
        style={{ animationDuration: `${toast.duration}ms` }}
      />
    </div>
  )
}

export function UndoToastHost() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}
