export default function LibraryLoading() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="space-y-1">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted/60 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3 animate-pulse">
            <div className="w-11 h-11 rounded-xl bg-muted" />
            <div className="w-3/4 h-4 rounded bg-muted" />
            <div className="w-1/2 h-3 rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  )
}
