/**
 * Robust YouTube transcript fetcher.
 *
 * The `youtube-transcript` package scrapes captions without an API key and
 * without consent cookies, which YouTube frequently blocks from datacenter
 * IPs (e.g. Vercel) — InnerTube returns no tracks and the watch page serves
 * a bot-check/consent wall. This module is the fallback:
 *   1. InnerTube `player` with the public Android client key
 *      (far more reliable from servers than the keyless request).
 *   2. Watch-page scrape with a consent cookie + language preference.
 * Tracks are tried in preference order (manual English → any English →
 * manual other → first), and both srv3 + classic caption XML are parsed.
 *
 * Segments are returned in the same shape as `youtube-transcript`
 * ({ text, offset, duration }); srv3 offsets are milliseconds, classic
 * offsets are seconds — callers must handle both (see median-gap
 * detection in the youtube route).
 */

export interface TranscriptSegment {
  text: string
  offset: number
  duration: number
}

/** YouTube is bot-checking / rate-limiting our servers. Retry later. */
export class YouTubeRateLimitedError extends Error {
  constructor() {
    super('YouTube is rate-limiting transcript fetches from our servers')
    this.name = 'YouTubeRateLimitedError'
  }
}

/** The video exists but exposes no caption tracks at all. */
export class YouTubeNoCaptionsError extends Error {
  constructor(videoId: string) {
    super(`No captions are available for this video (${videoId})`)
    this.name = 'YouTubeNoCaptionsError'
  }
}

/** Private, deleted, age-restricted, or otherwise unplayable. */
export class YouTubeUnavailableError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'YouTubeUnavailableError'
  }
}

// Public Android client key (same one youtubei.js / yt-dlp use).
// Identifies the client app only — not a secret.
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const INNERTUBE_VERSION = '20.10.38'
const ANDROID_UA = `com.google.android.youtube/${INNERTUBE_VERSION} (Linux; U; Android 14)`
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const FETCH_TIMEOUT_MS = 12000

interface CaptionTrack {
  baseUrl: string
  languageCode?: string
  kind?: string
}

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

/** Extract `var <name> = {...}` balanced JSON from page HTML. */
function extractInlineJson(html: string, name: string): Record<string, unknown> | null {
  const token = `var ${name} = `
  const start = html.indexOf(token)
  if (start === -1) return null
  let depth = 0
  const jsonStart = start + token.length
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, i + 1)) as Record<string, unknown>
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function getCaptionTracks(playerResponse: unknown): CaptionTrack[] {
  const r = playerResponse as {
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } }
  }
  const tracks = r?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  return Array.isArray(tracks) ? tracks.filter((t) => typeof t?.baseUrl === 'string') : []
}

/** Per-stage probe results, for server logs + support diagnostics. */
export interface FetchDiagnostics {
  stages: string[]
}

/** 1. InnerTube player with API key — works from most datacenter IPs. */
async function innertubeTracks(videoId: string, diag?: FetchDiagnostics): Promise<CaptionTrack[] | null> {
  try {
    const resp = await fetch(
      `https://www.youtube.com/youtubei/v1/player?prettyPrint=false&key=${INNERTUBE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': ANDROID_UA },
        body: JSON.stringify({
          context: {
            client: { clientName: 'ANDROID', clientVersion: INNERTUBE_VERSION, hl: 'en', gl: 'US' },
            user: { lockedSafetyMode: false },
          },
          videoId,
          racyCheckOk: true,
          contentCheckOk: true,
        }),
        signal: withTimeout(FETCH_TIMEOUT_MS),
      }
    )
    if (!resp.ok) {
      diag?.stages.push(`innertube:http${resp.status}`)
      return null
    }
    const data = await resp.json()
    const tracks = getCaptionTracks(data)
    diag?.stages.push(
      `innertube:http200/${tracks.length}tracks/${(data?.playabilityStatus?.status as string) || 'no-status'}`
    )
    return tracks.length > 0 ? tracks : null
  } catch (err) {
    diag?.stages.push(`innertube:exception:${err instanceof Error ? err.name : 'unknown'}`)
    return null
  }
}

/** 2. Watch page with consent cookie (bypasses the EU consent wall). */
async function watchPageTracks(videoId: string, diag?: FetchDiagnostics): Promise<CaptionTrack[]> {
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Cookie: 'CONSENT=YES+1',
    },
    signal: withTimeout(FETCH_TIMEOUT_MS),
  })
  const html = await resp.text()
  if (html.includes('class="g-recaptcha"')) {
    diag?.stages.push('watch:recaptcha')
    throw new YouTubeRateLimitedError()
  }
  if (!html.includes('"playabilityStatus":')) {
    diag?.stages.push(`watch:http${resp.status}/no-playability`)
    throw new YouTubeUnavailableError('This video is unavailable')
  }
  const playerResponse = extractInlineJson(html, 'ytInitialPlayerResponse')
  const status = (
    playerResponse as { playabilityStatus?: { status?: string; reason?: string } } | null
  )?.playabilityStatus
  if (status && status.status && status.status !== 'OK') {
    diag?.stages.push(`watch:${status.status}`)
    throw new YouTubeUnavailableError(status.reason || 'This video is private, deleted, or age-restricted')
  }
  return getCaptionTracks(playerResponse)
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
}

/** Parse srv3 (`<p t="ms" d="ms">`) and classic (`<text start="s">`) XML. */
function parseTranscriptXml(xml: string): TranscriptSegment[] {
  const results: TranscriptSegment[] = []
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g
  let m: RegExpExecArray | null
  while ((m = pRegex.exec(xml)) !== null) {
    let text = ''
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g
    let s: RegExpExecArray | null
    while ((s = sRegex.exec(m[3])) !== null) text += s[1]
    if (!text) text = m[3].replace(/<[^>]+>/g, '')
    text = decodeEntities(text).replace(/\s+/g, ' ').trim()
    if (text) results.push({ text, offset: parseInt(m[1], 10), duration: parseInt(m[2], 10) })
  }
  if (results.length > 0) return results
  const classic = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g
  while ((m = classic.exec(xml)) !== null) {
    const text = decodeEntities(m[3]).replace(/\s+/g, ' ').trim()
    if (text) results.push({ text, offset: parseFloat(m[1]), duration: parseFloat(m[2]) })
  }
  return results
}

/** Prefer manual English → any English → manual other → first track. */
function orderTracks(tracks: CaptionTrack[]): CaptionTrack[] {
  const isEn = (t: CaptionTrack) => t.languageCode === 'en' || t.languageCode?.startsWith('en')
  const isManual = (t: CaptionTrack) => t.kind !== 'asr'
  return [...tracks].sort((a, b) => {
    const score = (t: CaptionTrack) => (isEn(t) ? 0 : 2) + (isManual(t) ? 0 : 1)
    return score(a) - score(b)
  })
}

function isAllowedCaptionHost(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host.endsWith('.youtube.com') || host.endsWith('.googlevideo.com')
  } catch {
    return false
  }
}

async function fetchTrackSegments(track: CaptionTrack): Promise<TranscriptSegment[]> {
  if (!isAllowedCaptionHost(track.baseUrl)) return []
  const resp = await fetch(track.baseUrl, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: withTimeout(FETCH_TIMEOUT_MS),
  })
  if (!resp.ok) return []
  return parseTranscriptXml(await resp.text())
}

/**
 * Fetch a transcript, trying keyed InnerTube first, then the consent-cookie
 * watch page, then each caption track in preference order.
 * @throws YouTubeRateLimitedError | YouTubeNoCaptionsError | YouTubeUnavailableError
 */
export async function fetchYouTubeTranscriptRobust(
  videoId: string,
  diag?: FetchDiagnostics
): Promise<TranscriptSegment[]> {
  // Attempt 1: keyed InnerTube
  const itTracks = await innertubeTracks(videoId, diag)
  if (itTracks) {
    for (const track of orderTracks(itTracks)) {
      try {
        const segs = await fetchTrackSegments(track)
        if (segs.length > 0) {
          diag?.stages.push(`innertube-track:${track.languageCode || '?'}:ok/${segs.length}`)
          return segs
        }
        diag?.stages.push(`innertube-track:${track.languageCode || '?'}:empty`)
      } catch {
        diag?.stages.push(`innertube-track:${track.languageCode || '?'}:fetch-fail`)
      }
    }
  }

  // Attempt 2: watch page (may throw rate-limited / unavailable)
  const pageTracks = await watchPageTracks(videoId, diag)
  diag?.stages.push(`watch:${pageTracks.length}tracks`)
  for (const track of orderTracks(pageTracks)) {
    try {
      const segs = await fetchTrackSegments(track)
      if (segs.length > 0) {
        diag?.stages.push(`watch-track:${track.languageCode || '?'}:ok/${segs.length}`)
        return segs
      }
      diag?.stages.push(`watch-track:${track.languageCode || '?'}:empty`)
    } catch {
      diag?.stages.push(`watch-track:${track.languageCode || '?'}:fetch-fail`)
    }
  }

  throw new YouTubeNoCaptionsError(videoId)
}
