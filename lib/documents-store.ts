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

export const getStoredDocuments = async (userId: string): Promise<StoredDocument[]> => {
  try {
    const docs = await prisma.document.findMany({
      where: { userId },
      include: { pages: true },
      orderBy: { uploadedAt: 'desc' }
    })
    
    return docs.map(d => ({
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
  
  // Upsert the core document record first
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

  // Insert new pages along with their embeddings
  for (const p of doc.pages) {
    const chunkId = crypto.randomUUID()
    
    // Some pages (like pure images) might have empty text.
    let vector: number[] = []
    if (p.text && p.text.trim().length > 0) {
      vector = await generateEmbedding(p.text)
    }

    if (vector.length > 0) {
      const vectorStr = `[${vector.join(',')}]`
      await prisma.$executeRaw`
        INSERT INTO "PageChunk" ("id", "documentId", "pageNumber", "textContent", "wordCount", "embedding")
        VALUES (${chunkId}, ${doc.id}, ${p.pageNumber}, ${p.text}, ${p.wordCount}, ${vectorStr}::vector)
      `
    } else {
      await prisma.$executeRaw`
        INSERT INTO "PageChunk" ("id", "documentId", "pageNumber", "textContent", "wordCount")
        VALUES (${chunkId}, ${doc.id}, ${p.pageNumber}, ${p.text}, ${p.wordCount})
      `
    }
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
  const q = query.toLowerCase().trim()
  if (!q) return []

  try {
    const targetDocs = await prisma.document.findMany({
      where: {
        ...(documentId ? { id: documentId } : {}),
        ...(userId ? { userId } : {}),
      },
      include: { pages: true }
    })
    
    const results: { documentTitle: string; pageNumber: number; snippet: string; documentId: string }[] = []

    for (const doc of targetDocs) {
      for (const page of doc.pages) {
        if (page.textContent.toLowerCase().includes(q)) {
          const idx = page.textContent.toLowerCase().indexOf(q)
          const start = Math.max(0, idx - 60)
          const end = Math.min(page.textContent.length, idx + q.length + 140)
          const snippet = (start > 0 ? '...' : '') + page.textContent.slice(start, end).replace(/\n+/g, ' ') + (end < page.textContent.length ? '...' : '')

          results.push({
            documentId: doc.id,
            documentTitle: doc.title,
            pageNumber: page.pageNumber,
            snippet,
          })
        }
      }
    }

    return results.slice(0, 15)
  } catch (e) {
    console.error('Error searching pages', e)
    return []
  }
}
