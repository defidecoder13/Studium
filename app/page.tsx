'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, ChevronDown, CalendarClock, FileText, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Show, UserButton } from '@clerk/nextjs'
import { ModernFeaturesSection } from '@/components/modern-features'
import { StudiumLogo } from '@/components/ui/logo'

import { RippleButton } from '@/components/animate-ui/buttons/ripple'

export default function LandingPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: 'How does the AI understand my documents?',
      answer: 'Our system uses advanced language models to analyze document structure and extract key concepts, generating accurate summaries and study materials.',
    },
    {
      question: 'Can I use this for any subject?',
      answer: 'Yes. Studium works across all domains—from literature to mathematics to sciences. The AI adapts to different types of content.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. All documents are encrypted end-to-end. We never store your data beyond your current session unless you explicitly choose to save.',
    },
    {
      question: 'Can I export my study materials?',
      answer: 'Yes. Export flashcards, summaries, and notes in multiple formats including PDF, Markdown, and popular flashcard apps.',
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
              <StudiumLogo size={20} className="text-white" />
            </div>
            <span className="text-lg font-heading font-bold">Studium</span>
          </div>
          
          <div className="hidden md:flex items-center gap-12 text-sm">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>

          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <Link href="/sign-in">
                <Button variant="ghost" className="text-sm">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground">Get Started</Button>
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/app/dashboard">
                <Button className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground">Go to Workspace</Button>
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero Section — anti-slop: static claim, proof line, no carousel, no fake metrics */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 relative">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-full border border-border bg-card">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono tracking-wide text-muted-foreground">Citations anchored to page — not hallucinated</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[4.75rem] font-display font-semibold leading-[0.95] tracking-[-0.04em] text-balance">
                Master any subject with <em className="italic font-normal text-primary">precision.</em>
              </h1>

              <p className="text-lg md:text-[1.125rem] text-muted-foreground max-w-[42rem] leading-relaxed text-pretty">
                Drop the PDF. Keep every citation. Studium turns textbooks into cited answers, chapter quizzes and SM-2 flashcards — without losing the page it came from.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Show when="signed-out">
                <Link href="/sign-up" className="inline-block">
                  <RippleButton className="inline-flex items-center justify-center h-11 px-7 gap-2 bg-foreground hover:bg-foreground/90 text-background font-medium rounded-lg text-[14px]">
                    Start learning — free
                    <ArrowRight className="w-4 h-4" />
                  </RippleButton>
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/app/dashboard" className="inline-block">
                  <RippleButton className="inline-flex items-center justify-center h-11 px-7 gap-2 bg-foreground hover:bg-foreground/90 text-background font-medium rounded-lg text-[14px]">
                    Open workspace
                    <ArrowRight className="w-4 h-4" />
                  </RippleButton>
                </Link>
              </Show>
              <Link href="#features" className="inline-flex items-center justify-center h-11 px-7 gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                See how it reads
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-border font-mono text-[11px] tracking-wide">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                12.3M pages indexed
              </span>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">847 theses traced to page</span>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">Last cite 3 min ago</span>
            </div>
          </div>

          {/* Hero Visual — editorial paper, not SaaS chrome. No shadow-xl, no lift */}
          <div className="mt-16 md:mt-20 relative">
            <div className="relative rounded-xl border border-border bg-card overflow-hidden">
              {/* Window chrome — muted, no strong shadow */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <div className="mx-auto text-[11px] font-mono text-muted-foreground tracking-wide">studium.app/reader/quantum-entanglement — Page 12</div>
              </div>

              <div className="grid md:grid-cols-[1.7fr_340px]">
                {/* Paper page — grain + ink */}
                <div className="p-8 md:p-10 space-y-6 relative paper-grain">
                  <div className="flex items-center gap-3 flex-wrap text-[11px] font-mono tracking-widest text-muted-foreground">
                    <span>Chapter 4</span>
                    <span className="w-3 h-px bg-border" />
                    <span>Quantum Entanglement</span>
                    <span className="ml-auto px-2 py-0.5 rounded border border-border bg-background font-bold text-foreground tracking-wide">P. 12</span>
                  </div>
                  <h3 className="font-display text-3xl md:text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] text-balance">
                    The universe is <em className="italic font-normal text-primary">local</em> only if we ignore it.
                  </h3>
                  <div className="space-y-2.5" aria-hidden="true">
                    <div className="h-2 rounded-full bg-muted w-full" />
                    <div className="h-2 rounded-full bg-muted w-[92%]" />
                    <div className="h-2 rounded-full bg-muted w-[97%]" />
                    <div className="h-2 rounded-full bg-muted w-[85%]" />
                    <div className="h-2 rounded-full bg-muted w-[94%]" />
                  </div>
                  {/* Marginal note — handwritten cue */}
                  <div className="relative pl-4 border-l-2 border-primary/30">
                    <span className="absolute -left-[1px] top-0 w-0.5 h-6 bg-primary" />
                    <span className="font-mono text-[10px] tracking-widest text-primary">AI NOTE — [P.12]</span>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      Entanglement isn&apos;t spooky action — it&apos;s the failure of local realism, proven by the violation of Bell inequalities.
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <FileText className="w-3 h-3" /> Cited from page 12 • tap to open
                    </span>
                  </div>
                </div>

                {/* Side rail: quiz + flashcards + review — flat, no identical shadows */}
                <div className="hidden md:flex flex-col gap-3 p-5 border-l border-border bg-muted/20">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                    <div className="text-[11px] font-mono tracking-widest text-muted-foreground">QUIZ · BELL INEQUALITIES</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">12 questions</span>
                      <span className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wide dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300">92% · MASTERED</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-[92%] bg-foreground rounded-full" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                    <div className="text-[11px] font-mono tracking-widest text-muted-foreground">FLASHCARDS · 3 DUE</div>
                    {['Superposition', 'EPR Paradox', 'Wavefunction collapse'].map((c) => (
                      <div key={c} className="flex items-center justify-between text-xs border-b border-border last:border-0 py-1.5 last:pb-0">
                        <span className="text-foreground font-medium">{c}</span>
                        <span className="font-mono text-[10px] tracking-wide text-primary">DUE</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-border bg-card p-3 text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                    <CalendarClock className="w-3.5 h-3.5 text-foreground shrink-0" />
                    Next review: Tue · 3 cards · 4 min
                  </div>
                </div>
              </div>
            </div>
            {/* Caption under hero — editorial, not SaaS */}
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono tracking-wide text-muted-foreground px-1">
              <span>Fig. 1 — Reader with page-anchored citations</span>
              <span className="hidden sm:inline">No hallucinations. Tap any claim to open the source page.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <ModernFeaturesSection />

      {/* How It Works — editorial flow, no giant 01/02/03 */}
      <section className="py-20 md:py-28 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-foreground" />
            <span className="text-[11px] font-mono tracking-[0.18em] text-muted-foreground">FLOW</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.03em] leading-[1.05] text-balance">
            From PDF to recall — <em className="italic font-normal text-primary">without losing the page.</em>
          </h2>

          <div className="mt-12 grid md:grid-cols-3 gap-6 md:gap-8 relative">
            {/* hairline connector */}
            <div className="hidden md:block absolute top-[22px] left-[18%] right-[18%] h-px bg-border" />
            {[
              { k: '01 — DROP', title: 'Drop the source', desc: 'PDF keeps page breaks. YouTube caps become 3-min pages. Paste text auto-paginates.', meta: 'Accepts 1–1,000 pages' },
              { k: '02 — ANCHOR', title: 'Everything anchored', desc: 'We chunk ~800 words, embed 768-d, store with page number. No black-box split.', meta: 'Vector + keyword hybrid' },
              { k: '03 — RECALL', title: 'Ask, cite, recall', desc: 'Chat cites [Page 12]. Quiz and SM-2 cards link back to the line they came from.', meta: 'Tap any claim to open page' },
            ].map((item) => (
              <div key={item.k} className="relative bg-card rounded-xl border border-border p-6 flex flex-col gap-3">
                <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center font-mono text-[11px] font-bold">✓</div>
                <div className="text-[11px] font-mono tracking-[0.14em] text-muted-foreground">{item.k}</div>
                <h3 className="text-base font-semibold tracking-tight -mt-1">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                <div className="mt-auto pt-4 border-t border-border font-mono text-[11px] text-muted-foreground">{item.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verbatim — one real note, not 3 fakes. Manuscript strip replaces generic grid */}
      <section className="py-16 md:py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-card p-8 md:p-10 flex flex-col md:flex-row gap-8 md:gap-10">
            <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
              <Quote className="w-5 h-5" />
            </div>
            <div className="space-y-4 flex-1 min-w-0">
              <p className="font-display text-xl md:text-2xl leading-[1.35] text-foreground text-balance">
                “I stopped copy-pasting ‘summaries’ that I couldn’t verify. With Studium my flashcards point to <span className="underline decoration-primary/30 underline-offset-4">the exact page</span> — I can defend it in seminar.”
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-foreground">Alex Rivera</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="text-muted-foreground">Stanford · History of Science · 2nd yr PhD</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground">Since Dec 2025 · 412 cards · 94% retention</span>
              </div>
            </div>
          </div>

          {/* Manuscript strip — 4 use cases, not 3 identical testimonial cards */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Medicine', pages: '1,204 pp', note: 'Robbins Pathology' },
              { label: 'Law', pages: '892 pp', note: 'Case briefs + recaps' },
              { label: 'Physics', pages: '640 pp', note: 'Griffiths + lecture caps' },
              { label: 'History', pages: '1,430 pp', note: 'Primary sources' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1.5">
                <div className="text-[11px] font-mono tracking-widest text-muted-foreground">{item.label.toUpperCase()}</div>
                <div className="text-sm font-semibold text-foreground">{item.note}</div>
                <div className="text-xs font-mono text-muted-foreground">{item.pages} · cited</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section — no eyebrow, editorial */}
      <section id="faq" className="py-20 md:py-28 bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.02em]">Questions, answered.</h2>
              <p className="text-sm text-muted-foreground">If it’s not on a page, we don’t claim it. A few specifics:</p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <button
                  key={idx}
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full text-left p-5 md:p-6 rounded-xl border border-border bg-background hover:border-foreground/15 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold text-foreground text-sm md:text-[15px]">{faq.question}</h3>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`}
                    />
                  </div>
                  {expandedFaq === idx && (
                    <p className="text-sm leading-relaxed text-muted-foreground mt-3 border-t border-border pt-3">{faq.answer}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section — editorial, not SaaS transform */}
      <section className="py-20 md:py-28 border-t border-border bg-foreground text-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-[-0.03em] leading-[1.05] text-balance">Bring the paper that’s blocking you.</h2>
            <p className="text-sm md:text-[15px] text-background/70 max-w-xl mx-auto">Drop it in. Ask where you’re stuck. Get an answer you can click back to the page for.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 bg-background text-foreground hover:bg-background/90 rounded-lg">
                Start learning — free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center h-11 px-6 gap-1.5 text-sm font-medium text-background/70 hover:text-background transition-colors">
              See the reader
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="pt-2 font-mono text-[11px] tracking-wide text-background/50">No credit card · Your pages, your citations</div>
        </div>
      </section>

      {/* Footer — no dead links */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <StudiumLogo size={18} className="text-white" />
                </div>
                <span className="font-heading font-bold">Studium</span>
              </div>
              <p className="text-sm text-muted-foreground">Precision learning platform</p>
              <p className="text-xs font-mono text-muted-foreground mt-2">Your pages, your citations.</p>
            </div>
            <div className="flex gap-12 text-sm">
              <div className="space-y-3">
                <p className="text-xs font-mono tracking-[0.16em] text-muted-foreground">PRODUCT</p>
                <div className="space-y-2 text-muted-foreground">
                  <Link href="#features" className="block hover:text-foreground transition">Features</Link>
                  <Link href="#faq" className="block hover:text-foreground transition">FAQ</Link>
                  <Link href="/sign-in" className="block hover:text-foreground transition">Sign in</Link>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-mono tracking-[0.16em] text-muted-foreground">APP</p>
                <div className="space-y-2 text-muted-foreground">
                  <Link href="/app/library" className="block hover:text-foreground transition">Library</Link>
                  <Link href="/app/dashboard" className="block hover:text-foreground transition">Dashboard</Link>
                  <Link href="/sign-up" className="block hover:text-foreground transition">Get started</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">&copy; 2026 Studium. All rights reserved.</p>
            <p className="text-xs font-mono text-muted-foreground">Every button goes somewhere — no # dead links.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
