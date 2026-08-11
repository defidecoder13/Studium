import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const q = await prisma.quizAttempt.create({
      data: {
        userId: "demo-user-id", // might fail if demo-user-id doesn't exist
        documentId: "non-existent-id", // might fail due to FK
        documentTitle: "Test",
        score: 0,
        totalQuestions: 0,
        accuracy: 0,
        difficulty: "Medium",
        quizType: "MCQ", // THIS is what we want to test for "Unknown argument"
        timeTakenSeconds: 0
      }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
