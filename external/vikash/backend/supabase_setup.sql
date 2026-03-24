-- ============================================================
-- KnowledgeForge — Supabase pgvector Setup
-- Run this ONE TIME in your Supabase SQL Editor:
--   Dashboard → Database → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Step 1: Enable pgvector (already available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add the embedding column to document_chunks
-- Uses 1536 dimensions to match OpenAI text-embedding-3-small
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 3: Create IVFFlat index for fast cosine similarity search
-- Tip: Run this AFTER uploading your first batch of documents (100+ chunks)
-- for the index to be effective. It's safe to run now — just less optimal.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 4 (Optional): Create a helper function for direct Supabase RPC calls
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding  vector(1536),
  match_threshold  float   DEFAULT 0.2,
  match_count      int     DEFAULT 5,
  p_user_id        uuid    DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  document_id  uuid,
  content      text,
  chunk_index  int,
  doc_name     text,
  file_type    text,
  similarity   float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    d.name                                      AS doc_name,
    d.file_type,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE dc.embedding IS NOT NULL
    AND (p_user_id IS NULL OR d.user_id = p_user_id)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- BACKFILL: Re-embed existing documents
-- If you already have documents uploaded before this migration,
-- re-upload them from the Knowledge Base section so embeddings
-- are generated. New uploads will be embedded automatically.
-- ============================================================
