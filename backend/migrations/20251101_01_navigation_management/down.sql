-- Rollback Migration: 20251101_01 - Navigation Management System
-- Description: 删除导航管理系统的表结构

-- 1. 删除触发器
DROP TRIGGER IF EXISTS update_system_menu_items_updated_at ON system_menu_items;
DROP TRIGGER IF EXISTS update_system_menu_groups_updated_at ON system_menu_groups;
DROP TRIGGER IF EXISTS update_system_routes_updated_at ON system_routes;
DROP TRIGGER IF EXISTS update_system_menu_permissions_updated_at ON system_menu_permissions;

-- 2. 删除触发器函数
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 3. 删除表（注意顺序，先删除有外键依赖的表）
DROP TABLE IF EXISTS system_menu_permissions CASCADE;
DROP TABLE IF EXISTS system_routes CASCADE;
DROP TABLE IF EXISTS system_menu_groups CASCADE;
DROP TABLE IF EXISTS system_menu_items CASCADE;

-- 完成
SELECT 'Navigation management tables dropped successfully' AS status;
