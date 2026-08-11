'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Brain, BarChart3, MessageCircle, ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ModernFeaturesSection } from '@/components/modern-features'

import { TypingText, TypingTextCursor } from '@/components/animate-ui/texts/typing'
import { RippleButton } from '@/components/animate-ui/buttons/ripple'
import { SlidingNumber } from '@/components/animate-ui/texts/sliding-number'

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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-bold">Studium</span>
          </div>
          
          <div className="hidden md:flex items-center gap-12 text-sm">
            <Link href="#features" className="hover:text-accent transition-colors">Features</Link>
            <Link href="#faq" className="hover:text-accent transition-colors">FAQ</Link>
            <Link href="#pricing" className="hover:text-accent transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-sm">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Gradient background elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-accent/20 to-muted/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-muted/5 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-6 lg:px-8 relative">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card">
                <span className="text-xs font-mono text-accent">New</span>
                <span className="text-sm text-muted-foreground">Introducing AI-powered study assistant</span>
                <ArrowUpRight className="w-3 h-3 text-accent" />
              </div>

              <h1 className="text-6xl md:text-7xl lg:text-8xl font-heading font-bold leading-[1.1] text-balance flex flex-wrap gap-x-4 items-center">
                Master any subject with
                <span className="relative inline-flex items-center text-primary">
                  {/* Invisible spacer to prevent layout shift */}
                  <span className="opacity-0 pointer-events-none select-none" aria-hidden="true">
                    effortless speed
                  </span>
                  {/* Absolute positioned typing text */}
                  <span className="absolute inset-y-0 left-0 flex items-center">
                    <TypingText
                      text={['precision', 'AI mastery', 'total clarity', 'effortless speed', 'smart synthesis', 'instant recall']}
                      loop
                      delay={100}
                      className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent inline-flex whitespace-nowrap"
                    >
                      <TypingTextCursor className="ml-1 w-[4px] bg-accent rounded-full" />
                    </TypingText>
                  </span>
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Transform your study materials into interactive learning experiences. Summaries, quizzes, and intelligent tracking—all powered by advanced AI.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/sign-up" className="inline-block">
                <RippleButton className="inline-flex items-center justify-center h-12 px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md">
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </RippleButton>
              </Link>
              <Button className="h-12 px-8 gap-2 border-border hover:bg-card" variant="outline">
                Watch Demo
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 pt-8 border-t border-border">
              <div>
                <div className="text-3xl font-heading font-bold flex items-center">
                  <SlidingNumber number={10} />K+
                </div>
                <div className="text-sm text-muted-foreground">Active learners</div>
              </div>
              <div>
                <div className="text-3xl font-heading font-bold flex items-center">
                  <SlidingNumber number={4} />.<SlidingNumber number={9} />★
                </div>
                <div className="text-sm text-muted-foreground">User rating</div>
              </div>
              <div>
                <div className="text-3xl font-heading font-bold flex items-center">
                  <SlidingNumber number={50} />+
                </div>
                <div className="text-sm text-muted-foreground">Subjects covered</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative h-96 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="inline-block p-4 rounded-full bg-muted/50">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-foreground font-heading font-semibold">Premium Study Experience</p>
                  <p className="text-sm text-muted-foreground">Coming to your preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <ModernFeaturesSection />

      {/* How It Works */}
      <section className="py-20 md:py-32 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-12">
            <div className="space-y-4">
              <p className="text-sm font-mono text-accent">PROCESS</p>
              <h2 className="text-4xl md:text-5xl font-heading font-bold">How it works</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Upload', desc: 'Add your study materials in any format' },
                { step: '02', title: 'Process', desc: 'AI analyzes and extracts key content' },
                { step: '03', title: 'Learn', desc: 'Study with summaries, quizzes, and chat' },
              ].map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="flex flex-col gap-4">
                    <div className="text-5xl font-heading font-bold text-muted opacity-50">{item.step}</div>
                    <div>
                      <h3 className="text-xl font-heading font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-12 -right-4 w-8 h-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-12">
            <div className="space-y-4">
              <p className="text-sm font-mono text-accent">TESTIMONIALS</p>
              <h2 className="text-4xl md:text-5xl font-heading font-bold">What users say</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Alex Rodriguez', role: 'Medical Student', quote: 'Turned my study routine from chaotic to streamlined. Aced my exams.' },
                { name: 'Jordan Lee', role: 'High School Senior', quote: 'The most intuitive study tool I\'ve used. Highly recommend.' },
                { name: 'Sam Chen', role: 'Grad Student', quote: 'Saves me hours every week. Worth every penny.' },
              ].map((item, idx) => (
                <div key={idx} className="p-8 rounded-xl border border-border bg-card">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-4 h-4 bg-primary rounded-full" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{item.quote}"</p>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32 bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="space-y-12">
            <div className="space-y-4">
              <p className="text-sm font-mono text-accent">FAQ</p>
              <h2 className="text-4xl md:text-5xl font-heading font-bold">Questions?</h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <button
                  key={idx}
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full text-left p-6 rounded-lg border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{faq.question}</h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-accent transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`}
                    />
                  </div>
                  {expandedFaq === idx && (
                    <p className="text-muted-foreground mt-4">{faq.answer}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-heading font-bold">Ready to transform your learning?</h2>
            <p className="text-lg text-muted-foreground">Join thousands of students mastering their studies with Studium</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2">
              Schedule Demo
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-12 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-heading font-bold">Studium</span>
              </div>
              <p className="text-sm text-muted-foreground">Precision learning platform</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Product</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="#" className="block hover:text-foreground transition">Features</Link>
                <Link href="#" className="block hover:text-foreground transition">Pricing</Link>
                <Link href="#" className="block hover:text-foreground transition">Security</Link>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Company</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="#" className="block hover:text-foreground transition">About</Link>
                <Link href="#" className="block hover:text-foreground transition">Blog</Link>
                <Link href="#" className="block hover:text-foreground transition">Careers</Link>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Legal</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="#" className="block hover:text-foreground transition">Privacy</Link>
                <Link href="#" className="block hover:text-foreground transition">Terms</Link>
                <Link href="#" className="block hover:text-foreground transition">Contact</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">&copy; 2026 Studium. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition">Twitter</Link>
              <Link href="#" className="hover:text-foreground transition">GitHub</Link>
              <Link href="#" className="hover:text-foreground transition">LinkedIn</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
