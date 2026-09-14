import { ClerkProvider } from '@clerk/nextjs'
import { shadcn } from '@clerk/ui/themes'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Fraunces, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Studium — Precision Learning Platform',
  description: 'Drop the PDF. Keep every citation. Summaries, quizzes and flashcards with page-level provenance.',
  keywords: 'study, learning, AI, citations, flashcards, spaced repetition, education',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
  ],
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('studium-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`bg-background ${dmSans.variable} ${fraunces.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        {/* Speculation Rules — instant navigation for /app/* (Chrome 121+) */}
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [{ where: { href_matches: '/app/*' }, eagerness: 'moderate' }],
              prefetch: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }],
            }),
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Filter noisy chrome-extension errors (e.g. eppiocemhmnlbhjplcgkofciiegomcon M_ID) — not Studium bugs */}
        <Script
          id="extension-error-filter"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('error',function(e){if(e.filename&&e.filename.indexOf('chrome-extension://')===0){e.stopImmediatePropagation();console.warn('[Studium] Ignored chrome-extension error:',e.message);}},true);window.addEventListener('unhandledrejection',function(e){var m=e.reason&&e.reason.message||'';if(String(m).indexOf('M_ID')!==-1&&String(e.reason&&e.reason.stack||'').indexOf('chrome-extension')!==-1){e.preventDefault();console.warn('[Studium] Ignored extension rejection');}});`,
          }}
        />
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ThemeProvider>{children}</ThemeProvider>
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ClerkProvider>
      </body>
    </html>
  )
}