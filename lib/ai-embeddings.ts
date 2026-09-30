import { getGeminiClient } from './ai';

/**
 * Generates a 768-dimensional vector embedding for the given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Single source of truth for the client + key validation: lib/ai.
    // Lazy per-call (never at import time, which would capture `undefined`
    // and silently disable vector search via the `[]` fallback below).
    const ai = getGeminiClient();
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    
    // embedContent returns an `embeddings` array on the response.
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}
