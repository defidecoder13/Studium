import { NextRequest, NextResponse } from 'next/server'
import { getStoredSettings, saveStoredSettings } from '@/lib/settings-store'

export async function GET() {
  try {
    const settings = getStoredSettings()
    return NextResponse.json({ settings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const updated = saveStoredSettings(body)
    return NextResponse.json({ success: true, settings: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
