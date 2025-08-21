-- Migration: create document_index helper table
BEGIN;

CREATE TABLE IF NOT EXISTS document_index (
  document_id INTEGER PRIMARY KEY,
  title_tsvector tsvector,
  content_tsvector tsvector,
  tags JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_document_index_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_document_index_title_gin ON document_index USING GIN (title_tsvector);
CREATE INDEX IF NOT EXISTS idx_document_index_content_gin ON document_index USING GIN (content_tsvector);

COMMIT;
