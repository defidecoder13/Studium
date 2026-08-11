import fs from 'fs'
import path from 'path'

export interface StoredQuizHistory {
  id: string
  documentId: string
  documentTitle: string
  score: number
  totalQuestions: number
  accuracy: number
  difficulty: string
  quizType: string
  timeTakenSeconds: number
  weakTopics: string[]
  completedAt: string
}

const DATA_DIR = path.join(process.cwd(), '.data')
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(QUIZZES_FILE)) {
  fs.writeFileSync(QUIZZES_FILE, JSON.stringify([], null, 2), 'utf-8')
}

export const getStoredQuizzes = (): StoredQuizHistory[] => {
  try {
    const raw = fs.readFileSync(QUIZZES_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    return []
  }
}

export const saveStoredQuiz = (quiz: StoredQuizHistory): void => {
  const list = getStoredQuizzes()
  list.unshift(quiz)
  fs.writeFileSync(QUIZZES_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

export const deleteStoredQuiz = (id: string): boolean => {
  const list = getStoredQuizzes()
  const filtered = list.filter((q) => q.id !== id)
  if (filtered.length !== list.length) {
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(filtered, null, 2), 'utf-8')
    return true
  }
  return false
}
