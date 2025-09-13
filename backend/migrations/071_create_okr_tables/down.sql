-- Migration: Drop OKR tables
-- Description: Rollback script for OKR tables

-- 删除触发器
DROP TRIGGER IF EXISTS update_okr_objectives_updated_at ON okr_objectives;
DROP TRIGGER IF EXISTS update_okr_key_results_updated_at ON okr_key_results;

-- 删除索引
DROP INDEX IF EXISTS idx_okr_objectives_quarter;
DROP INDEX IF EXISTS idx_okr_objectives_status;
DROP INDEX IF EXISTS idx_okr_objectives_enterprise;
DROP INDEX IF EXISTS idx_okr_key_results_objective;

-- 删除表 (注意顺序，先删除依赖表)
DROP TABLE IF EXISTS okr_key_results;
DROP TABLE IF EXISTS okr_objectives;

-- 删除函数（如果没有其他地方使用）
-- DROP FUNCTION IF EXISTS update_updated_at_column();