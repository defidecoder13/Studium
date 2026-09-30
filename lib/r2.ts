import { S3Client } from '@aws-sdk/client-s3'
import { env } from './env'

let _client: S3Client | null = null

/**
 * Lazy R2 client — validates env on first use (fail fast in prod)
 * instead of building `https://undefined.r2...` at import time.
 */
export function getR2Client(): S3Client {
  if (_client) return _client
  // Single source of truth for validation/messages: lib/env.
  const accountId = env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId || 'missing-account'}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId || '',
      secretAccessKey: secretAccessKey || '',
    },
  })
  return _client
}

// Back-compat: existing imports keep working, but route handlers should
// prefer getR2Client() so missing env throws a clear error at request time.
export const r2Client: S3Client = new Proxy({} as S3Client, {
  get(_t, prop) {
    const client = getR2Client() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === 'function' ? (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(client, args) : value
  },
})

export const R2_BUCKET_NAME = env.R2_BUCKET_NAME
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''
