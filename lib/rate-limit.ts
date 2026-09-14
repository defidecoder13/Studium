/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough to stop casual Gemini cost abuse (20 req/min/user).
 * Note: on Vercel serverless each isolate has its own map, so this is
 * best-effort — for strict global limits use Upstash Redis later.
 */

const hits = new Map<string, number[]>()

export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = (hits.get(key) || []).filter((t) => t > windowStart)

  if (timestamps.length >= limit) {
    const oldest = timestamps[0]
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    hits.set(key, timestamps)
    return { allowed: false, retryAfterSec }
  }

  timestamps.push(now)
  // Bound memory: drop keys that grow unbounded (defensive).
  if (hits.size > 10_000) hits.clear()
  hits.set(key, timestamps)
  return { allowed: true, retryAfterSec: 0 }
}

export function rateLimitedResponse(retryAfterSec: number) {
  return Response.json(
    { error: `Rate limit exceeded. Try again in ${retryAfterSec}s.` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  )
}
