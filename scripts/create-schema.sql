-- Application schema for the `controls` table that backs hybrid retrieval
-- (BM25 via tsvector + cosine via pgvector) over the NIST SP 800-53 catalog.
-- Idempotent: safe to run on every app boot.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS controls (
    id              TEXT PRIMARY KEY,                  -- e.g. "AC-2", "AC-2(1)"
    title           TEXT NOT NULL,
    family          TEXT NOT NULL,                     -- e.g. "Access Control"
    description     TEXT NOT NULL,                     -- concatenated statement prose
    search_vector   tsvector,                          -- BM25 via GIN index
    embedding       vector(1536),                      -- text-embedding-3-small
    metadata        JSONB DEFAULT '{}'::jsonb          -- params, props, links
);

CREATE INDEX IF NOT EXISTS idx_controls_embedding
    ON controls USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_controls_search
    ON controls USING gin (search_vector);
