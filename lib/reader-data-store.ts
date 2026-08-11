import fs from 'fs'
import path from 'path'

export interface DocumentNoteRecord {
  documentId: string
  content: string
  updatedAt: string
}

export interface ChatMessageItem {
  role: 'user' | 'ai'
  text: string
  timestamp?: string
}

export interface DocumentChatRecord {
  documentId: string
  messages: ChatMessageItem[]
  updatedAt: string
}

const DATA_DIR = path.join(process.cwd(), '.data')
const NOTES_FILE = path.join(DATA_DIR, 'notes.json')
const CHATS_FILE = path.join(DATA_DIR, 'chats.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(NOTES_FILE)) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2), 'utf-8')
}

if (!fs.existsSync(CHATS_FILE)) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify([], null, 2), 'utf-8')
}

// NOTES STORAGE
export const getAllStoredNotes = (): DocumentNoteRecord[] => {
  try {
    const raw = fs.readFileSync(NOTES_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    return []
  }
}

export const getStoredNoteByDocumentId = (documentId: string): DocumentNoteRecord | null => {
  const notes = getAllStoredNotes()
  return notes.find((n) => n.documentId === documentId) || null
}

export const saveStoredNoteByDocumentId = (documentId: string, content: string): DocumentNoteRecord => {
  const notes = getAllStoredNotes()
  const idx = notes.findIndex((n) => n.documentId === documentId)
  const record: DocumentNoteRecord = {
    documentId,
    content,
    updatedAt: new Date().toISOString(),
  }
  if (idx >= 0) {
    notes[idx] = record
  } else {
    notes.unshift(record)
  }
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8')
  return record
}

// CHATS STORAGE
export const getAllStoredChats = (): DocumentChatRecord[] => {
  try {
    const raw = fs.readFileSync(CHATS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    return []
  }
}

export const getStoredChatByDocumentId = (documentId: string): DocumentChatRecord | null => {
  const chats = getAllStoredChats()
  return chats.find((c) => c.documentId === documentId) || null
}

export const saveStoredChatByDocumentId = (documentId: string, messages: ChatMessageItem[]): DocumentChatRecord => {
  const chats = getAllStoredChats()
  const idx = chats.findIndex((c) => c.documentId === documentId)
  const record: DocumentChatRecord = {
    documentId,
    messages,
    updatedAt: new Date().toISOString(),
  }
  if (idx >= 0) {
    chats[idx] = record
  } else {
    chats.unshift(record)
  }
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2), 'utf-8')
  return record
}
