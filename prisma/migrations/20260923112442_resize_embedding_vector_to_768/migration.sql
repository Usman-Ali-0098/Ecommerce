-- Switching embedding provider from OpenAI (1536-dim) to Gemini gemini-embedding-001 (768-dim).
-- Table has zero rows so far (Step 2 ingestion hasn't run yet) -- USING NULL is safe here and
-- would also be the correct move even with data, since a 1536-dim vector cannot be reinterpreted
-- as a 768-dim one; any previously embedded rows would need re-embedding regardless.
ALTER TABLE "KnowledgeChunk" ALTER COLUMN "embedding" TYPE vector(768) USING NULL;