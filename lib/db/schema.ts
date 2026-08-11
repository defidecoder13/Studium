import { pgTable, text, timestamp, boolean, serial, integer, jsonb } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// Add your app tables below. Always include a plain `userId` column so queries
// can be scoped per user — the security model depends on this column existing,
// not on a foreign key. Do NOT add a foreign key constraint
// (`.references(() => user.id, ...)`) unless the user explicitly asks for
// foreign keys or referential integrity; FK constraints make iterating on the
// schema harder.
//
// Example:
//
// import { serial } from "drizzle-orm/pg-core"
//
// export const todos = pgTable("todos", {
//   id: serial("id").primaryKey(),
//   userId: text("userId").notNull(),
//   title: text("title").notNull(),
//   completed: boolean("completed").notNull().default(false),
//   createdAt: timestamp("createdAt").notNull().defaultNow(),
// })
//
// If the user asks for foreign keys, add the reference back in:
//   userId: text("userId")
//     .notNull()
//     .references(() => user.id, { onDelete: "cascade" }),

// --- Study Assistant App Tables ---

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  blobUrl: text('blobUrl').notNull(),
  fileType: text('fileType').notNull(), // 'pdf' | 'docx'
  fileSize: integer('fileSize').notNull(),
  textContent: text('textContent'), // Extracted text from document
  tags: jsonb('tags').default([]), // Array of tags
  isFavorite: boolean('isFavorite').default(false),
  thumbnailUrl: text('thumbnailUrl'),
  processingStatus: text('processingStatus').default('uploading'), // 'uploading' | 'extracting' | 'processing' | 'ready' | 'error'
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const studySessions = pgTable('study_sessions', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  documentId: integer('documentId').notNull(),
  sessionType: text('sessionType').notNull(), // 'summary' | 'chat' | 'quiz' | 'flashcard'
  durationMinutes: integer('durationMinutes'),
  notesContent: text('notesContent'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  documentId: integer('documentId').notNull(),
  difficulty: text('difficulty').notNull(), // 'easy' | 'medium' | 'hard'
  questionCount: integer('questionCount').notNull(),
  questions: jsonb('questions').notNull(), // Array of quiz questions
  startedAt: timestamp('startedAt'),
  completedAt: timestamp('completedAt'),
  score: integer('score'), // Percentage score
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const flashcards = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  documentId: integer('documentId').notNull(),
  front: text('front').notNull(), // Question or term
  back: text('back').notNull(), // Answer or definition
  dueDate: timestamp('dueDate'),
  interval: integer('interval').default(1), // Spaced repetition interval
  ease: integer('ease').default(2500), // Ease factor for spaced repetition
  repetitions: integer('repetitions').default(0),
  lastReviewedAt: timestamp('lastReviewedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  documentId: integer('documentId').notNull(),
  pageNumber: integer('pageNumber'),
  selectedText: text('selectedText'),
  note: text('note'),
  color: text('color').default('yellow'), // Color of highlight
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const studyPlanner = pgTable('study_planner', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('dueDate').notNull(),
  priority: text('priority').notNull(), // 'low' | 'medium' | 'high'
  category: text('category'), // 'exam' | 'assignment' | 'review'
  completed: boolean('completed').default(false),
  completedAt: timestamp('completedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  studyDate: timestamp('studyDate').notNull(),
  studyMinutes: integer('studyMinutes').default(0),
  documentsStudied: integer('documentsStudied').default(0),
  quizzesCompleted: integer('quizzesCompleted').default(0),
  averageQuizScore: integer('averageQuizScore'),
  flashcardsReviewed: integer('flashcardsReviewed').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
