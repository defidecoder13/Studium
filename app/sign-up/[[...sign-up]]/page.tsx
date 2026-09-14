import { SignUp } from '@clerk/nextjs'
import { BookOpen, Sparkles, ShieldCheck, Quote } from 'lucide-react'
import { StudiumLogo } from '@/components/ui/logo'

export default function SignUpPage() {
  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 rounded-3xl border border-border bg-card overflow-hidden shadow-xl shadow-foreground/5">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-secondary/50 border-r border-border">
          <div className="relative space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-black dark:bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
                <StudiumLogo size={24} className="text-white" />
              </div>
              <span className="text-xl font-heading font-bold">Studium</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-4xl font-semibold leading-tight text-balance">
                Learn like a <em className="italic text-primary">scholar</em>, remember like a machine.
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload your textbooks, chat with AI, and let spaced repetition do the heavy lifting.
              </p>
            </div>
          </div>

          <div className="relative space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <Quote className="w-5 h-5 text-primary" />
              <p className="text-sm italic text-foreground leading-relaxed">
                &ldquo;Turned my study routine from chaotic to streamlined. Aced my exams.&rdquo;
              </p>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">A</div>
                <span className="font-semibold text-foreground">Alex Rodriguez</span>
                <span className="text-muted-foreground">· Medical Student</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-primary" /> PDF parsing</span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> AI quizzes</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Code-verified</span>
            </div>
          </div>
        </div>

        {/* Clerk Sign Up component */}
        <div className="p-6 md:p-10 flex items-center justify-center bg-card">
          <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/app/dashboard" />
        </div>
      </div>
    </main>
  )
}
