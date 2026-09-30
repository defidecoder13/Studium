'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
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
    answer: 'Documents are stored privately per account and served only to you over HTTPS. Files live in private object storage and metadata in Postgres; nothing is shared publicly.',
  },
  {
    question: 'Can I export my study materials?',
    answer: 'Yes. Export flashcards, summaries, and notes in multiple formats including PDF, Markdown, and popular flashcard apps.',
  },
]

export function LandingFaq() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {FAQS.map((faq, idx) => {
        const open = expandedFaq === idx
        return (
          <div
            key={idx}
            className="w-full text-left p-5 md:p-6 rounded-xl border border-border bg-background hover:border-foreground/15 transition-colors"
          >
            <button
              onClick={() => setExpandedFaq(open ? null : idx)}
              aria-expanded={open}
              aria-controls={`faq-panel-${idx}`}
              className="w-full flex items-center justify-between gap-4 text-left"
            >
              <h3 className="font-semibold text-foreground text-sm md:text-[15px]">{faq.question}</h3>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <p id={`faq-panel-${idx}`} className="text-sm leading-relaxed text-muted-foreground mt-3 border-t border-border pt-3">
                {faq.answer}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
