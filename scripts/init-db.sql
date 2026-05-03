-- Initial database setup, run once by the Postgres entrypoint on first boot.
-- Enables pgvector so later packets can store OpenAI embeddings (1536-dim
-- vectors from text-embedding-3-small) for hybrid retrieval.

CREATE EXTENSION IF NOT EXISTS vector;
