-- ================================================
-- SPU/SKU商品管理系统 - 数据库迁移脚本 (UP)
-- ================================================
-- 版本: 1.0.0
-- 作者: AI Project Team
-- 日期: 2025-11-06
-- 描述: 创建SPU/SKU两层商品结构及库存管理表
-- 预计执行时间: 约 5-10 秒
-- 依赖: enterprises, users表必须存在
-- ================================================

-- 设置客户端编码
SET client_encoding = 'UTF8';

-- 开始事务
BEGIN;

\echo '========================================';
\echo '正在创建SPU/SKU商品管理系统表...';
\echo '========================================';

-- ================================================
-- 1. 创建SPU表 (Standard Product Unit - 标准产品单元)
-- ================================================
\echo '创建 spus 表...';

CREATE TABLE IF NOT EXISTS spus (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 基础信息
    spu_code VARCHAR(50) UNIQUE NOT NULL,   -- SPU编码（如：SPU-2025-001）
    name VARCHAR(200) NOT NULL,             -- 商品名称（如：iPhone 15）

    -- 关联信息
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    category_id INTEGER,                    -- 类目ID（可选，预留字段）
    brand VARCHAR(100),                     -- 品牌

    -- 商品信息
    description TEXT,                       -- 商品描述
    main_image VARCHAR(500),                -- 主图URL
    images JSONB DEFAULT '[]',              -- 图片列表（JSON数组）
    specifications JSONB DEFAULT '{}',      -- 商品规格参数（JSON对象）

    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 状态：draft草稿/active上架/inactive下架

    -- 审计字段
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,                   -- 软删除

    -- 约束
    CONSTRAINT check_spu_status CHECK (status IN ('draft', 'active', 'inactive'))
);

-- SPU表索引
CREATE INDEX IF NOT EXISTS idx_spus_enterprise ON spus(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spus_category ON spus(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spus_status ON spus(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spus_code ON spus(spu_code);
CREATE INDEX IF NOT EXISTS idx_spus_created ON spus(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spus_name_search ON spus USING gin(to_tsvector('simple', name));

-- SPU表注释
COMMENT ON TABLE spus IS 'SPU商品主表 - 标准产品单元';
COMMENT ON COLUMN spus.spu_code IS 'SPU编码，全局唯一';
COMMENT ON COLUMN spus.status IS '商品状态：draft草稿, active上架, inactive下架';
COMMENT ON COLUMN spus.specifications IS '商品规格参数，JSON格式存储';

\echo '✓ spus 表创建完成';

-- ================================================
-- 2. 创建SKU表 (Stock Keeping Unit - 库存量单位)
-- ================================================
\echo '创建 skus 表...';

CREATE TABLE IF NOT EXISTS skus (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 基础信息
    sku_code VARCHAR(50) UNIQUE NOT NULL,   -- SKU编码（如：SKU-2025-001-01）
    spu_id INTEGER NOT NULL REFERENCES spus(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,             -- SKU名称（如：iPhone 15 蓝色 128GB）

    -- 价格信息
    price DECIMAL(15,2) NOT NULL,           -- 售价
    cost_price DECIMAL(15,2),               -- 成本价
    market_price DECIMAL(15,2),             -- 市场价/划线价

    -- 库存信息
    stock_quantity INTEGER NOT NULL DEFAULT 0,  -- 当前库存数量
    alert_quantity INTEGER DEFAULT 10,      -- 库存预警值

    -- 属性信息
    attributes JSONB DEFAULT '{}',          -- SKU属性值（如：{"颜色":"蓝色","容量":"128GB"}）

    -- 物流信息
    barcode VARCHAR(100),                   -- 条形码
    weight DECIMAL(10,3),                   -- 重量（kg）
    volume DECIMAL(10,3),                   -- 体积（m³）

    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 状态：active启用/inactive禁用

    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,                   -- 软删除

    -- 约束
    CONSTRAINT check_sku_price CHECK (price >= 0),
    CONSTRAINT check_sku_cost_price CHECK (cost_price IS NULL OR cost_price >= 0),
    CONSTRAINT check_sku_stock CHECK (stock_quantity >= 0),
    CONSTRAINT check_sku_status CHECK (status IN ('active', 'inactive'))
);

-- SKU表索引
CREATE INDEX IF NOT EXISTS idx_skus_spu ON skus(spu_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skus_code ON skus(sku_code);
CREATE INDEX IF NOT EXISTS idx_skus_status ON skus(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skus_stock ON skus(stock_quantity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skus_stock_alert ON skus(stock_quantity) WHERE stock_quantity <= alert_quantity AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skus_created ON skus(created_at DESC);

-- SKU表注释
COMMENT ON TABLE skus IS 'SKU表 - 库存量单位，具体商品规格';
COMMENT ON COLUMN skus.sku_code IS 'SKU编码，全局唯一';
COMMENT ON COLUMN skus.attributes IS 'SKU属性值组合，JSON格式';
COMMENT ON COLUMN skus.stock_quantity IS '当前可用库存数量';

\echo '✓ skus 表创建完成';

-- ================================================
-- 3. 创建商品属性定义表
-- ================================================
\echo '创建 product_attributes 表...';

CREATE TABLE IF NOT EXISTS product_attributes (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 基础信息
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,              -- 属性名（如：颜色、尺寸）
    display_name VARCHAR(100) NOT NULL,     -- 显示名称

    -- 配置信息
    input_type VARCHAR(20) NOT NULL DEFAULT 'select',  -- 输入类型：select下拉/input输入/color颜色/image图片
    is_required BOOLEAN DEFAULT false,      -- 是否必填
    is_variation BOOLEAN DEFAULT true,      -- 是否作为SKU规格（如颜色、尺寸）
    sort_order INTEGER DEFAULT 0,           -- 排序

    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT unique_attr_name_enterprise UNIQUE (enterprise_id, name),
    CONSTRAINT check_attr_input_type CHECK (input_type IN ('select', 'input', 'color', 'image'))
);

-- 属性定义表索引
CREATE INDEX IF NOT EXISTS idx_product_attributes_enterprise ON product_attributes(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_variation ON product_attributes(is_variation) WHERE is_variation = true;

-- 属性定义表注释
COMMENT ON TABLE product_attributes IS '商品属性定义表 - 定义可用的属性类型';
COMMENT ON COLUMN product_attributes.is_variation IS '是否作为SKU规格属性（影响SKU生成）';

\echo '✓ product_attributes 表创建完成';

-- ================================================
-- 4. 创建商品属性值表
-- ================================================
\echo '创建 product_attribute_values 表...';

CREATE TABLE IF NOT EXISTS product_attribute_values (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 关联信息
    attribute_id INTEGER NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,

    -- 属性值信息
    value VARCHAR(100) NOT NULL,            -- 属性值（如：红色、蓝色、S、M、L）
    display_value VARCHAR(100) NOT NULL,    -- 显示值（可包含单位等）
    image_url VARCHAR(500),                 -- 属性值图片（用于颜色/图片选择器）
    hex_color VARCHAR(7),                   -- 十六进制颜色值（用于颜色选择器）
    sort_order INTEGER DEFAULT 0,           -- 排序

    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT unique_attr_value UNIQUE (attribute_id, value)
);

-- 属性值表索引
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attr ON product_attribute_values(attribute_id);

-- 属性值表注释
COMMENT ON TABLE product_attribute_values IS '商品属性值表 - 属性的可选值列表';
COMMENT ON COLUMN product_attribute_values.hex_color IS '颜色属性的十六进制色值（如：#FF0000）';

\echo '✓ product_attribute_values 表创建完成';

-- ================================================
-- 5. 创建库存记录表
-- ================================================
\echo '创建 inventory_records 表...';

CREATE TABLE IF NOT EXISTS inventory_records (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 关联信息
    sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    warehouse_id INTEGER,                   -- 仓库ID（可选，支持多仓库）

    -- 库存数量
    available_quantity INTEGER NOT NULL DEFAULT 0,  -- 可用库存
    locked_quantity INTEGER NOT NULL DEFAULT 0,     -- 锁定库存（已下单未发货）
    total_quantity INTEGER NOT NULL DEFAULT 0,      -- 总库存 = available + locked

    -- 时间信息
    last_in_date TIMESTAMP,                -- 最后入库时间
    last_out_date TIMESTAMP,               -- 最后出库时间
    last_check_date TIMESTAMP,             -- 最后盘点时间

    -- 审计字段
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT check_inventory_quantity CHECK (
        total_quantity = available_quantity + locked_quantity AND
        available_quantity >= 0 AND
        locked_quantity >= 0
    ),
    CONSTRAINT unique_sku_warehouse UNIQUE (sku_id, warehouse_id)
);

-- 库存记录表索引
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_records(sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory_records(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory_records(available_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_records(sku_id, available_quantity)
    WHERE available_quantity <= 10;

-- 库存记录表注释
COMMENT ON TABLE inventory_records IS '库存记录表 - SKU实时库存信息';
COMMENT ON COLUMN inventory_records.available_quantity IS '可用库存（可销售）';
COMMENT ON COLUMN inventory_records.locked_quantity IS '锁定库存（已占用但未出库）';

\echo '✓ inventory_records 表创建完成';

-- ================================================
-- 6. 创建库存变动记录表
-- ================================================
\echo '创建 inventory_transactions 表...';

CREATE TABLE IF NOT EXISTS inventory_transactions (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 关联信息
    sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    warehouse_id INTEGER,                   -- 仓库ID

    -- 变动信息
    transaction_type VARCHAR(20) NOT NULL,  -- 类型：in入库/out出库/adjust调整/lock锁定/unlock解锁
    quantity INTEGER NOT NULL,              -- 变动数量（正数增加，负数减少）
    before_quantity INTEGER NOT NULL,       -- 变动前数量
    after_quantity INTEGER NOT NULL,        -- 变动后数量

    -- 操作信息
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(200),                    -- 原因说明

    -- 关联单据
    reference_id INTEGER,                   -- 关联单据ID（如订单ID、采购单ID）
    reference_type VARCHAR(50),             -- 关联单据类型（如：order/purchase_order/return）

    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT check_trans_type CHECK (transaction_type IN ('in', 'out', 'adjust', 'lock', 'unlock', 'return'))
);

-- 库存变动记录表索引
CREATE INDEX IF NOT EXISTS idx_inventory_trans_sku ON inventory_transactions(sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_trans_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_trans_created ON inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_trans_operator ON inventory_transactions(operator_id);
CREATE INDEX IF NOT EXISTS idx_inventory_trans_reference ON inventory_transactions(reference_type, reference_id);

-- 库存变动记录表注释
COMMENT ON TABLE inventory_transactions IS '库存变动记录表 - 审计追踪所有库存变动';
COMMENT ON COLUMN inventory_transactions.transaction_type IS '变动类型：in入库, out出库, adjust调整, lock锁定, unlock解锁, return退货';

\echo '✓ inventory_transactions 表创建完成';

-- ================================================
-- 7. 创建触发器 - 自动更新updated_at字段
-- ================================================
\echo '创建触发器...';

-- SPU表updated_at触发器
CREATE OR REPLACE FUNCTION update_spus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_spus_updated_at
    BEFORE UPDATE ON spus
    FOR EACH ROW
    EXECUTE FUNCTION update_spus_updated_at();

-- SKU表updated_at触发器
CREATE OR REPLACE FUNCTION update_skus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_skus_updated_at
    BEFORE UPDATE ON skus
    FOR EACH ROW
    EXECUTE FUNCTION update_skus_updated_at();

-- 库存记录表updated_at触发器
CREATE OR REPLACE FUNCTION update_inventory_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_records_updated_at
    BEFORE UPDATE ON inventory_records
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_records_updated_at();

\echo '✓ 触发器创建完成';

-- ================================================
-- 8. 创建触发器 - SKU库存同步
-- ================================================
\echo '创建SKU库存同步触发器...';

-- 当inventory_records变化时，同步更新skus表的stock_quantity
CREATE OR REPLACE FUNCTION sync_sku_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新SKU表的库存数量
    UPDATE skus
    SET stock_quantity = NEW.available_quantity
    WHERE id = NEW.sku_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_sku_stock
    AFTER INSERT OR UPDATE OF available_quantity ON inventory_records
    FOR EACH ROW
    EXECUTE FUNCTION sync_sku_stock_quantity();

\echo '✓ SKU库存同步触发器创建完成';

-- ================================================
-- 9. 初始化默认数据
-- ================================================
\echo '初始化默认商品属性...';

-- 为每个企业插入默认属性定义（颜色、尺寸）
INSERT INTO product_attributes (enterprise_id, name, display_name, input_type, is_variation, sort_order)
SELECT id, '颜色', '颜色', 'color', true, 1
FROM enterprises
WHERE NOT EXISTS (
    SELECT 1 FROM product_attributes
    WHERE enterprise_id = enterprises.id AND name = '颜色'
);

INSERT INTO product_attributes (enterprise_id, name, display_name, input_type, is_variation, sort_order)
SELECT id, '尺寸', '尺寸/规格', 'select', true, 2
FROM enterprises
WHERE NOT EXISTS (
    SELECT 1 FROM product_attributes
    WHERE enterprise_id = enterprises.id AND name = '尺寸'
);

\echo '✓ 默认属性初始化完成';

-- ================================================
-- 10. 更新数据库统计信息
-- ================================================
\echo '更新数据库统计信息...';

ANALYZE spus;
ANALYZE skus;
ANALYZE product_attributes;
ANALYZE product_attribute_values;
ANALYZE inventory_records;
ANALYZE inventory_transactions;

\echo '✓ 数据库统计信息更新完成';

-- 提交事务
COMMIT;

-- ================================================
-- 迁移完成总结
-- ================================================

\echo '';
\echo '========================================';
\echo '✓ SPU/SKU商品管理系统迁移完成！';
\echo '========================================';
\echo '';
\echo '创建的表:';
\echo '  ✓ spus (SPU商品主表)';
\echo '  ✓ skus (SKU规格表)';
\echo '  ✓ product_attributes (商品属性定义)';
\echo '  ✓ product_attribute_values (商品属性值)';
\echo '  ✓ inventory_records (库存记录)';
\echo '  ✓ inventory_transactions (库存变动记录)';
\echo '';
\echo '创建的索引:';
\echo '  ✓ 23 个索引（包括唯一索引和复合索引）';
\echo '';
\echo '创建的触发器:';
\echo '  ✓ 4 个触发器（自动更新时间戳和同步库存）';
\echo '';
\echo '执行时间: 约 5-10 秒';
\echo '========================================';
\echo '';
