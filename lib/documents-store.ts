import { prisma } from './db'

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
}

const DUMMY_USER_ID = 'user_123'

async function ensureDummyUser() {
  try {
    const user = await prisma.user.findUnique({ where: { id: DUMMY_USER_ID } })
    if (!user) {
      await prisma.user.create({
        data: {
          id: DUMMY_USER_ID,
          name: 'Demo User',
          email: 'demo@example.com',
          emailVerified: true
        }
      })
    }
  } catch (e) {
    console.error('Error ensuring dummy user:', e)
  }
}

export const getStoredDocuments = async (): Promise<StoredDocument[]> => {
  try {
    const docs = await prisma.document.findMany({
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

export const getStoredDocumentById = async (id: string): Promise<StoredDocument | null> => {
  try {
    const d = await prisma.document.findUnique({
      where: { id },
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

import { generateEmbedding } from './ai-embeddings'

export const saveStoredDocument = async (doc: StoredDocument): Promise<void> => {
  await ensureDummyUser()
  
  // Upsert the core document record first
  await prisma.document.upsert({
    where: { id: doc.id },
    update: {
      title: doc.title,
      fileType: doc.fileType,
      totalPages: doc.totalPages,
      folder: doc.folder,
      fileUrl: doc.fileUrl,
    },
    create: {
      id: doc.id,
      userId: DUMMY_USER_ID,
      title: doc.title,
      fileType: doc.fileType,
      totalPages: doc.totalPages,
      folder: doc.folder,
      fileUrl: doc.fileUrl,
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

export const deleteStoredDocument = async (id: string): Promise<boolean> => {
  try {
    await prisma.document.delete({ where: { id } })
    return true
  } catch (e) {
    return false
  }
}

export const searchDocumentPages = async (query: string, documentId?: string) => {
  const q = query.toLowerCase().trim()
  if (!q) return []

  try {
    const targetDocs = await prisma.document.findMany({
      where: documentId ? { id: documentId } : {},
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
