-- 040_create_enterprises_table/up.sql
-- 创建统一的企业管理表结构，替代原有的customers/companies混合模式
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 创建enterprises主表
CREATE TABLE IF NOT EXISTS enterprises (
    -- 主键和基础信息
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    
    -- 企业类型和行业信息
    industry_type VARCHAR(100),
    business_type VARCHAR(50) NOT NULL DEFAULT 'corporation' 
        CHECK (business_type IN ('individual', 'partnership', 'corporation', 'llc')),
    
    -- 法务信息
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    legal_representative VARCHAR(255),
    
    -- 联系信息
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    
    -- 业务信息
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- 元数据
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_enterprises_code ON enterprises(code);
CREATE INDEX IF NOT EXISTS idx_enterprises_name ON enterprises(name);
CREATE INDEX IF NOT EXISTS idx_enterprises_status ON enterprises(status);
CREATE INDEX IF NOT EXISTS idx_enterprises_industry_type ON enterprises(industry_type);
CREATE INDEX IF NOT EXISTS idx_enterprises_business_type ON enterprises(business_type);
CREATE INDEX IF NOT EXISTS idx_enterprises_created_at ON enterprises(created_at);
CREATE INDEX IF NOT EXISTS idx_enterprises_deleted_at ON enterprises(deleted_at) WHERE deleted_at IS NULL;

-- 创建触发器函数更新updated_at字段
CREATE OR REPLACE FUNCTION update_enterprises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_enterprises_updated_at ON enterprises;
CREATE TRIGGER trigger_enterprises_updated_at
    BEFORE UPDATE ON enterprises
    FOR EACH ROW
    EXECUTE FUNCTION update_enterprises_updated_at();

-- 添加约束和注释
COMMENT ON TABLE enterprises IS '统一企业管理表，替代原有customers/companies表';
COMMENT ON COLUMN enterprises.id IS '企业唯一标识';
COMMENT ON COLUMN enterprises.name IS '企业名称';
COMMENT ON COLUMN enterprises.code IS '企业代码，全局唯一';
COMMENT ON COLUMN enterprises.industry_type IS '行业类型';
COMMENT ON COLUMN enterprises.business_type IS '企业性质：individual(个人), partnership(合伙), corporation(公司), llc(有限责任)';
COMMENT ON COLUMN enterprises.registration_number IS '工商注册号';
COMMENT ON COLUMN enterprises.tax_id IS '税号';
COMMENT ON COLUMN enterprises.legal_representative IS '法定代表人';
COMMENT ON COLUMN enterprises.contact_email IS '联系邮箱';
COMMENT ON COLUMN enterprises.contact_phone IS '联系电话';
COMMENT ON COLUMN enterprises.address IS '详细地址';
COMMENT ON COLUMN enterprises.city IS '城市';
COMMENT ON COLUMN enterprises.province IS '省份';
COMMENT ON COLUMN enterprises.postal_code IS '邮政编码';
COMMENT ON COLUMN enterprises.website IS '官方网站';
COMMENT ON COLUMN enterprises.description IS '企业描述';
COMMENT ON COLUMN enterprises.status IS '企业状态：active(活跃), inactive(非活跃), suspended(暂停)';
COMMENT ON COLUMN enterprises.created_by IS '创建人用户ID';
COMMENT ON COLUMN enterprises.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN enterprises.created_at IS '创建时间';
COMMENT ON COLUMN enterprises.updated_at IS '更新时间';
COMMENT ON COLUMN enterprises.deleted_at IS '软删除时间';

-- 插入测试数据（用于开发和测试）
INSERT INTO enterprises (name, code, industry_type, business_type, contact_email, status, created_by) VALUES 
    ('测试科技有限公司', 'TEST_TECH_2024', 'technology', 'corporation', 'contact@testtech.com', 'active', 1),
    ('示例金融服务公司', 'EXAMPLE_FIN_2024', 'finance', 'corporation', 'info@examplefin.com', 'active', 1)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- 输出创建信息
\echo '==========================================';
\echo 'Enterprises table migration completed';
\echo 'Table created: enterprises';
\echo 'Indexes created: 7 indexes';
\echo 'Trigger created: update_enterprises_updated_at';
\echo 'Test data inserted: 2 enterprises';
\echo '==========================================';