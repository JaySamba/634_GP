-- Migration 001 — chunks table for keyword search
-- Run once: in Supabase dashboard → SQL Editor → paste this → Run

-- The chunks table stores the raw text + metadata for every chunk we
-- ingest. Pinecone holds the vector for semantic search; this table
-- holds the text for keyword (full-text) search and is the source of
-- truth we use when we need to render a chunk back to the user.

CREATE TABLE IF NOT EXISTS chunks (
    id              TEXT PRIMARY KEY,           -- matches the Pinecone vector ID
    document_name   TEXT NOT NULL,
    document_path   TEXT NOT NULL,
    section_title   TEXT,                       -- the heading the chunk fell under, if any
    chunk_index     INTEGER NOT NULL,           -- 0-based position within the document
    content         TEXT NOT NULL,
    token_count     INTEGER NOT NULL,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index. tsvector is Postgres's native FTS type.
-- We use 'simple' instead of 'english' so it doesn't strip stems —
-- HR docs have policy codes (HR-PP-50B) we don't want lemmatized.
ALTER TABLE chunks
    ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            coalesce(document_name, '') || ' ' ||
            coalesce(section_title, '') || ' ' ||
            coalesce(content, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON chunks USING GIN (content_tsv);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks (document_name);

-- Convenience view: recent chunks first
CREATE OR REPLACE VIEW chunks_recent AS
    SELECT * FROM chunks ORDER BY created_at DESC;
