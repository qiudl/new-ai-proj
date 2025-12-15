-- ============================================
-- Migration: Add UUID to Core Entities
-- Date: 2025-12-15
-- Description: 为核心实体添加 UUID 字段支持跨库同步
-- Tables: tasks, projects, enterprises, users, documents, requirements
-- ============================================

-- 确保 uuid-ossp 扩展存在（用于生成 UUID）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Tasks 表
-- ============================================
DO $$
BEGIN
    -- 添加 uuid 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'uuid') THEN
        ALTER TABLE tasks ADD COLUMN uuid UUID;
        RAISE NOTICE 'Added uuid column to tasks';
    END IF;

    -- 添加同步元数据字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sync_source') THEN
        ALTER TABLE tasks ADD COLUMN sync_source VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sync_remote_id') THEN
        ALTER TABLE tasks ADD COLUMN sync_remote_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'synced_at') THEN
        ALTER TABLE tasks ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sync_version') THEN
        ALTER TABLE tasks ADD COLUMN sync_version INTEGER DEFAULT 1;
    END IF;
END $$;

-- 为现有记录生成 UUID
UPDATE tasks SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- 设置约束
ALTER TABLE tasks ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN uuid SET DEFAULT gen_random_uuid();

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_uuid ON tasks(uuid);

-- ============================================
-- 2. Projects 表
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'uuid') THEN
        ALTER TABLE projects ADD COLUMN uuid UUID;
        RAISE NOTICE 'Added uuid column to projects';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'sync_source') THEN
        ALTER TABLE projects ADD COLUMN sync_source VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'sync_remote_id') THEN
        ALTER TABLE projects ADD COLUMN sync_remote_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'synced_at') THEN
        ALTER TABLE projects ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'sync_version') THEN
        ALTER TABLE projects ADD COLUMN sync_version INTEGER DEFAULT 1;
    END IF;
END $$;

UPDATE projects SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE projects ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE projects ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_uuid ON projects(uuid);

-- ============================================
-- 3. Enterprises 表
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enterprises' AND column_name = 'uuid') THEN
        ALTER TABLE enterprises ADD COLUMN uuid UUID;
        RAISE NOTICE 'Added uuid column to enterprises';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enterprises' AND column_name = 'sync_source') THEN
        ALTER TABLE enterprises ADD COLUMN sync_source VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enterprises' AND column_name = 'sync_remote_id') THEN
        ALTER TABLE enterprises ADD COLUMN sync_remote_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enterprises' AND column_name = 'synced_at') THEN
        ALTER TABLE enterprises ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enterprises' AND column_name = 'sync_version') THEN
        ALTER TABLE enterprises ADD COLUMN sync_version INTEGER DEFAULT 1;
    END IF;
END $$;

UPDATE enterprises SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE enterprises ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE enterprises ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprises_uuid ON enterprises(uuid);

-- ============================================
-- 4. Users 表
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'uuid') THEN
        ALTER TABLE users ADD COLUMN uuid UUID;
        RAISE NOTICE 'Added uuid column to users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sync_source') THEN
        ALTER TABLE users ADD COLUMN sync_source VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sync_remote_id') THEN
        ALTER TABLE users ADD COLUMN sync_remote_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'synced_at') THEN
        ALTER TABLE users ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sync_version') THEN
        ALTER TABLE users ADD COLUMN sync_version INTEGER DEFAULT 1;
    END IF;
END $$;

UPDATE users SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE users ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE users ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);

-- ============================================
-- 5. Documents 表 (包含工作笔记)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'uuid') THEN
        ALTER TABLE documents ADD COLUMN uuid UUID;
        RAISE NOTICE 'Added uuid column to documents';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'sync_source') THEN
        ALTER TABLE documents ADD COLUMN sync_source VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'sync_remote_id') THEN
        ALTER TABLE documents ADD COLUMN sync_remote_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'synced_at') THEN
        ALTER TABLE documents ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'sync_version') THEN
        ALTER TABLE documents ADD COLUMN sync_version INTEGER DEFAULT 1;
    END IF;
END $$;

UPDATE documents SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE documents ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE documents ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_uuid ON documents(uuid);

-- ============================================
-- 6. Requirements 表
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'uuid') THEN
        ALTER TABLE requirements ADD COLUMN uuid UUID;
        RAISE NOTICE 'Added uuid column to requirements';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'sync_source') THEN
        ALTER TABLE requirements ADD COLUMN sync_source VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'sync_remote_id') THEN
        ALTER TABLE requirements ADD COLUMN sync_remote_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'synced_at') THEN
        ALTER TABLE requirements ADD COLUMN synced_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'sync_version') THEN
        ALTER TABLE requirements ADD COLUMN sync_version INTEGER DEFAULT 1;
    END IF;
END $$;

UPDATE requirements SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE requirements ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE requirements ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_requirements_uuid ON requirements(uuid);

-- ============================================
-- 验证迁移结果
-- ============================================
DO $$
DECLARE
    tables_with_uuid INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_with_uuid
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'uuid'
      AND table_name IN ('tasks', 'projects', 'enterprises', 'users', 'documents', 'requirements');

    IF tables_with_uuid = 6 THEN
        RAISE NOTICE 'Migration successful: All 6 tables now have UUID columns';
    ELSE
        RAISE WARNING 'Migration incomplete: Only % tables have UUID columns', tables_with_uuid;
    END IF;
END $$;
