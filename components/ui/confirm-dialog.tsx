'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Scope summary: what exactly will be destroyed. */
  body: React.ReactNode
  confirmLabel?: string
  tone?: 'destructive' | 'primary'
  /** When set, the user must type this exact text to enable confirm. */
  requireText?: string
  busy?: boolean
  busyLabel?: string
  onConfirm: () => void
  onClose: () => void
}

/**
 * Inline destructive confirmation. Replaces native confirm().
 * Safe default: Cancel is autofocused, Escape and backdrop close (unless busy).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  tone = 'destructive',
  requireText,
  busy = false,
  busyLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  // Reset the type-to-confirm draft on open. This is the documented
  // render-time state adjustment pattern, not an effect cascade.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setTyped('')
  }

  useEffect(() => {
    if (!open) return
    // Safe default: focus Cancel, not the destructive action.
    const panel = document.querySelector<HTMLElement>('[data-confirm-panel]')
    panel?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
      // Minimal focus trap: cycle Tab within the panel.
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, busy, onClose])

  if (!open) return null

  const confirmed = !requireText || typed.trim() === requireText

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        data-confirm-panel
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-accent'
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <h2 className="font-heading font-bold text-base text-foreground leading-snug">{title}</h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{body}</div>
          </div>
        </div>

        {requireText && (
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-dialog-typed"
              className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider"
            >
              Type <span className="px-1.5 py-0.5 rounded bg-muted border border-border">{requireText}</span> to confirm
            </label>
            <input
              id="confirm-dialog-typed"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              autoComplete="off"
              disabled={busy}
              className="w-full h-10 rounded-lg bg-background border border-border px-3.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary transition"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            data-autofocus
            variant="outline"
            onClick={onClose}
            disabled={busy}
            className="h-10 px-5 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!confirmed || busy}
            className={cn(
              'h-10 px-5 text-xs font-bold gap-2',
              tone === 'destructive'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {busy && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {busy ? busyLabel || 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
