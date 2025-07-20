-- 客户管理模块数据库迁移脚本
-- 创建时间: 2025-01-20

-- 1. 客户信息表
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    industry VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'potential', 'closed')),
    
    -- 业务字段
    contract_value DECIMAL(15,2),
    contract_start_date DATE,
    contract_end_date DATE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- 自定义字段支持 (JSON格式，便于扩展)
    custom_fields JSONB DEFAULT '{}',
    
    -- 系统字段
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 2. 客户-用户关联表 (支持多对多关系)
CREATE TABLE IF NOT EXISTS customer_users (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'contact' CHECK (role IN ('contact', 'manager', 'viewer', 'admin')),
    is_primary BOOLEAN DEFAULT false,
    
    -- 权限预留字段
    permissions JSONB DEFAULT '{}',
    access_level INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(customer_id, user_id)
);

-- 3. 客户联系记录表
CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('email', 'phone', 'meeting', 'visit', 'other')),
    subject VARCHAR(255),
    content TEXT,
    contact_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_contact_date TIMESTAMP,
    
    -- 联系结果和状态
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('planned', 'completed', 'cancelled')),
    result VARCHAR(100),
    
    -- 关联信息
    contacted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 客户文档附件表 (预留)
CREATE TABLE IF NOT EXISTS customer_documents (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50),
    file_path VARCHAR(500),
    file_size BIGINT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 权限扩展预留表 (第二期开发使用)
CREATE TABLE IF NOT EXISTS customer_permissions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    permission_type VARCHAR(100) NOT NULL,
    permission_value JSONB DEFAULT '{}',
    granted_by INTEGER REFERENCES users(id),
    granted_to INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_user_id ON customer_users(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_role ON customer_users(role);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_contact_date ON customer_contacts(contact_date);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_type ON customer_contacts(contact_type);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_customer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_updated_at();

CREATE TRIGGER trigger_customer_users_updated_at
    BEFORE UPDATE ON customer_users
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_updated_at();

-- 插入测试数据
INSERT INTO customers (name, company, industry, contact_person, email, phone, address, status, priority, created_by) VALUES
('张三科技有限公司', '张三科技', 'IT服务', '张三', 'zhangsan@zs-tech.com', '13800138001', '北京市朝阳区科技园区1号楼', 'active', 'high', 1),
('李四贸易公司', '李四贸易', '贸易', '李四', 'lisi@ls-trade.com', '13800138002', '上海市浦东新区商务区2号楼', 'active', 'medium', 1),
('王五制造集团', '王五制造', '制造业', '王五', 'wangwu@ww-mfg.com', '13800138003', '广州市天河区工业园3号厂房', 'potential', 'high', 1),
('赵六咨询公司', '赵六咨询', '咨询服务', '赵六', 'zhaoliu@zl-consulting.com', '13800138004', '深圳市南山区咨询大厦4楼', 'active', 'low', 1);

-- 添加客户-用户关联
INSERT INTO customer_users (customer_id, user_id, role, is_primary) VALUES
(1, 1, 'admin', true),
(2, 1, 'manager', true),
(3, 1, 'contact', false),
(4, 1, 'manager', true);

-- 添加联系记录
INSERT INTO customer_contacts (customer_id, contact_type, subject, content, contacted_by, status) VALUES
(1, 'meeting', '项目需求讨论', '讨论了新项目的技术需求和时间安排', 1, 'completed'),
(1, 'email', '合同条款确认', '发送了合同草案，等待客户反馈', 1, 'completed'),
(2, 'phone', '月度回访', '了解产品使用情况，客户反馈良好', 1, 'completed'),
(3, 'visit', '实地考察', '参观了客户的生产线，了解具体需求', 1, 'completed');