-- Perf indexes for list/order/filter queries + HNSW for pgvector RAG search
CREATE INDEX IF NOT EXISTS "Document_userId_uploadedAt_idx" ON "Document"("userId", "uploadedAt");
CREATE INDEX IF NOT EXISTS "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_completedAt_idx" ON "QuizAttempt"("userId", "completedAt");
CREATE INDEX IF NOT EXISTS "FlashcardDeck_userId_createdAt_idx" ON "FlashcardDeck"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Flashcard_userId_nextReviewDate_idx" ON "Flashcard"("userId", "nextReviewDate");

-- Cosine-similarity search used by /api/ai/chat ($queryRaw ... <=> ... LIMIT 5).
-- HNSW turns the seq-scan into an index scan at scale. Safe to skip if the
-- Postgres role lacks permission — the query still works, just slower.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PageChunk_embedding_hnsw_idx') THEN
    CREATE INDEX "PageChunk_embedding_hnsw_idx" ON "PageChunk" USING hnsw ("embedding" vector_cosine_ops);
  END IF;
EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
  RAISE NOTICE 'Skipping HNSW index (needs pgvector + CREATE privilege)';
END
$$;
