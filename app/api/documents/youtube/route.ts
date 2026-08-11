import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { saveStoredDocument, StoredDocument, PageChunk } from '@/lib/documents-store'

function extractVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}

export async function POST(req: NextRequest) {
  try {
    const { url, title, folder = 'General' } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Fetch transcript
    let transcriptData = []
    try {
      transcriptData = await YoutubeTranscript.fetchTranscript(videoId)
    } catch (e: any) {
      return NextResponse.json({ error: 'Could not fetch transcript. The video might not have captions enabled.' }, { status: 400 })
    }

    // Chunk into "Pages" (1 page = 3 minutes of video)
    // This allows the frontend to easily map video time to Page Number.
    const CHUNK_SIZE_MS = 3 * 60 * 1000 // 3 minutes
    const pagesMap: Record<number, string[]> = {}

    for (const item of transcriptData) {
      // offset is in milliseconds in some versions, or seconds. YoutubeTranscript returns offset in milliseconds or seconds?
      // Actually youtube-transcript returns { text: string, duration: number, offset: number } where offset is in milliseconds.
      const offsetMs = item.offset
      const pageNumber = Math.floor(offsetMs / CHUNK_SIZE_MS) + 1
      
      if (!pagesMap[pageNumber]) pagesMap[pageNumber] = []
      pagesMap[pageNumber].push(item.text)
    }

    const pages: PageChunk[] = Object.keys(pagesMap).map(pageNum => {
      const p = parseInt(pageNum)
      const textContent = pagesMap[p].join(' ')
      return {
        pageNumber: p,
        text: textContent,
        wordCount: textContent.split(/\s+/).filter(Boolean).length
      }
    })

    const docId = `doc-${Date.now()}`
    
    // We store the youtube embed URL in fileUrl
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`

    const newDoc: StoredDocument = {
      id: docId,
      title: title || `YouTube Video (${videoId})`,
      fileType: 'YouTube Video',
      totalPages: pages.length || 1,
      uploadedAt: new Date().toISOString(),
      folder,
      pages,
      fileUrl: embedUrl,
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
    console.error('Error ingesting youtube video:', error)
    return NextResponse.json({ error: error.message || 'Failed to ingest video' }, { status: 500 })
  }
}
