export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 animate-in fade-in">
      <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      <p className="text-sm font-mono text-muted-foreground">Loading Studium…</p>
    </div>
  )
}
