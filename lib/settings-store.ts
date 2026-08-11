import fs from 'fs'
import path from 'path'

export interface UserSettings {
  fullName: string
  email: string
  institution: string
  major: string
  bio: string
  twoFactor: boolean
  notifyQuizReminders: boolean
  notifyDailySummary: boolean
  notifyIndexingDone: boolean
  themePreference: 'dark' | 'light' | 'system'
  defaultSummaryMode: 'quick' | 'detailed'
  citationStrictness: 'exact' | 'flexible'
  updatedAt: string
}

const DEFAULT_SETTINGS: UserSettings = {
  fullName: 'Alex Rivera',
  email: 'alex.rivera@stanford.edu',
  institution: 'Stanford University',
  major: 'Quantum Physics & Computer Science',
  bio: 'PhD candidate studying quantum error correction across topological surface codes.',
  twoFactor: true,
  notifyQuizReminders: true,
  notifyDailySummary: true,
  notifyIndexingDone: true,
  themePreference: 'dark',
  defaultSummaryMode: 'quick',
  citationStrictness: 'exact',
  updatedAt: new Date().toISOString(),
}

const DATA_DIR = path.join(process.cwd(), '.data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8')
}

export const getStoredSettings = (): UserSettings => {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch (error) {
    return DEFAULT_SETTINGS
  }
}

export const saveStoredSettings = (newSettings: Partial<UserSettings>): UserSettings => {
  const current = getStoredSettings()
  const updated: UserSettings = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
