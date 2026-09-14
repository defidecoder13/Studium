import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { r2Client, R2_BUCKET_NAME } from './r2'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface StorageAdapterResult {
  url: string
  key: string
  sizeBytes: number
}

// Toggle this variable to switch between Cloudflare R2 and Local file system storage
export const USE_CLOUD_STORAGE = true

/**
 * Uploads a file (Buffer) to either Cloudflare R2 (production) or the local `.data/` folder (local dev).
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<StorageAdapterResult> {
  const uniqueId = uuidv4()
  // Clean filename: remove special characters and spaces
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storageKey = `${Date.now()}-${uniqueId}-${safeName}`
  const sizeBytes = fileBuffer.length

  if (USE_CLOUD_STORAGE) {
    // 1. Upload to Cloudflare R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: mimeType,
      })
    )

    return {
      url: `/api/documents/file/${storageKey}`,
      key: storageKey,
      sizeBytes,
    }
  } else {
    // 2. Upload to Local File System (.data/uploads)
    const DATA_DIR = path.join(process.cwd(), '.data', 'uploads')
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    const filePath = path.join(DATA_DIR, storageKey)
    fs.writeFileSync(filePath, fileBuffer)

    // Local URL (proxied through the same endpoint)
    return {
      url: `/api/documents/file/${storageKey}`,
      key: storageKey,
      sizeBytes,
    }
  }
}

/**
 * Extracts the storage key from a `/api/documents/file/[key]` URL.
 * Returns null for external/missing URLs.
 */
export function extractKeyFromFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null
  const marker = '/api/documents/file/'
  const idx = fileUrl.indexOf(marker)
  if (idx === -1) return null
  const key = fileUrl.slice(idx + marker.length).split('?')[0]
  // Guard against path traversal — keys are flat `timestamp-uuid-filename` strings.
  if (!key || key.includes('/') || key.includes('..')) return null
  return key
}

/**
 * Deletes a stored file by key. Never throws — storage cleanup must not
 * block DB deletion (orphan cleanup can be retried later).
 */
export async function deleteFile(storageKey: string): Promise<void> {
  try {
    if (USE_CLOUD_STORAGE) {
      await r2Client.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: storageKey })
      )
    } else {
      const filePath = path.join(process.cwd(), '.data', 'uploads', storageKey)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
  } catch (e) {
    console.error('[storage] failed to delete file:', storageKey, e)
  }
}
