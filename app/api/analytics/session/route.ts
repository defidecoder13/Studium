import { NextRequest, NextResponse } from 'next/server'
import { logStudySession } from '@/lib/session-store'

export async function POST(req: NextRequest) {
  try {
    const { documentId, documentTitle, durationSeconds } = await req.json()
    if (!documentId || !documentTitle || typeof durationSeconds !== 'number') {
      return NextResponse.json({ error: 'Valid documentId, documentTitle, and durationSeconds are required' }, { status: 400 })
    }

    if (durationSeconds < 5) {
      // Ignore super short sessions (<5s) to avoid cluttering logs on quick open/close
      return NextResponse.json({ success: true, ignored: true })
    }

    const record = logStudySession({
      documentId,
      documentTitle,
      durationSeconds,
    })

    return NextResponse.json({ success: true, session: record })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
