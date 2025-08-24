-- migrations/001_create_task_description_versions.sql
-- 生产环境必须使用 Postgres（遵循偏好），此示例用于开发/验证的 Docker Postgres

CREATE TABLE IF NOT EXISTS task_description_versions (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    version_no INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tdv_task_id ON task_description_versions(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tdv_task_version ON task_description_versions(task_id, version_no);

