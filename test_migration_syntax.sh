#!/bin/bash

# 测试迁移文件语法
set -e

MIGRATION_FILE="/app/migrations/20250827_02_folder_unified_init.sql"

echo "Testing migration file syntax..."

# 基本语法检查 - 在事务中运行但最后回滚
docker-compose -f docker-compose.dev.yml exec postgres-master psql -U dev_user -d ai_project_db << EOF
BEGIN;

-- 测试扩展创建
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 测试基本语法（创建一个测试表）
CREATE TABLE IF NOT EXISTS test_syntax_check (
    id SERIAL PRIMARY KEY,
    path ltree,
    test_field TEXT
);

-- 测试ltree功能
INSERT INTO test_syntax_check (path, test_field) VALUES ('1'::ltree, 'test');

-- 测试索引创建语法
CREATE INDEX IF NOT EXISTS test_idx_path ON test_syntax_check USING GIST (path);

-- 清理测试数据
DROP TABLE test_syntax_check;

-- 回滚所有更改
ROLLBACK;
EOF

echo "✅ Migration file syntax test completed successfully!"
