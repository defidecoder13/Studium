import { UploadCloud, BookOpen, Search, ArrowUpRight } from 'lucide-react'

export function ModernFeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 md:mb-14">
          <div className="max-w-[44rem] space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-foreground" />
              <span className="text-[11px] font-mono tracking-[0.18em] text-muted-foreground">CAPABILITIES</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.03em] leading-[1.1] text-balance">
              Everything stays on the <em className="italic font-normal text-primary">page it came from.</em>
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
              No black-box summaries. Every answer cites its source page. Upload once, then read, quiz and recall without losing provenance.
            </p>
          </div>
          <div className="hidden lg:block text-xs font-mono text-muted-foreground">3 tools · one reader</div>
        </div>

        {/* Asymmetric editorial: large left, stacked right — NOT 3 identical cards */}
        <div className="grid lg:grid-cols-[1.65fr_0.95fr] gap-4 md:gap-5">
          {/* Primary — Document Reader */}
          <div className="rounded-xl border border-border bg-card p-7 md:p-8 flex flex-col min-h-[380px]">
            <div className="flex items-start justify-between gap-4">
              <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1">READER · CORE</span>
            </div>
            <h3 className="mt-6 text-xl md:text-2xl font-semibold tracking-tight">Document reader with page-anchored answers</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-[36rem]">
              Split view: your PDF on the left, chat / quiz / flashcards / notes on the right. Ask “what does Bell prove?” — get an answer with <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded border border-border text-foreground">[Page 12]</span> that opens the exact page.
            </p>

            {/* Figure — paper strip */}
            <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4 flex gap-4 overflow-hidden">
              <div className="hidden sm:block w-28 shrink-0 space-y-2">
                <div className="h-2 rounded-full bg-foreground/15 w-full" />
                <div className="h-2 rounded-full bg-foreground/10 w-[85%]" />
                <div className="h-2 rounded-full bg-foreground/10 w-[92%]" />
                <div className="mt-3 h-6 rounded border border-primary/20 bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-primary">[P.12]</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="text-xs font-semibold text-foreground">“Violation of Bell inequalities proves local realism fails.”</div>
                <div className="text-xs text-muted-foreground leading-relaxed">Answer cites page 12. Tap the pill to scroll the PDF. No hallucinations — if it’s not on a page, it’s not claimed.</div>
              </div>
            </div>

            <div className="mt-auto pt-6 flex items-center gap-2 text-xs font-mono tracking-wide text-muted-foreground">
              <span>PDF · YouTube · pasted text</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>Up to 1k pages per doc</span>
            </div>
          </div>

          {/* Stacked pair */}
          <div className="grid gap-4 md:gap-5 content-start">
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Search className="w-4.5 h-4.5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">Intelligent search</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Vector + keyword hybrid. “Bell” finds pages 12, 47 and your bookmark note — deduped, ranked.
              </p>
              <div className="mt-4 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <span className="px-2 py-1 rounded border border-border bg-muted">⌘ K</span>
                <span>to search library</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-foreground/5 text-foreground border border-border flex items-center justify-center">
                <UploadCloud className="w-4.5 h-4.5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">Upload once, keep structure</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                PDFs keep page breaks · YouTube caps become 3-minute pages · plain text auto-paginated.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                Drag & drop anywhere <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
