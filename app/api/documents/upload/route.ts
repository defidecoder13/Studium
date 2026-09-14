import { NextRequest, NextResponse } from 'next/server'
import { saveStoredDocument, StoredDocument, PageChunk } from '@/lib/documents-store'
import { uploadFile } from '@/lib/storage-adapter'
import { getCurrentUserId } from '@/lib/auth'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import { getErrorMessage } from '@/lib/utils'
import pdfParse from 'pdf-parse'
import { headers } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = checkRateLimit(`ingest:${userId}`, 10, 60_000)
    if (!allowed) return rateLimitedResponse(retryAfterSec)
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'General'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Only accept real PDFs: check the magic bytes (%PDF-) before pdf-parse runs.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Vercel serverless body limit (~4.5 MB on Hobby) + 30s maxDuration for
    // pdf-parse + per-page Gemini embeddings: reject oversized docs early
    // with a clear 413 instead of a cryptic timeout.
    const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
    const MAX_PAGES = 50
    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum PDF size is 10 MB. Please split the document and upload in parts.' },
        { status: 413 }
      )
    }
    const isPdf = buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-'
    if (!isPdf) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF document (not a Word doc, image, or archive).' },
        { status: 400 }
      )
    }

    // Capture text per page using custom pagerender function
    const pageTexts: string[] = []

    interface PdfPageItem {
      str: string
      transform: number[]
    }

    const renderPage = async (pageData: { getTextContent: () => Promise<{ items: PdfPageItem[] }> }) => {
      const textContent = await pageData.getTextContent()
      let lastY = -1
      let text = ''
      for (const item of textContent.items) {
        if (lastY !== item.transform[5] && lastY !== -1) {
          text += '\n'
        }
        text += item.str + ' '
        lastY = item.transform[5]
      }
      pageTexts.push(text.trim())
      return text
    }

    const parsed = await pdfParse(buffer, { pagerender: renderPage })

    const pages: PageChunk[] = pageTexts.map((text, index) => ({
      pageNumber: index + 1,
      text: text || `[Page ${index + 1} content diagram/formula]`,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    }))

    // If for some reason pageTexts was empty, split full text by page approximations
    if (pages.length === 0 && parsed.text) {
      const approxPages = Math.max(1, parsed.numpages || 1)
      const chunkSize = Math.ceil(parsed.text.length / approxPages)
      for (let i = 0; i < approxPages; i++) {
        const textChunk = parsed.text.slice(i * chunkSize, (i + 1) * chunkSize)
        pages.push({
          pageNumber: i + 1,
          text: textChunk.trim(),
          wordCount: textChunk.split(/\s+/).filter(Boolean).length,
        })
      }
    }

    if (pages.length > MAX_PAGES) {
      return NextResponse.json(
        { error: `Document has ${pages.length} pages. Maximum is ${MAX_PAGES} pages per upload — please split the PDF and upload in parts.` },
        { status: 413 }
      )
    }
    if (pages.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract any pages from this PDF. The file may be scanned images without selectable text.' },
        { status: 422 }
      )
    }

    const docId = `doc-${Date.now()}`
    
    // Upload file to Object Storage (Cloudflare R2 or Local)
    const mimeType = 'application/pdf'
    const storageResult = await uploadFile(buffer, file.name, mimeType)

    const newDoc: StoredDocument = {
      id: docId,
      title: file.name,
      fileType: 'PDF Textbook',
      totalPages: pages.length,
      uploadedAt: new Date().toISOString(),
      folder,
      pages,
      fileUrl: storageResult.url, // Store the public R2/Local URL
      fileSize: `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`,
    }

    await saveStoredDocument(newDoc, userId)

    return NextResponse.json({
      success: true,
      document: {
        id: newDoc.id,
        title: newDoc.title,
        fileType: newDoc.fileType,
        totalPages: newDoc.totalPages,
        folder: newDoc.folder,
        fileUrl: newDoc.fileUrl,
      },
    })
  } catch (error) {
    console.error('Error in PDF upload route:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to parse document') }, { status: 500 })
  }
}
