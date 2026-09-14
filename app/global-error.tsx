'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground antialiased">
        <h2 className="text-2xl font-semibold tracking-tight">Critical error</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">{error.message || 'Application failed to load.'}</p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-lg bg-foreground text-background h-9 px-4 text-sm font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
