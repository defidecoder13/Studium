export default function ReaderLoading() {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-full lg:w-2/3 border-r border-border bg-muted flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-semibold text-foreground">Loading document workspace…</div>
        <div className="text-xs text-muted-foreground font-mono">Fetching pages and AI context</div>
      </div>
      <div className="hidden lg:flex w-1/3 flex-col gap-3 p-6">
        <div className="h-10 rounded-xl bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-24 rounded-xl bg-muted/60 animate-pulse" />
      </div>
    </div>
  )
}
