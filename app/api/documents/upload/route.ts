import { NextRequest, NextResponse } from 'next/server'
import { saveStoredDocument, StoredDocument, PageChunk } from '@/lib/documents-store'
import { uploadFile } from '@/lib/storage-adapter'

const pdfParse = require('pdf-parse')

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'General'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Capture text per page using custom pagerender function
    const pageTexts: string[] = []
    
    const renderPage = async (pageData: any) => {
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
    const totalPages = parsed.numpages || pageTexts.length || 1

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

    const docId = `doc-${Date.now()}`
    
    // Upload file to Object Storage (Cloudflare R2 or Local)
    const mimeType = file.type || 'application/pdf'
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
    }

    await saveStoredDocument(newDoc)

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
  } catch (error: any) {
    console.error('Error in PDF upload route:', error)
    return NextResponse.json({ error: error.message || 'Failed to parse document' }, { status: 500 })
  }
}
