import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { saveStoredDocument, StoredDocument, PageChunk } from '@/lib/documents-store'
import { getCurrentUserId } from '@/lib/auth'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

function extractVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `ingest:${userId}`, RATE_PRESETS.ingest.limit, RATE_PRESETS.ingest.windowMs, RATE_PRESETS.ingest.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)
    const { url, title, folder = 'General' } = await req.json()

    if (typeof url !== 'string' || url.length > 500) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
    }
    const safeFolder = (typeof folder === 'string' ? folder : 'General').slice(0, 80) || 'General'

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Fetch transcript
    let transcriptData: Array<{ text: string; duration: number; offset: number }> = []
    try {
      transcriptData = await YoutubeTranscript.fetchTranscript(videoId)
    } catch {
      return NextResponse.json({ error: 'Could not fetch transcript. The video might not have captions enabled.' }, { status: 400 })
    }

    if (transcriptData.length === 0) {
      return NextResponse.json({ error: 'Transcript was empty. The video might not have captions enabled.' }, { status: 400 })
    }

    // Detect the offset unit. youtube-transcript v1.3.1 parses two caption formats:
    //  - srv3:  <p t="1234" d="567"> → offset & duration in MILLISECONDS
    //  - classic: <text start="12.3" dur="5.1"> → offset & duration in SECONDS
    // Segment gaps are ~2000-6000 in ms, but ~2-6 in seconds, so the median gap
    // cleanly tells the two apart (works even for short videos).
    let offsetsInSeconds = true
    if (transcriptData.length >= 2) {
      const sortedOffsets = transcriptData.map((i) => i.offset).sort((a, b) => a - b)
      const gaps = sortedOffsets
        .slice(1)
        .map((v, i) => v - sortedOffsets[i])
        .filter((g) => g > 0)
      if (gaps.length > 0) {
        const sortedGaps = [...gaps].sort((a, b) => a - b)
        const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)]
        offsetsInSeconds = medianGap < 100
      }
    }

    // Chunk into "Pages" (1 page = 3 minutes of video)
    // This allows the frontend to easily map video time to Page Number.
    const CHUNK_SIZE_MS = 3 * 60 * 1000 // 3 minutes
    const pagesMap: Record<number, string[]> = {}

    for (const item of transcriptData) {
      const offsetMs = offsetsInSeconds ? item.offset * 1000 : item.offset
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

    const docId = `doc-${crypto.randomUUID()}`
    
    // We store the youtube embed URL in fileUrl
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`

    const newDoc: StoredDocument = {
      id: docId,
      title: (typeof title === 'string' && title.trim() ? title : `YouTube Video (${videoId})`).slice(0, 200),
      fileType: 'YouTube Video',
      totalPages: pages.length || 1,
      uploadedAt: new Date().toISOString(),
      folder: safeFolder,
      pages,
      fileUrl: embedUrl,
      fileSize: 'Video',
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
    console.error('Error ingesting youtube video:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to ingest video') }, { status: 500 })
  }
}
