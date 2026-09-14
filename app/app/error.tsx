'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  useEffect(() => {
    console.error('[app/app/error]', error)
  }, [error])
  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto flex flex-col gap-4 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Workspace error</h2>
      <p className="text-sm text-muted-foreground">{error.message || 'Could not load this workspace view.'}</p>
      <div className="flex gap-3 justify-center pt-2">
        <Button onClick={() => reset()} className="rounded-lg">Retry</Button>
        <Button variant="outline" onClick={() => router.push('/app/dashboard')} className="rounded-lg">
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}
