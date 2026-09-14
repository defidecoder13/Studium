export default function AppLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-72 rounded bg-muted/60" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border bg-card" />
    </div>
  )
}
