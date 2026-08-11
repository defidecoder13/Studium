import fs from 'fs'
import path from 'path'

export interface StudySessionRecord {
  id: string
  documentId: string
  documentTitle: string
  durationSeconds: number
  completedAt: string
}

const DATA_DIR = path.join(process.cwd(), '.data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2), 'utf-8')
}

export const getStoredSessions = (): StudySessionRecord[] => {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    return []
  }
}

export const logStudySession = (
  session: Omit<StudySessionRecord, 'id' | 'completedAt'>
): StudySessionRecord => {
  const list = getStoredSessions()
  const newRecord: StudySessionRecord = {
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...session,
    completedAt: new Date().toISOString(),
  }
  list.unshift(newRecord)
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8')
  return newRecord
}
