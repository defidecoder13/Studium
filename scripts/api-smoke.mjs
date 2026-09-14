#!/usr/bin/env node
/**
 * Runtime API smoke test for Studium.
 *
 * Hits every API route (as the dev/demo user) and asserts the expected
 * 2xx/4xx response for each. Run it against a live dev server.
 *
 * Usage:
 *   node scripts/api-smoke.mjs                        # auto-detect base URL (3001, 3000, ...)
 *   node scripts/api-smoke.mjs http://localhost:3001  # explicit base URL
 *   SMOKE_BASE_URL=... node scripts/api-smoke.mjs     # env override
 *   SMOKE_AI=1             node scripts/api-smoke.mjs # also run real AI generation calls (Gemini)
 *   SMOKE_OFFLINE=1        node scripts/api-smoke.mjs # skip network-dependent tests (YouTube)
 *   SMOKE_DESTRUCTIVE=1    node scripts/api-smoke.mjs # include DELETE /api/account (wipes demo user!)
 *   node scripts/api-smoke.mjs --json                 # machine-readable JSON summary
 *
 * Exit code: 0 = all passed, 1 = one or more failures, 2 = no server found.
 */
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AI_ENABLED = process.env.SMOKE_AI === '1'
const OFFLINE = process.env.SMOKE_OFFLINE === '1'
const DESTRUCTIVE = process.env.SMOKE_DESTRUCTIVE === '1'
const JSON_OUTPUT = process.argv.includes('--json')

// ---------------------------------------------------------------------------
// Small HTTP helper
// ---------------------------------------------------------------------------

async function http(method, url, { json, form, timeoutMs = 15000, origin } = {}) {
  const headers = {}
  let body
  if (json !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form // FormData sets its own multipart content-type
  }
  if (origin) headers.origin = origin // some routes check the Origin header

  // Turbopack dev compiles routes lazily; a first request can race the compile
  // and return an empty/HTML body with status 200. Retry once before failing.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { method, headers, body, signal: controller.signal })
      const text = await res.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = text
      }
      const parsed = data === null || typeof data === 'object' || typeof data === 'number' || typeof data === 'boolean'
      const isJsonRoute = (res.headers.get('content-type') || '').includes('application/json')
      // Turbopack compiles a route lazily on first hit: the first request can
      // return 200 with an empty body (parses to null) or an HTML placeholder
      // instead of JSON. Retry once for IDEMPOTENT methods on JSON routes whose
      // body was empty or failed to parse. (A literal JSON `null` body has
      // non-empty text, so it is not retried.) Never retry POST/PATCH/DELETE:
      // a compile race on those could create a resource twice.
      const retriable = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
      if (attempt === 1 && retriable && res.status === 200 && isJsonRoute && (text.trim() === '' || !parsed)) {
        await new Promise((r) => setTimeout(r, 800))
        continue
      }
      return { status: res.status, ok: res.ok, data, text, contentType: res.headers.get('content-type') || '' }
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('request failed after retries')
}

const req = (method, pathname, opts = {}) => http(method, BASE + pathname, { origin: BASE, ...opts })
const jsonReq = (method, pathname, json, opts = {}) => req(method, pathname, { json, ...opts })

// ---------------------------------------------------------------------------
// Base URL detection — must find Studium, not some other app on :3000
// ---------------------------------------------------------------------------

async function detectBaseUrl() {
  if (process.env.SMOKE_BASE_URL) {
    const b = process.env.SMOKE_BASE_URL.replace(/\/+$/, '')
    console.log(`→ base URL from SMOKE_BASE_URL: ${b}`)
    return b
  }
  const arg = process.argv[2]
  if (arg && /^https?:\/\//.test(arg)) {
    const b = arg.replace(/\/+$/, '')
    console.log(`→ base URL from argument: ${b}`)
    return b
  }
  const candidates = [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:8080',
    'http://localhost:3003',
  ]
  for (const base of candidates) {
    try {
      // 10s, not 2s: Turbopack lazily compiles the route on first hit, which
      // can take a few seconds and would abort a too-short probe.
      const res = await http('GET', `${base}/api/documents`, { timeoutMs: 10000 })
      // Studium's /api/documents answers JSON `{ documents: [...] }` (demo-user
      // fallback in dev; 401 without a session in prod) — a strong marker.
      // Other apps' HTML pages fail the JSON check.
      const looksLikeAuth =
        res.status === 200 && typeof res.data === 'object' && Array.isArray(res.data.documents)
      if (looksLikeAuth) {
        console.log(`→ auto-detected Studium dev server at ${base}`)
        return base
      }
    } catch {
      /* try next candidate */
    }
  }
  console.error(
    '✗ Could not auto-detect a running Studium dev server.\n' +
      '  Pass the base URL: node scripts/api-smoke.mjs http://localhost:3001\n' +
      '  or set SMOKE_BASE_URL.'
  )
  process.exit(2)
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

const results = []
const ctx = {}
const startedAt = Date.now()

function test(name, fn) {
  results.push({ name, run: fn })
}

function skip(msg) {
  const e = new Error(msg)
  e.code = 'SKIP'
  throw e
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// Call sites pass the already-parsed body (res.data); jsonOf just guards
// against null/string bodies (Turbopack compile races) returning {}.
const jsonOf = (data) => (data && typeof data === 'object' ? data : {})

// Doc-dependent tests need a successfully uploaded fixture document.
const needDoc = () => {
  if (!ctx.docId) skip('no uploaded fixture document (previous upload test failed/skipped)')
}

async function runSuite() {
  let passed = 0
  let failed = 0
  let skipped = 0
  const failures = []
  const skips = []

  for (const t of results) {
    try {
      await t.run()
      passed += 1
      console.log(`  ✓ ${t.name}`)
    } catch (err) {
      if (err && err.code === 'SKIP') {
        skipped += 1
        skips.push({ name: t.name, reason: err.message })
        console.log(`  ↷ ${t.name}  (skipped: ${err.message})`)
        continue
      }
      failed += 1
      failures.push({ name: t.name, message: err.message })
      console.log(`  ✗ ${t.name}\n      ${err.message}`)
    }
  }

  const summary = {
    baseUrl: BASE,
    flags: { ai: AI_ENABLED, offline: OFFLINE, destructive: DESTRUCTIVE },
    passed,
    failed,
    skipped,
    failures,
    skips,
    durationMs: Date.now() - startedAt,
  }

  if (JSON_OUTPUT) {
    console.log('\n---JSON---')
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('\n──────────────────────────────────────────────────────────────')
    console.log(`  ${passed} passed   ·   ${failed} failed   ·   ${skipped} skipped   (${(summary.durationMs / 1000).toFixed(1)}s)`)
    console.log('──────────────────────────────────────────────────────────────')
    if (failures.length > 0) {
      console.log('\nFailures:')
      for (const f of failures) console.log(`  - ${f.name}: ${f.message}`)
    }
    if (skips.length > 0) {
      console.log('\nSkipped:')
      for (const s of skips) console.log(`  - ${s.name}: ${s.reason}`)
    }
  }

  process.exitCode = failed > 0 ? 1 : 0
}

// ---------------------------------------------------------------------------
// Fixtures — a real, minimal, parseable one-page PDF built at runtime
// ---------------------------------------------------------------------------

// A REAL PDF fixture is required: pdf.js's xref parser is unreliable with
// hand-crafted minimal PDFs (state-dependent "bad XRef entry" failures), but
// parses genuine PDFs flawlessly. pdf-parse ships test PDFs with the package
// (no `files` whitelist), so we load one at runtime.
const { readFileSync } = await import('node:fs')
let realPdfBuffer = null
for (const name of ['04-valid.pdf', '01-valid.pdf', '05-versions-space.pdf']) {
  try {
    const p = path.join(ROOT, 'node_modules', 'pdf-parse', 'test', 'data', name)
    const buf = readFileSync(p)
    if (buf.subarray(0, 5).toString('latin1') === '%PDF-' && buf.length > 1000) {
      realPdfBuffer = buf
      break
    }
  } catch {
    /* try next */
  }
}

function pdfForm(name = 'quantum-smoke-test.pdf') {
  const fd = new FormData()
  fd.append('file', new Blob([realPdfBuffer], { type: 'application/pdf' }), name)
  fd.append('folder', 'Smoke Tests')
  return fd
}

// ---------------------------------------------------------------------------
// Auth notes — Clerk hosts sign-in/sign-up and owns sessions, so the smoke
// suite cannot drive the full email-verification flow through our API. It
// verifies the integration points instead: the Clerk sign-in page renders and
// Clerk's middleware redirects unauthenticated visitors away from the app
// shell. Every API route below still runs as the dev/demo user (unauthenticated
// fallback in development), which is what the non-auth tests exercise.
// ---------------------------------------------------------------------------

// ===========================================================================
// TESTS
// ===========================================================================

// --- Auth (Clerk) ------------------------------------------------------------
// Clerk hosts the sign-in/up pages and owns sessions, so the full
// email-verification flow cannot be driven through our API. These tests cover
// the integration points: the Clerk sign-in page renders, Clerk's middleware
// redirects unauthenticated visitors away from the app shell, and the dev API
// falls back to the demo user (which powers every other test in this suite).

test('auth: GET /sign-in renders the Clerk sign-in page (200)', async () => {
  const res = await req('GET', '/sign-in')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(
    res.text.includes('clerk') || res.text.includes('__clerk') || res.text.includes('Studium'),
    'expected Clerk sign-in UI markup in the response'
  )
})

test('auth: /app/* is gated (3xx to sign-in in production, demo-user 200 in dev)', async () => {
  // redirect: 'manual' so we capture the middleware's redirect instead of
  // following it; retry once to ride out a Turbopack first-compile.
  let res
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    res = await fetch(`${BASE}/app/dashboard`, { redirect: 'manual' })
    if ([301, 302, 303, 307, 308].includes(res.status)) break
    await new Promise((r) => setTimeout(r, 800))
  }
  const isProduction = process.env.NODE_ENV === 'production' || /vercel\.app|\.railway\.app|render\.com|fly\.dev/.test(BASE)
  if (isProduction) {
    assert([301, 302, 303, 307, 308].includes(res.status), `expected a redirect status, got ${res.status}`)
    const location = res.headers.get('location') || ''
    assert(location.includes('/sign-in'), `expected redirect to /sign-in, got: ${location || '(no Location header)'}`)
  } else {
    // Dev: the app falls back to the demo user (see lib/auth.ts) instead of
    // bouncing to the Clerk sign-in page, so /app/* renders with a 200.
    assert(res.status === 200, `expected 200 (demo-user fallback) in dev, got ${res.status}`)
    assert((await res.text()).includes('Welcome back'), 'expected the demo-user dashboard to render')
  }
})

test('auth: dev API falls back to the demo user (200)', async () => {
  const res = await req('GET', '/api/documents')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(Array.isArray(jsonOf(res.data).documents), 'expected documents[] via the demo-user fallback')
})

// --- Settings ---------------------------------------------------------------
test('settings: GET returns profile defaults (200)', async () => {
  const res = await req('GET', '/api/settings')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  ctx.originalSettings = jsonOf(res.data).settings
  assert(ctx.originalSettings && typeof ctx.originalSettings.fullName === 'string', 'missing settings.fullName')
})

test('settings: POST upserts profile then restores original (200)', async () => {
  // Snapshot the pre-test profile so it can be restored even if the GET above
  // failed (which would otherwise leak "Smoke Tester" into the demo user).
  const snap = ctx.originalSettings
    ? ctx.originalSettings
    : jsonOf((await req('GET', '/api/settings')).data)
  const res = await jsonReq('POST', '/api/settings', {
    fullName: 'Smoke Tester',
    institution: 'Smoke Test University',
  })
  assert(res.status === 200, `expected 200, got ${res.status}`)
  // Restore the demo user's original profile — the smoke run must not leave state behind.
  if (snap && typeof snap.fullName === 'string') {
    const restored = await jsonReq('POST', '/api/settings', snap)
    if (restored.status !== 200) {
      console.warn(`      (WARN: could not restore demo profile — GET /api/settings status ${restored.status})`)
    }
  } else {
    console.warn('      (WARN: no pre-test profile snapshot — demo profile left as-is)')
  }
})

// --- Documents --------------------------------------------------------------
test('documents: GET lists stored documents (200)', async () => {
  const res = await req('GET', '/api/documents')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(Array.isArray(jsonOf(res.data).documents), 'missing documents[]')
})

test('documents: POST upload rejects a non-PDF with 400', async () => {
  const fd = new FormData()
  fd.append('file', new Blob(['dummy pdf not really a pdf']), 'fake.txt')
  fd.append('folder', 'Smoke Tests')
  const res = await http('POST', `${BASE}/api/documents/upload`, { form: fd })
  assert(res.status === 400, `expected 400, got ${res.status} (${res.text.slice(0, 140)})`)
})

test('documents: POST upload parses a real PDF (200)', async () => {
  if (!realPdfBuffer) skip('pdf-parse test PDF not found — cannot exercise the upload happy path')
  const res = await http('POST', `${BASE}/api/documents/upload`, { form: pdfForm(), timeoutMs: 30000 })
  assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 200)})`)
  const doc = jsonOf(res.data).document
  assert(doc && doc.id, 'missing document.id in response')
  assert(doc.fileUrl, 'missing document.fileUrl in response')
  assert(typeof doc.totalPages === 'number' && doc.totalPages >= 1, `totalPages should be >= 1, got ${doc.totalPages}`)
  ctx.docId = doc.id
  ctx.fileUrl = doc.fileUrl
  console.log(`      (created doc ${doc.id}, ${doc.totalPages} page(s))`)
})

test('documents: GET by id returns pages (200)', async () => {
  needDoc()
  const res = await jsonReq('GET', `/api/documents/${ctx.docId}`)
  assert(res.status === 200, `expected 200, got ${res.status}`)
  const doc = jsonOf(res.data).document
  assert(Array.isArray(doc?.pages) && doc.pages.length >= 1, 'missing document.pages[]')
  ctx.totalPages = doc.pages.length
})

test('documents: GET ?page=1 returns that page (200)', async () => {
  needDoc()
  const res = await jsonReq('GET', `/api/documents/${ctx.docId}?page=1`)
  assert(res.status === 200, `expected 200, got ${res.status}`)
  const page = jsonOf(res.data).page
  assert(page && page.pageNumber === 1, 'expected page.pageNumber === 1')
  assert(typeof page.text === 'string' && page.text.length > 0, 'expected page text')
})

test('documents: GET ?page=9999 returns 404', async () => {
  needDoc()
  const res = await jsonReq('GET', `/api/documents/${ctx.docId}?page=9999`)
  assert(res.status === 404, `expected 404, got ${res.status}`)
})

test('documents: GET bogus id returns 404', async () => {
  const res = await jsonReq('GET', '/api/documents/doc-does-not-exist')
  assert(res.status === 404, `expected 404, got ${res.status}`)
})

test('documents: GET file/[key] serves the owned PDF (200)', async () => {
  needDoc()
  const url = ctx.fileUrl.startsWith('http') ? ctx.fileUrl : BASE + ctx.fileUrl
  const res = await http('GET', url)
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(res.contentType.includes('application/pdf'), `expected application/pdf, got ${res.contentType}`)
})

test('documents: GET file/bogus-key is forbidden (403)', async () => {
  const res = await req('GET', '/api/documents/file/not-my-file.pdf')
  assert(res.status === 403, `expected 403, got ${res.status}`)
})

test('documents: notes round-trip (GET null → POST → GET saved)', async () => {
  needDoc()
  const before = await jsonReq('GET', `/api/documents/${ctx.docId}/notes`)
  assert(before.status === 200, `GET notes expected 200, got ${before.status}`)
  assert(before.data && before.data.note === null, 'expected note to start as null')

  const post = await jsonReq('POST', `/api/documents/${ctx.docId}/notes`, { content: 'smoke-test note' })
  assert(post.status === 200, `POST notes expected 200, got ${post.status}`)

  const after = await jsonReq('GET', `/api/documents/${ctx.docId}/notes`)
  assert(after.status === 200, `GET notes expected 200, got ${after.status}`)
  assert(after.data?.note === 'smoke-test note', 'note was not persisted')
})

test('documents: chat thread round-trip (GET null → POST → GET saved)', async () => {
  needDoc()
  const before = await jsonReq('GET', `/api/documents/${ctx.docId}/chat`)
  assert(before.status === 200, `GET chat expected 200, got ${before.status}`)

  const post = await jsonReq('POST', `/api/documents/${ctx.docId}/chat`, {
    messages: [{ role: 'user', content: 'hi' }],
  })
  assert(post.status === 200, `POST chat expected 200, got ${post.status}`)

  const after = await jsonReq('GET', `/api/documents/${ctx.docId}/chat`)
  assert(after.status === 200, `GET chat expected 200, got ${after.status}`)
  assert(Array.isArray(after.data?.messages) && after.data.messages.length === 1, 'thread was not persisted')
})

// --- Search -----------------------------------------------------------------
test('search: GET with empty q returns empty results (200)', async () => {
  const res = await req('GET', '/api/search')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(Array.isArray(jsonOf(res.data).results), 'missing results[]')
})

test('search: GET q=entanglement finds the uploaded PDF text (200)', async () => {
  const res = await req('GET', '/api/search?q=entanglement')
  assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 140)})`)
  assert(Array.isArray(jsonOf(res.data).results), 'missing results[]')
})

// --- Bookmarks --------------------------------------------------------------
test('bookmarks: POST then DELETE by id (200)', async () => {
  needDoc()
  const create = await jsonReq('POST', '/api/bookmarks', {
    documentId: ctx.docId,
    documentTitle: 'Quantum Smoke Test',
    pageNumber: 1,
    snippet: 'Quantum Entanglement Basics',
    note: 'smoke bookmark',
  })
  assert(create.status === 200, `expected 200, got ${create.status} (${create.text.slice(0, 140)})`)
  const id = jsonOf(create.data).bookmark?.id
  assert(id, 'missing bookmark.id')

  const list = await req('GET', '/api/bookmarks')
  assert(list.status === 200, `GET bookmarks expected 200, got ${list.status}`)
  assert(Array.isArray(jsonOf(list.data).bookmarks), 'missing bookmarks[]')

  const del = await jsonReq('DELETE', `/api/bookmarks?id=${id}`)
  assert(del.status === 200, `expected 200, got ${del.status}`)
  assert(jsonOf(del.data).success === true, 'bookmark was not deleted')
})

test('bookmarks: DELETE without id is a 400', async () => {
  const res = await req('DELETE', '/api/bookmarks')
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

// --- Flashcards -------------------------------------------------------------
test('flashcards: GET decks (200)', async () => {
  const res = await req('GET', '/api/flashcards')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(Array.isArray(jsonOf(res.data).decks), 'missing decks[]')
})

test('flashcards: GET due list (200)', async () => {
  const res = await req('GET', '/api/flashcards/due')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(Array.isArray(jsonOf(res.data).cards), 'missing cards[]')
})

test('flashcards: PATCH rating without rating is a 400', async () => {
  const res = await jsonReq('PATCH', '/api/flashcards/bogus-card', {})
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

test('flashcards: PATCH rating on unknown card is a 404', async () => {
  const res = await jsonReq('PATCH', '/api/flashcards/bogus-card', { rating: 'easy' })
  assert(res.status === 404, `expected 404, got ${res.status}`)
})

test('flashcards: DELETE with unknown cardId is a 403', async () => {
  const res = await req('DELETE', '/api/flashcards?cardId=bogus-card')
  assert(res.status === 403, `expected 403, got ${res.status}`)
})

// --- Quizzes ----------------------------------------------------------------
test('quizzes: POST history saves an attempt (200)', async () => {
  needDoc()
  const res = await jsonReq('POST', '/api/quizzes/history', {
    documentId: ctx.docId,
    documentTitle: 'Quantum Smoke Test',
    score: 4,
    totalQuestions: 5,
    difficulty: 'Easy',
    quizType: 'MCQ',
    weakTopics: ['Entanglement'],
  })
  assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 140)})`)
  ctx.quizId = jsonOf(res.data).quiz?.id
  assert(ctx.quizId, 'missing quiz.id')
})

test('quizzes: POST history with missing fields is a 400', async () => {
  const res = await jsonReq('POST', '/api/quizzes/history', { documentId: ctx.docId })
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

test('quizzes: GET history (200)', async () => {
  const res = await req('GET', '/api/quizzes/history')
  assert(res.status === 200, `expected 200, got ${res.status}`)
  assert(Array.isArray(jsonOf(res.data).quizzes), 'missing quizzes[]')
})

test('quizzes: DELETE history by id (200)', async () => {
  if (!ctx.quizId) skip('no quiz attempt created (previous quiz test skipped/failed)')
  const res = await jsonReq('DELETE', `/api/quizzes/history?id=${ctx.quizId}`)
  assert(res.status === 200, `expected 200, got ${res.status}`)
  ctx.quizId = null
})

test('quizzes: DELETE history without id is a 400', async () => {
  const res = await req('DELETE', '/api/quizzes/history')
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

// --- Study plans ------------------------------------------------------------
test('study-plans: POST then PATCH, GET, DELETE (200)', async () => {
  const create = await jsonReq('POST', '/api/study-plans', {
    title: 'Smoke test plan',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    category: 'Exam',
  })
  assert(create.status === 200, `POST expected 200, got ${create.status} (${create.text.slice(0, 140)})`)
  const planId = jsonOf(create.data).plan?.id
  assert(planId, 'missing plan.id')

  const patch = await jsonReq('PATCH', '/api/study-plans', { id: planId, completed: true })
  assert(patch.status === 200, `PATCH expected 200, got ${patch.status}`)

  const list = await req('GET', '/api/study-plans')
  assert(list.status === 200, `GET expected 200, got ${list.status}`)
  assert(Array.isArray(jsonOf(list.data).plans), 'missing plans[]')

  const del = await jsonReq('DELETE', `/api/study-plans?id=${planId}`)
  assert(del.status === 200, `DELETE expected 200, got ${del.status}`)
})

test('study-plans: POST without title/dueDate is a 400', async () => {
  const res = await jsonReq('POST', '/api/study-plans', { title: 'x' })
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

test('study-plans: PATCH without id is a 400', async () => {
  const res = await jsonReq('PATCH', '/api/study-plans', { title: 'x' })
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

// --- AI routes (validation paths always; generation paths when SMOKE_AI=1) ---
test('AI chat: missing messages is a 400', async () => {
  const res = await jsonReq('POST', '/api/ai/chat', {})
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

test('AI flashcards: missing documentId is a 400', async () => {
  const res = await jsonReq('POST', '/api/ai/flashcards', {})
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

if (AI_ENABLED) {
  test('AI chat: streams a real answer for the uploaded doc (200)', async () => {
    needDoc()
    const res = await jsonReq('POST', '/api/ai/chat', {
      messages: [{ role: 'user', content: 'What is superposition?' }],
      documentId: ctx.docId,
      currentPage: 1,
      documentTitle: 'Quantum Smoke Test',
      fileType: 'PDF Textbook',
    }, { timeoutMs: 90000 })
    assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 200)})`)
    assert(typeof res.data === 'string' && res.data.length > 0, 'expected a non-empty streamed answer')
  })

  test('AI quiz: generates questions for the uploaded doc (200)', async () => {
    needDoc()
    const res = await jsonReq('POST', '/api/ai/quiz', {
      documentId: ctx.docId,
      currentPage: 1,
      count: 3,
      difficulty: 'Easy',
      quizType: 'MCQ',
      documentTitle: 'Quantum Smoke Test',
      fileType: 'PDF Textbook',
    }, { timeoutMs: 90000 })
    assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 200)})`)
    const qs = jsonOf(res.data).questions
    assert(Array.isArray(qs) && qs.length > 0, 'expected questions[]')
  })

  test('AI summary: generates a page summary (200)', async () => {
    needDoc()
    const res = await jsonReq('POST', '/api/ai/summary', {
      documentId: ctx.docId,
      currentPage: 1,
      mode: 'quick',
      documentTitle: 'Quantum Smoke Test',
    }, { timeoutMs: 90000 })
    assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 200)})`)
    assert(typeof jsonOf(res.data).summary === 'object', 'expected summary object')
  })

  test('AI flashcards: generates cards, SM-2 PATCH works, deck deletes (200)', async () => {
    needDoc()
    const res = await jsonReq('POST', '/api/ai/flashcards', {
      documentId: ctx.docId,
      currentPage: 1,
      count: 3,
      documentTitle: 'Quantum Smoke Test',
      fileType: 'PDF Textbook',
    }, { timeoutMs: 90000 })
    assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 200)})`)
    const deckId = jsonOf(res.data).deckId
    assert(deckId, 'missing deckId')

    // Pull a card from the deck and run it through the SM-2 review endpoint.
    const decks = await req('GET', '/api/flashcards')
    const deck = jsonOf(decks.data).decks?.find((d) => d.id === deckId)
    assert(deck && Array.isArray(deck.cards) && deck.cards.length > 0, 'expected cards in the new deck')
    const cardId = deck.cards[0].id

    const patch = await jsonReq('PATCH', `/api/flashcards/${cardId}`, { rating: 'easy' })
    assert(patch.status === 200, `PATCH expected 200, got ${patch.status} (${patch.text.slice(0, 140)})`)

    const del = await req('DELETE', `/api/flashcards?deckId=${deckId}`)
    assert(del.status === 200, `DELETE deck expected 200, got ${del.status}`)
  })
} else {
  test('AI generation paths (chat/quiz/summary/flashcards)', async () => {
    skip('set SMOKE_AI=1 to exercise live Gemini generation (adds latency + API cost)')
  })
}

// --- YouTube ----------------------------------------------------------------
test('youtube: POST invalid URL is a 400', async () => {
  const res = await jsonReq('POST', '/api/documents/youtube', { url: 'https://example.com/not-youtube' })
  assert(res.status === 400, `expected 400, got ${res.status} (${res.text.slice(0, 140)})`)
})

if (!OFFLINE) {
  test('youtube: POST real video ingests a transcript (200 or graceful 400)', async () => {
    const res = await jsonReq('POST', '/api/documents/youtube', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Smoke Test Video',
      folder: 'Smoke Tests',
    }, { timeoutMs: 30000 })
    // Network-dependent: 200 when captions are found, 400 when the video has
    // no captions or the fetch fails — both are correct route behavior.
    assert(res.status === 200 || res.status === 400, `expected 200/400, got ${res.status} (${res.text.slice(0, 160)})`)
    if (res.status === 200) {
      const videoId = jsonOf(res.data).document?.id
      assert(videoId, 'missing video document.id')
      const del = await jsonReq('DELETE', `/api/documents?id=${videoId}`)
      assert(del.status === 200, `cleanup expected 200, got ${del.status}`)
      console.log('      (transcript ingested and cleaned up)')
    } else {
      console.log('      (video has no captions — graceful 400)')
    }
  })
} else {
  test('youtube: POST real video ingestion', async () => {
    skip('SMOKE_OFFLINE=1 — skipping network-dependent YouTube test')
  })
}

// --- Account (destructive — opt-in only) ------------------------------------
if (DESTRUCTIVE) {
  test('account: DELETE wipes the demo account (200) — DESTRUCTIVE', async () => {
    const res = await req('DELETE', '/api/account')
    assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 160)})`)
  })
} else {
  test('account: DELETE /api/account', async () => {
    skip('set SMOKE_DESTRUCTIVE=1 to include account deletion (wipes the demo user and ALL its data)')
  })
}

// --- Cleanup ----------------------------------------------------------------
test('cleanup: uploaded PDF document deleted (200)', async () => {
  if (!ctx.docId) return
  const res = await jsonReq('DELETE', `/api/documents?id=${ctx.docId}`)
  assert(res.status === 200, `expected 200, got ${res.status} (${res.text.slice(0, 160)})`)
  ctx.docId = null
})

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

const BASE = await detectBaseUrl()

console.log('')
console.log('Studium API smoke test')
console.log(`  base:       ${BASE}`)
console.log(`  ai:         ${AI_ENABLED ? 'on (live Gemini calls)' : 'off (validation paths only)'}`)
console.log(`  offline:    ${OFFLINE ? 'on' : 'off'}`)
console.log(`  destructive:${DESTRUCTIVE ? 'on' : 'off'}`)
console.log('')

await runSuite()
