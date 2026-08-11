import fs from 'fs'
import path from 'path'

export interface StoredBookmark {
  id: string
  documentId: string
  documentTitle: string
  pageNumber: number
  snippet: string
  note?: string
  createdAt: string
  tags?: string[]
}

const DATA_DIR = path.join(process.cwd(), '.data')
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(BOOKMARKS_FILE)) {
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify([], null, 2), 'utf-8')
}

export const getStoredBookmarks = (): StoredBookmark[] => {
  try {
    const raw = fs.readFileSync(BOOKMARKS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    return []
  }
}

export const saveStoredBookmark = (bm: StoredBookmark): void => {
  const list = getStoredBookmarks()
  // If already bookmarked exact page of exact doc, update or skip duplication
  const existingIdx = list.findIndex(
    (b) => b.documentId === bm.documentId && b.pageNumber === bm.pageNumber
  )
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...bm }
  } else {
    list.unshift(bm)
  }
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

export const deleteStoredBookmark = (id: string): boolean => {
  const list = getStoredBookmarks()
  const filtered = list.filter((b) => b.id !== id && `${b.documentId}_${b.pageNumber}` !== id)
  if (filtered.length !== list.length) {
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(filtered, null, 2), 'utf-8')
    return true
  }
  return false
}
