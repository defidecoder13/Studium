import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extract a readable message from an unknown caught error.
 * Keeps `catch` blocks type-safe without sprinkling `instanceof` checks.
 *
 * In production, returns the generic fallback so Prisma/R2/Gemini internals
 * never leak to clients. Callers must `console.error` the original error
 * server-side before calling this.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (process.env.NODE_ENV === 'production') return fallback
  return error instanceof Error && error.message ? error.message : fallback
}
