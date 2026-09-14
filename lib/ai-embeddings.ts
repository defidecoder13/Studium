import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generates a 768-dimensional vector embedding for the given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
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
