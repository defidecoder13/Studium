import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(await headers()).catch(() => null)
    const userId = user?.id || 'user-dummy-001'

    const [docs, quizzes, sessions, decks] = await Promise.all([
      prisma.document.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } }),
      prisma.quizAttempt.findMany({ where: { userId }, orderBy: { completedAt: 'desc' }, include: { document: true } }),
      prisma.studySession.findMany({ where: { userId }, orderBy: { completedAt: 'desc' } }),
      prisma.flashcardDeck.findMany({ where: { userId }, include: { cards: true } })
    ])

    const totalDocuments = docs.length
    const totalFlashcards = decks.reduce((acc, d) => acc + d.cards.length, 0)
    const totalQuizzesTaken = quizzes.length

    const totalQuestionsAnswered = quizzes.reduce((acc, q) => acc + q.totalQuestions, 0)
    const avgAccuracy = totalQuizzesTaken > 0
      ? Math.round(quizzes.reduce((acc, q) => acc + q.accuracy, 0) / totalQuizzesTaken)
      : 0

    const totalTimeSeconds =
      quizzes.reduce((acc, q) => acc + q.timeTakenSeconds, 0) +
      sessions.reduce((acc, s) => acc + s.durationSeconds, 0)
    const studyTimeHours = (totalTimeSeconds / 3600).toFixed(1)

    // Subject breakdown
    const subjectCounts: Record<string, number> = {}
    docs.forEach((d) => {
      const folder = d.folder || 'General'
      subjectCounts[folder] = (subjectCounts[folder] || 0) + 1
    })

    const subjectBreakdown = Object.entries(subjectCounts).map(([subject, count]) => ({
      subject,
      count,
      percentage: totalDocuments > 0 ? Math.round((count / totalDocuments) * 100) : 0,
    }))

    // Aggregate Weak Topics
    const weakTopicsMap: Record<string, { count: number; lastMissedAt: string; documentTitle: string }> = {}
    quizzes.forEach((q) => {
      if (Array.isArray(q.weakTopics)) {
        q.weakTopics.forEach((topic) => {
          if (!topic) return
          if (!weakTopicsMap[topic]) {
            weakTopicsMap[topic] = {
              count: 0,
              lastMissedAt: q.completedAt ? new Date(q.completedAt).toISOString() : new Date().toISOString(),
              documentTitle: q.documentTitle || 'Study Document'
            }
          }
          weakTopicsMap[topic].count += 1
        })
      }
    })

    const topWeakTopics = Object.entries(weakTopicsMap)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        lastMissedAt: data.lastMissedAt,
        documentTitle: data.documentTitle
      }))
      .sort((a, b) => b.count - a.count)

    // Recent activity timeline items
    const recentActivity = [
      ...sessions.slice(0, 4).map((s) => ({
        id: s.id,
        type: 'read',
        title: `Study Session: ${s.documentTitle}`,
        detail: `Duration: ${Math.round(s.durationSeconds / 60)} min active reading`,
        timestamp: s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'Just now',
      })),
      ...quizzes.slice(0, 4).map((q) => ({
        id: q.id,
        type: 'quiz',
        title: `Completed Quiz: ${q.documentTitle}`,
        detail: `Score: ${q.score}/${q.totalQuestions} (${q.accuracy}%) • ${q.difficulty}`,
        timestamp: q.completedAt ? new Date(q.completedAt).toLocaleDateString() : 'Just now',
      })),
      ...docs.slice(0, 4).map((d) => ({
        id: d.id,
        type: 'upload',
        title: `${d.fileType === 'YouTube Video' ? 'Imported Video' : 'Uploaded PDF'}: ${d.title}`,
        detail: `Folder: ${d.folder || 'General'}`,
        timestamp: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : 'Recently',
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8)

    return NextResponse.json({
      success: true,
      stats: {
        totalDocuments,
        totalFlashcards,
        totalQuizzesTaken,
        avgAccuracy,
        totalQuestionsAnswered,
        studyTimeHours,
      },
      subjectBreakdown,
      topWeakTopics,
      recentActivity,
    })
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 })
  }
}
