import { GoogleGenAI } from '@google/genai'

// Initialize the official Google Gen AI SDK client
// It automatically picks up GEMINI_API_KEY or GOOGLE_API_KEY from process.env
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in environment variables. Please add it to .env.local')
  }
  return new GoogleGenAI({ apiKey })
}

// Using gemini-3.1-flash-lite which is live, ultra-fast, and verified working with your API key
export const GEMINI_MODEL = 'gemini-3.1-flash-lite'
export const GEMINI_PRO_MODEL = 'gemini-2.5-pro'
