-- ================================================
-- SPU/SKU商品管理系统 - 回滚脚本 (DOWN)
-- ================================================
-- 版本: 1.0.0
-- 作者: AI Project Team
-- 日期: 2025-11-06
-- 描述: 回滚SPU/SKU商品管理系统的所有数据库更改
-- 警告: ⚠️  此操作将删除所有商品和库存数据，不可恢复！
-- ================================================

SET client_encoding = 'UTF8';

BEGIN;

\echo '========================================';
\echo '⚠️  警告: 即将回滚SPU/SKU商品管理系统';
\echo '========================================';
\echo '';

-- 等待3秒给用户取消的机会
SELECT pg_sleep(3);

-- ================================================
-- 1. 删除触发器
-- ================================================

\echo '正在删除触发器...';

DROP TRIGGER IF EXISTS trigger_sync_sku_stock ON inventory_records CASCADE;
DROP TRIGGER IF EXISTS trigger_inventory_records_updated_at ON inventory_records CASCADE;
DROP TRIGGER IF EXISTS trigger_skus_updated_at ON skus CASCADE;
DROP TRIGGER IF EXISTS trigger_spus_updated_at ON spus CASCADE;

\echo '✓ 触发器已删除';

-- ================================================
-- 2. 删除函数
-- ================================================

\echo '正在删除函数...';

DROP FUNCTION IF EXISTS sync_sku_stock_quantity() CASCADE;
DROP FUNCTION IF EXISTS update_inventory_records_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_skus_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_spus_updated_at() CASCADE;

\echo '✓ 函数已删除';

-- ================================================
-- 3. 删除表（按依赖关系逆序删除）
-- ================================================

\echo '正在删除表...';

-- 删除库存变动记录表
DROP TABLE IF EXISTS inventory_transactions CASCADE;
\echo '✓ inventory_transactions 表已删除';

-- 删除库存记录表
DROP TABLE IF EXISTS inventory_records CASCADE;
\echo '✓ inventory_records 表已删除';

-- 删除商品属性值表
DROP TABLE IF EXISTS product_attribute_values CASCADE;
\echo '✓ product_attribute_values 表已删除';

-- 删除商品属性定义表
DROP TABLE IF EXISTS product_attributes CASCADE;
\echo '✓ product_attributes 表已删除';

-- 删除SKU表
DROP TABLE IF EXISTS skus CASCADE;
\echo '✓ skus 表已删除';

-- 删除SPU表
DROP TABLE IF EXISTS spus CASCADE;
\echo '✓ spus 表已删除';

COMMIT;

-- ================================================
-- 回滚完成总结
-- ================================================

\echo '';
\echo '========================================';
\echo '✓ SPU/SKU商品管理系统回滚完成！';
\echo '========================================';
\echo '';
\echo '已删除的表:';
\echo '  ✓ spus';
\echo '  ✓ skus';
\echo '  ✓ product_attributes';
\echo '  ✓ product_attribute_values';
\echo '  ✓ inventory_records';
\echo '  ✓ inventory_transactions';
\echo '';
\echo '已删除的触发器: 4 个';
\echo '已删除的函数: 4 个';
\echo '已删除的索引: 23 个（随表自动删除）';
\echo '';
\echo '========================================';
\echo '';
