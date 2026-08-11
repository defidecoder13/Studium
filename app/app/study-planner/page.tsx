export default function StudyPlannerPage() {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Study Planner</h1>
        <p className="text-sm text-muted-foreground">Manage your study schedule and goals.</p>
      </div>
      <div className="p-8 rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">No study plans created yet.</p>
      </div>
    </div>
  )
}
