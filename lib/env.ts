/**
 * Central env validation — fail fast in production with a clear message
 * instead of `https://undefined...` or silent embedding failures.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    // In dev, allow missing (local .data fallback / demo paths).
    // In production, crash early so Vercel logs show exactly what's missing.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `[env] Missing required environment variable ${name}. Set it in Vercel → Settings → Environment Variables.`
      )
    }
    return ''
  }
  return value
}

export const env = {
  get DATABASE_URL() {
    return required('DATABASE_URL')
  },
  get GEMINI_API_KEY() {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || required('GEMINI_API_KEY')
  },
  get R2_ACCOUNT_ID() {
    return required('R2_ACCOUNT_ID')
  },
  get R2_ACCESS_KEY_ID() {
    return required('R2_ACCESS_KEY_ID')
  },
  get R2_SECRET_ACCESS_KEY() {
    return required('R2_SECRET_ACCESS_KEY')
  },
  get R2_BUCKET_NAME() {
    // Default matches .env.example (`studium`), not the old `studium-pdfs`.
    return process.env.R2_BUCKET_NAME || (process.env.NODE_ENV === 'production' ? required('R2_BUCKET_NAME') : 'studium')
  },
}

/** Returns true only when demo auth is explicitly opted-in AND not production. */
export function isDemoAuthEnabled(): boolean {
  return process.env.ALLOW_DEMO_AUTH === '1' && process.env.NODE_ENV !== 'production'
}
