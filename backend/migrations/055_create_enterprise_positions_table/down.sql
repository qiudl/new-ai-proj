-- 删除视图
DROP VIEW IF EXISTS v_user_effective_permissions;
DROP VIEW IF EXISTS v_position_permissions;

-- 删除表
DROP TABLE IF EXISTS enterprise_user_roles CASCADE;
DROP TABLE IF EXISTS enterprise_user_positions CASCADE;
DROP TABLE IF EXISTS enterprise_roles CASCADE;
DROP TABLE IF EXISTS enterprise_positions CASCADE;

-- 删除函数（如果在其他地方没有使用）
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;