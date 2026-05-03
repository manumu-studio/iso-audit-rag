-- Application schema for iso-audit-rag: NIST controls and uploaded PDF chunks.
-- Executed on app startup (idempotent). Requires the pgvector extension (see init-db.sql).

CREATE EXTENSION IF NOT EXISTS vector;

-- OSCAL-derived control chunks for hybrid retrieval (BM25 + dense vectors).
CREATE TABLE IF NOT EXISTS controls (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    family          TEXT NOT NULL,
    description     TEXT NOT NULL,
    search_vector   tsvector,
    embedding       vector(1536),
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_controls_embedding
    ON controls USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_controls_search
    ON controls USING gin (search_vector);

-- Uploaded PDF chunks for document-level RAG retrieval.
-- Each row is one chunk from one page of an uploaded PDF.

CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,
    filename        TEXT NOT NULL,
    page_number     INTEGER NOT NULL,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    search_vector   tsvector,
    embedding       vector(1536),
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_embedding
    ON documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_documents_search
    ON documents USING gin (search_vector);

CREATE INDEX IF NOT EXISTS idx_documents_filename
    ON documents (filename);
