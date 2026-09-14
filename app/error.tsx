'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  useEffect(() => {
    console.error('[app/error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-semibold tracking-tight">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || 'An unexpected error occurred. Your work is safe — try again.'}
        </p>
        {error.digest && <p className="text-xs font-mono text-muted-foreground">Digest: {error.digest}</p>}
      </div>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="rounded-lg">Try again</Button>
        <Button variant="outline" onClick={() => router.push('/')} className="rounded-lg">
          Go home
        </Button>
      </div>
    </div>
  )
}
