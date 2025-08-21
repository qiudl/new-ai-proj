-- Migration: create document_revisions table
BEGIN;

CREATE TABLE IF NOT EXISTS document_revisions (
  id BIGSERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  content TEXT,
  checksum TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  diff JSONB,
  CONSTRAINT fk_document_revisions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Ensure unique version per document
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_revisions_doc_ver ON document_revisions(document_id, version);

COMMIT;
