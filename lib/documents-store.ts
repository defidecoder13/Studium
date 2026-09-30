import { prisma } from './db'
import { DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_NAME } from './auth'
import { generateEmbedding } from './ai-embeddings'

export interface PageChunk {
  pageNumber: number
  text: string
  wordCount: number
}

export interface StoredDocument {
  id: string
  title: string
  fileType: string
  totalPages: number
  uploadedAt: string
  folder: string
  pages: PageChunk[]
  fileUrl?: string
  fileSize?: string
}

/**
 * Ensure the given user row exists so documents can be created against it.
 * Real authenticated users already exist; this mainly covers the dev/demo user.
 */
export async function ensureUserExists(userId: string) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      await prisma.user.create({
        data: {
          id: userId,
          name: userId === DEMO_USER_ID ? DEMO_USER_NAME : 'Studium User',
          email: userId === DEMO_USER_ID ? DEMO_USER_EMAIL : `user_${userId}@studium.local`,
          emailVerified: true,
        },
      })
    }
  } catch (e) {
    console.error('Error ensuring user exists:', e)
  }
}

export const getStoredDocuments = async (
  userId: string,
  opts?: { take?: number; cursor?: string }
): Promise<StoredDocument[]> => {
  try {
    // List view never needs page texts — select scalar fields only.
    // Previously `include: { pages: true }` loaded every page's full text
    // into memory just to discard it in the route. take/cursor paginate.
    const take = Math.max(1, Math.min(opts?.take ?? 50, 100))
    const docs = await prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        fileType: true,
        totalPages: true,
        uploadedAt: true,
        folder: true,
        fileUrl: true,
        fileSize: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: take + 1,
      ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    })

    return docs.slice(0, take).map((d) => ({
      id: d.id,
      title: d.title,
      fileType: d.fileType,
      totalPages: d.totalPages,
      uploadedAt: d.uploadedAt.toISOString(),
      folder: d.folder,
      fileUrl: d.fileUrl || undefined,
      fileSize: d.fileSize,
      pages: [],
    }))
  } catch (error) {
    console.error('Error fetching documents', error)
    return []
  }
}

export const getStoredDocumentById = async (id: string, userId?: string): Promise<StoredDocument | null> => {
  try {
    const d = await prisma.document.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: { pages: true }
    })
    if (!d) return null
    return {
      id: d.id,
      title: d.title,
      fileType: d.fileType,
      totalPages: d.totalPages,
      uploadedAt: d.uploadedAt.toISOString(),
      folder: d.folder,
      fileUrl: d.fileUrl || undefined,
      fileSize: d.fileSize,
      pages: d.pages.map(p => ({
        pageNumber: p.pageNumber,
        text: p.textContent,
        wordCount: p.wordCount
      }))
    }
  } catch (error) {
    console.error('Error fetching document', error)
    return null
  }
}

export const saveStoredDocument = async (doc: StoredDocument, userId: string): Promise<void> => {
  await ensureUserExists(userId)

  // Owner-scoped upsert: never overwrite another user's document on ID collision.
  const existing = await prisma.document.findUnique({
    where: { id: doc.id },
    select: { userId: true },
  })
  if (existing && existing.userId !== userId) {
    throw new Error('Document ID collision: forbidden')
  }
  // Upsert the core document record (ownership already verified above)
  await prisma.document.upsert({
    where: { id: doc.id },
    update: {
      title: doc.title,
      fileType: doc.fileType,
      totalPages: doc.totalPages,
      folder: doc.folder,
      fileUrl: doc.fileUrl,
      ...(doc.fileSize ? { fileSize: doc.fileSize } : {}),
    },
    create: {
      id: doc.id,
      userId,
      title: doc.title,
      fileType: doc.fileType,
      totalPages: doc.totalPages,
      folder: doc.folder,
      fileUrl: doc.fileUrl,
      ...(doc.fileSize ? { fileSize: doc.fileSize } : {}),
    }
  })

  // Delete old pages
  await prisma.pageChunk.deleteMany({ where: { documentId: doc.id } })

  // Embeddings: concurrency 5 (was fully serial: 50 pages = 50x Gemini RTT
  // inside the 30s maxDuration). Cap text per page to bound token cost.
  const CONCURRENCY = 5
  const queue = [...doc.pages]
  const prepared: { p: (typeof doc.pages)[number]; vector: number[] }[] = []
  async function worker() {
    while (queue.length > 0) {
      const p = queue.shift()!
      let vector: number[] = []
      // Some pages (like pure images) might have empty text.
      if (p.text && p.text.trim().length > 0) {
        try {
          vector = await generateEmbedding(p.text.slice(0, 8000))
        } catch (e) {
          console.error('Embedding failed, storing page without vector:', e)
          vector = []
        }
      }
      prepared.push({ p, vector })
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
  )
  prepared.sort((a, b) => a.p.pageNumber - b.p.pageNumber)

  // Bulk insert (was 50x individual INSERTs). createMany can't set the
  // vector column via Prisma, so batch raw inserts in groups of 10.
  const BATCH = 10
  for (let i = 0; i < prepared.length; i += BATCH) {
    const batch = prepared.slice(i, i + BATCH)
    await Promise.all(
      batch.map(({ p, vector }) => {
        const chunkId = crypto.randomUUID()
        if (vector.length > 0 && vector.every((n) => Number.isFinite(n))) {
          const vectorStr = `[${vector.join(',')}]`
          return prisma.$executeRaw`
            INSERT INTO "PageChunk" ("id", "documentId", "pageNumber", "textContent", "wordCount", "embedding")
            VALUES (${chunkId}, ${doc.id}, ${p.pageNumber}, ${p.text}, ${p.wordCount}, ${vectorStr}::vector)
          `
        }
        return prisma.$executeRaw`
          INSERT INTO "PageChunk" ("id", "documentId", "pageNumber", "textContent", "wordCount")
          VALUES (${chunkId}, ${doc.id}, ${p.pageNumber}, ${p.text}, ${p.wordCount})
        `
      })
    )
  }
}

export const deleteStoredDocument = async (id: string, userId: string): Promise<boolean> => {
  try {
    // Fetch fileUrl first so we can clean up the R2/local object after DB delete.
    const existing = await prisma.document.findFirst({
      where: { id, userId },
      select: { fileUrl: true },
    })
    const result = await prisma.document.deleteMany({ where: { id, userId } })
    if (result.count > 0 && existing?.fileUrl) {
      const { extractKeyFromFileUrl, deleteFile } = await import('./storage-adapter')
      const key = extractKeyFromFileUrl(existing.fileUrl)
      if (key) await deleteFile(key)
    }
    return result.count > 0
  } catch {
    return false
  }
}

export const searchDocumentPages = async (query: string, documentId?: string, userId?: string) => {
  const q = query.slice(0, 200).trim()
  if (!q) return []

  try {
    // DB-level ILIKE with take — previously loaded ALL docs + ALL pages
    // into Node and filtered in JS (full-table scan in memory).
    const chunks = await prisma.pageChunk.findMany({
      where: {
        textContent: { contains: q, mode: 'insensitive' },
        ...(documentId || userId
          ? {
              document: {
                ...(documentId ? { id: documentId } : {}),
                ...(userId ? { userId } : {}),
              },
            }
          : {}),
      },
      select: {
        pageNumber: true,
        textContent: true,
        documentId: true,
        document: { select: { title: true } },
      },
      orderBy: { pageNumber: 'asc' },
      take: 15,
    })

    return chunks.map((c) => {
      const lower = c.textContent.toLowerCase()
      const idx = lower.indexOf(q.toLowerCase())
      const at = idx >= 0 ? idx : 0
      const start = Math.max(0, at - 60)
      const end = Math.min(c.textContent.length, at + q.length + 140)
      const snippet =
        (start > 0 ? '...' : '') +
        c.textContent.slice(start, end).replace(/\n+/g, ' ') +
        (end < c.textContent.length ? '...' : '')
      return {
        documentId: c.documentId,
        documentTitle: c.document.title,
        pageNumber: c.pageNumber,
        snippet,
      }
    })
  } catch (e) {
    console.error('Error searching pages', e)
    return []
  }
}
