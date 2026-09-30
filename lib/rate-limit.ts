/**
 * Sliding-window rate limiter with Redis backing when configured.
 *
 * - Memory Map fallback (per-isolate, best-effort on serverless).
 * - Upstash Redis REST fixed-window when UPSTASH_REDIS_REST_URL + TOKEN set
 *   (strict across isolates; no new deps — plain fetch).
 */

const hits = new Map<string, number[]>()

export function getClientIp(req?: Request): string {
  try {
    const h = req ? new Headers(req.headers) : null
    const xff = h?.get('x-forwarded-for') || h?.get('x-real-ip') || ''
    return xff.split(',')[0].trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function redisFixedWindow(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; retryAfterSec: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const nowSec = Math.floor(Date.now() / 1000)
    const windowKey = `rl:${key}:${Math.floor(nowSec / windowSec)}`
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', windowKey],
        ['EXPIRE', windowKey, String(windowSec)],
        ['TTL', windowKey],
      ]),
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ result: number }>
    const count = Number(data?.[0]?.result ?? 0)
    const ttl = Number(data?.[2]?.result ?? windowSec)
    if (count > limit) {
      return { allowed: false, retryAfterSec: Math.max(1, ttl) }
    }
    return { allowed: true, retryAfterSec: 0 }
  } catch {
    return null // fail open to memory limiter
  }
}

function memoryCheck(
  key: string,
  limit: number,
  windowMs: number
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

export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  return memoryCheck(key, limit, windowMs)
}

/** Async check: Redis when configured, else memory. */
export async function checkRateLimitAsync(
  key: string,
  limit = 20,
  windowMs = 60_000
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const fromRedis = await redisFixedWindow(key, limit, Math.max(1, Math.round(windowMs / 1000)))
  if (fromRedis) return fromRedis
  return memoryCheck(key, limit, windowMs)
}

/**
 * Dual check: per-user (or per-key) AND per-IP. Use on all API routes:
 * user key stops account abuse, IP key stops enumeration from one network.
 */
export async function checkRateLimitWithIp(
  req: Request,
  key: string,
  limit = 60,
  windowMs = 60_000,
  ipLimit = 120
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const ip = getClientIp(req)
  const [byKey, byIp] = await Promise.all([
    checkRateLimitAsync(key, limit, windowMs),
    checkRateLimitAsync(`ip:${ip}`, ipLimit, windowMs),
  ])
  if (!byKey.allowed) return byKey
  if (!byIp.allowed) return byIp
  return { allowed: true, retryAfterSec: 0 }
}

export const RATE_PRESETS = {
  ai: { limit: 20, windowMs: 60_000, ipLimit: 60 },
  ingest: { limit: 10, windowMs: 60_000, ipLimit: 30 },
  read: { limit: 60, windowMs: 60_000, ipLimit: 120 },
  write: { limit: 30, windowMs: 60_000, ipLimit: 60 },
  heavy: { limit: 30, windowMs: 60_000, ipLimit: 60 },
} as const

export function rateLimitedResponse(retryAfterSec: number) {
  return Response.json(
    { error: `Rate limit exceeded. Try again in ${retryAfterSec}s.` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  )
}
