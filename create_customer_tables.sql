-- 创建Customer表
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'potential' CHECK (status IN ('active', 'inactive', 'potential', 'closed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    contract_value DECIMAL(15,2),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    custom_fields JSONB,
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建Customer用户关联表
CREATE TABLE IF NOT EXISTS customer_users (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'contact' CHECK (role IN ('contact', 'manager', 'viewer', 'admin')),
    is_primary BOOLEAN DEFAULT false,
    permissions JSONB,
    access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, user_id)
);

-- 创建Customer联系记录表
CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('email', 'phone', 'meeting', 'visit', 'other')),
    subject VARCHAR(255),
    content TEXT,
    contact_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    next_contact_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
    result VARCHAR(100),
    contacted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_priority ON customers(priority);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_custom_fields ON customers USING GIN(custom_fields);

CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_user_id ON customer_users(user_id);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_contact_date ON customer_contacts(contact_date);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_status ON customer_contacts(status);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_users_updated_at BEFORE UPDATE ON customer_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON customer_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入示例数据
INSERT INTO customers (name, company, industry, contact_person, email, phone, address, status, priority, contract_value, created_by, custom_fields) VALUES
('张三', '阿里巴巴集团', '电子商务', '李经理', 'zhangsan@alibaba.com', '13800138001', '杭州市余杭区', 'active', 'high', 100000.00, 1, '{"source": "官网咨询", "tags": ["VIP客户", "长期合作"]}'),
('王五', '腾讯科技', '互联网', '陈总监', 'wangwu@tencent.com', '13800138002', '深圳市南山区', 'potential', 'medium', 80000.00, 1, '{"source": "展会", "tags": ["潜在客户"]}'),
('李四', '百度公司', '搜索引擎', '刘主管', 'lisi@baidu.com', '13800138003', '北京市海淀区', 'active', 'medium', 60000.00, 1, '{"source": "推荐", "tags": ["技术导向"]}')
ON CONFLICT (email) DO NOTHING;

-- 插入客户用户关联
INSERT INTO customer_users (customer_id, user_id, role, is_primary, access_level) VALUES
(1, 1, 'admin', true, 10),
(2, 1, 'manager', true, 8),
(3, 1, 'contact', true, 5)
ON CONFLICT (customer_id, user_id) DO NOTHING;

-- 插入联系记录
INSERT INTO customer_contacts (customer_id, contact_type, subject, content, status, contacted_by) VALUES
(1, 'email', '项目合作咨询', '关于新项目的合作细节讨论', 'completed', 1),
(1, 'phone', '跟进合同签署', '确认合同条款和签署时间', 'completed', 1),
(2, 'meeting', '需求调研会议', '深入了解客户具体需求', 'planned', 1),
(3, 'email', '产品介绍', '发送产品详细介绍和报价', 'completed', 1);