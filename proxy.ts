import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { isDemoAuthEnabled } from '@/lib/env'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Local-dev convenience only: fall back to demo user (see lib/auth.ts).
    // Requires ALLOW_DEMO_AUTH=1 and non-production. Otherwise always protect.
    if (isDemoAuthEnabled()) {
      return
    }
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk auto-proxy path
    '/__clerk/:path*',
  ],
}
