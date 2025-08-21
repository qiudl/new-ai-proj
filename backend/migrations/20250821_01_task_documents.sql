-- Migration: create task_documents table
BEGIN;

CREATE TABLE IF NOT EXISTS task_documents (
  task_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_task_documents PRIMARY KEY (task_id, document_id)
);

-- Add FKs (assumes tasks and documents tables exist)
ALTER TABLE task_documents
  ADD CONSTRAINT fk_task_documents_task
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_documents
  ADD CONSTRAINT fk_task_documents_document
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_task_documents_document ON task_documents(document_id);

COMMIT;
