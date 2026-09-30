/**
 * Same-origin guard for destructive routes.
 *
 * `?confirm=DELETE` stops accidents, not targeted CSRF (an attacker can just
 * include the query param in a forged URL). This closes that gap: browser
 * same-origin requests always send Origin/Referer, so a cross-site forged
 * request is rejected while curl/server calls (no headers) still pass.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  if (!origin && !referer) return true // non-browser caller (curl, server)
  try {
    const reqHost = new URL(req.url).host
    if (origin && new URL(origin).host === reqHost) return true
    if (referer && new URL(referer).host === reqHost) return true
    return false
  } catch {
    return false
  }
}
