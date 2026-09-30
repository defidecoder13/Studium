import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { saveStoredDocument, StoredDocument, PageChunk } from '@/lib/documents-store'
import { getCurrentUserId } from '@/lib/auth'
import { checkRateLimitWithIp, rateLimitedResponse, RATE_PRESETS } from '@/lib/rate-limit'
import { getErrorMessage } from '@/lib/utils'
import { headers } from 'next/headers'

import {
  chunkWordsIntoPages,
  cleanPastedTranscript,
  fetchYouTubeTranscriptRobust,
  FetchDiagnostics,
  YouTubeNoCaptionsError,
  YouTubeRateLimitedError,
  YouTubeUnavailableError,
} from '@/lib/youtube-transcript'

function extractVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

/**
 * Fetch a transcript (fast lib first, robust fallback) and chunk it into
 * 3-minute "pages". Throws the underlying fetch error when no usable
 * transcript is available.
 */
async function fetchAndChunkTranscript(videoId: string, diag: FetchDiagnostics): Promise<PageChunk[]> {
  let transcriptData: Array<{ text: string; duration: number; offset: number }> = []
  try {
    transcriptData = await YoutubeTranscript.fetchTranscript(videoId)
    diag.stages.push(`lib:ok/${transcriptData.length}`)
  } catch (err) {
    diag.stages.push(`lib:fail/${err instanceof Error ? err.message.slice(0, 80) : 'unknown'}`)
    console.error('[youtube] primary transcript fetch failed:', err)
    try {
      transcriptData = await fetchYouTubeTranscriptRobust(videoId, diag)
    } catch (fallbackErr) {
      console.error('[youtube] fallback transcript fetch failed:', fallbackErr)
      throw fallbackErr
    }
  }
  if (transcriptData.length === 0) {
    throw new YouTubeNoCaptionsError(videoId)
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

  return Object.keys(pagesMap).map((pageNum) => {
    const p = parseInt(pageNum)
    const textContent = pagesMap[p].join(' ')
    return {
      pageNumber: p,
      text: textContent,
      wordCount: textContent.split(/\s+/).filter(Boolean).length,
    }
  })
}

/** Map a transcript fetch failure to a user-safe JSON error response. */
function transcriptErrorResponse(diag: FetchDiagnostics, fetchError: unknown) {
  console.error('[youtube] transcript stages:', diag.stages.join(' | '))
  const ref = diag.stages.length > 0 ? ` (ref: ${diag.stages.join(' | ')})` : ''
  if (fetchError instanceof YouTubeRateLimitedError) {
    return NextResponse.json(
      { error: 'YouTube is temporarily rate-limiting imports from our servers. Please try again in a few minutes.' },
      { status: 429 }
    )
  }
  if (fetchError instanceof YouTubeUnavailableError) {
    const isBotCheck = /bot/i.test(fetchError.message)
    return NextResponse.json(
      {
        error: isBotCheck
          ? `YouTube is blocking automated imports from our servers right now (bot-check). Please try again in a few minutes, or try a different video.${ref}`
          : `${fetchError.message}${ref}`,
      },
      { status: 400 }
    )
  }
  if (fetchError instanceof YouTubeNoCaptionsError) {
    return NextResponse.json(
      { error: `This video has no captions to import. Try a video with subtitles or auto-generated captions enabled.${ref}` },
      { status: 400 }
    )
  }
  return NextResponse.json(
    { error: `Could not fetch transcript. The video might not have captions enabled.${ref}` },
    { status: 400 }
  )
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(await headers())
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed, retryAfterSec } = await checkRateLimitWithIp(req, `ingest:${userId}`, RATE_PRESETS.ingest.limit, RATE_PRESETS.ingest.windowMs, RATE_PRESETS.ingest.ipLimit)
    if (!allowed) return rateLimitedResponse(retryAfterSec)
    const { url, title, folder = 'General', transcript } = await req.json()

    if (typeof url !== 'string' || url.length > 500) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
    }
    const safeFolder = (typeof folder === 'string' ? folder : 'General').slice(0, 80) || 'General'

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Manual paste path: the user pasted the transcript text themselves
    // (fallback for when YouTube bot-checks our servers). Skips fetching.
    const pastedTranscript = cleanPastedTranscript(
      typeof transcript === 'string' ? transcript : ''
    )
    let pages: PageChunk[] = []
    if (pastedTranscript.length > 0) {
      const words = pastedTranscript.split(/\s+/).filter(Boolean)
      if (words.length < 50) {
        return NextResponse.json(
          { error: 'The pasted transcript is too short (under 50 words). Please paste the full transcript text.' },
          { status: 400 }
        )
      }
      if (pastedTranscript.length > 500000) {
        return NextResponse.json(
          { error: 'The pasted transcript is too long (over 500 KB). Please paste a shorter section.' },
          { status: 400 }
        )
      }
      pages = chunkWordsIntoPages(words)
    } else {
      const diag: FetchDiagnostics = { stages: [] }
      try {
        pages = await fetchAndChunkTranscript(videoId, diag)
      } catch (e) {
        return transcriptErrorResponse(diag, e)
      }
    }

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
