import { auth, currentUser } from '@clerk/nextjs/server'
import { cache } from 'react'
import prisma from '@/lib/db'
import { isDemoAuthEnabled } from '@/lib/env'

/**
 * Single canonical ID for the local-dev / demo user.
 * All offline fallbacks across the app use this constant
 * so per-user data stays consistent.
 *
 * Demo auth itself lives in `@/lib/env` (single source shared with
 * `proxy.ts`): opt-in via ALLOW_DEMO_AUTH=1, never active in production.
 */
export const DEMO_USER_ID = 'demo-user-id'
export const DEMO_USER_EMAIL = 'alex.rivera@stanford.edu'
export const DEMO_USER_NAME = 'Alex Rivera (Local Dev)'

export interface ClerkAuthUser {
  id: string
  name: string
  email: string
  image?: string | null
}

/**
 * Helper to get the current authenticated Clerk user.
 *
 * The authentication gate depends ONLY on the session cookie (auth().userId),
 * never on the external Clerk profile API. If that API is slow or unavailable
 * the app keeps working instead of flashing the sign-in page on navigation.
 *
 * User records are auto-upserted into Prisma to guarantee foreign key integrity;
 * once a record exists it is served from the local DB (fast path) so we don't
 * hit Clerk's API on every route change.
 * Outside production, falls back to the demo user if unauthenticated.
 *
 * Cached per-request via React `cache()` so layout + page double-calls
 * (e.g. app layout guard + dashboard) hit the DB once, not twice.
 */
async function _getCurrentUserUncached(): Promise<ClerkAuthUser | null> {
  try {
    const { userId } = await auth()
    if (userId) {
      // Fast path: the user record we keep in sync locally already exists.
      const existing = await prisma.user
        .findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, image: true },
        })
        .catch(() => null)
      if (existing) {
        return {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          image: existing.image,
        }
      }

      // Slow path (first visit): fetch the profile from Clerk's API and store it.
      try {
        const user = await currentUser()
        if (user) {
          const primaryEmail =
            user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
            user.emailAddresses[0]?.emailAddress ||
            ''
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User'
          const image = user.imageUrl || null

          await prisma.user
            .upsert({
              where: { id: user.id },
              update: { name, email: primaryEmail, image },
              create: { id: user.id, name, email: primaryEmail, image },
            })
            .catch((err) => {
              console.error('Failed to upsert Clerk user into Prisma:', err)
            })

          return { id: user.id, name, email: primaryEmail, image }
        }
      } catch {
        // Fall through to the claims-based minimal record below.
      }

      // Last resort: build a minimal record from the JWT claims so auth never
      // fails closed (avoids flashing the login page when Clerk's API hiccups).
      try {
        const claims = (await auth()).sessionClaims as {
          firstName?: string
          lastName?: string
          email?: string
          sub: string
        } | null
        const name = `${claims?.firstName || ''} ${claims?.lastName || ''}`.trim() || 'User'
        const email = claims?.email || `${userId}@clerk.dev`
        await prisma.user
          .upsert({
            where: { id: userId },
            update: {},
            create: { id: userId, name, email },
          })
          .catch(() => {})
        return { id: userId, name, email }
      } catch {
        // Signed in but no profile data available — still authenticated.
        return { id: userId, name: 'User', email: `${userId}@clerk.dev` }
      }
    }
  } catch {
    // Auth check fallback
  }

  // Local development fallback — only when explicitly opted in.
  // Never active in production, even if ALLOW_DEMO_AUTH leaks.
  if (isDemoAuthEnabled()) {
    await prisma.user
      .upsert({
        where: { id: DEMO_USER_ID },
        update: {},
        create: {
          id: DEMO_USER_ID,
          name: DEMO_USER_NAME,
          email: DEMO_USER_EMAIL,
        },
      })
      .catch(() => {})

    return {
      id: DEMO_USER_ID,
      name: DEMO_USER_NAME,
      email: DEMO_USER_EMAIL,
    }
  }

  return null
}

export const getCurrentUser = cache(
  async (_headersObj?: unknown): Promise<ClerkAuthUser | null> => {
    void _headersObj
    return _getCurrentUserUncached()
  }
)

/**
 * Returns the resolved user ID for the current request.
 * - Real Clerk user when authenticated
 * - Demo user only when ALLOW_DEMO_AUTH=1 locally
 * - null otherwise (including all of production when unauthenticated)
 */
export async function getCurrentUserId(_headersObj?: unknown): Promise<string | null> {
  const user = await getCurrentUser(_headersObj)
  if (user) return user.id
  return isDemoAuthEnabled() ? DEMO_USER_ID : null
}
