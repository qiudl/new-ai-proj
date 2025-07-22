-- Migration: 005 - Redesign Customer Management System
-- Description: Redesign customer as companies with users and project associations

BEGIN;

-- 1. 备份现有客户数据
CREATE TABLE customers_backup AS SELECT * FROM customers;

-- 2. 创建新的企业客户表
DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    company_code VARCHAR(100) UNIQUE,
    industry VARCHAR(100),
    company_type VARCHAR(50) DEFAULT 'limited_company', -- limited_company, joint_stock, individual, partnership
    business_license VARCHAR(100),
    tax_number VARCHAR(50),
    legal_representative VARCHAR(100),
    
    -- 联系信息
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    main_phone VARCHAR(50),  -- 企业主要电话
    main_email VARCHAR(255), -- 企业主要邮箱
    
    -- 业务信息
    status VARCHAR(20) DEFAULT 'potential' CHECK (status IN ('active', 'inactive', 'potential', 'suspended')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    annual_contract_value DECIMAL(15,2) DEFAULT 0, -- 年度合同总额
    total_contract_value DECIMAL(15,2) DEFAULT 0,  -- 历史合同总额
    start_date DATE, -- 开始合作日期
    
    -- 企业规模
    employee_count INTEGER,
    company_size VARCHAR(20) CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    
    -- 元数据
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 3. 创建企业用户表
CREATE TABLE company_users (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- 用户基本信息
    name VARCHAR(100) NOT NULL,
    position VARCHAR(100),          -- 职位
    department VARCHAR(100),        -- 部门
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),             -- 手机号
    work_phone VARCHAR(50),         -- 工作电话
    
    -- 权限和角色
    role VARCHAR(50) DEFAULT 'normal' CHECK (role IN ('primary_contact', 'technical_contact', 'decision_maker', 'finance_contact', 'normal')),
    is_primary_contact BOOLEAN DEFAULT FALSE,
    can_make_decisions BOOLEAN DEFAULT FALSE,
    access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5),
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left')),
    
    -- 其他信息
    notes TEXT,                     -- 备注
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    CONSTRAINT unique_primary_contact_per_company UNIQUE(customer_id) DEFERRABLE INITIALLY DEFERRED
);

-- 创建部分唯一索引确保每个企业只有一个主要联系人
CREATE UNIQUE INDEX idx_company_users_primary_contact 
ON company_users(customer_id) 
WHERE is_primary_contact = TRUE;

-- 4. 创建项目企业关联表
CREATE TABLE project_companies (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- 关联类型和信息
    relation_type VARCHAR(20) DEFAULT 'client' CHECK (relation_type IN ('owner', 'partner', 'client', 'vendor', 'subcontractor')),
    ownership_percentage DECIMAL(5,2) DEFAULT 0 CHECK (ownership_percentage BETWEEN 0 AND 100),
    contract_value DECIMAL(15,2) DEFAULT 0,
    
    -- 权限配置
    can_view_project BOOLEAN DEFAULT TRUE,
    can_edit_project BOOLEAN DEFAULT FALSE,
    can_manage_tasks BOOLEAN DEFAULT FALSE,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_view_reports BOOLEAN DEFAULT TRUE,
    
    -- 业务信息
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, customer_id) -- 项目-企业关联唯一
);

-- 5. 创建企业合同表
CREATE TABLE company_contracts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, -- 可选关联项目
    
    -- 合同基本信息
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'service' CHECK (contract_type IN ('service', 'product', 'maintenance', 'consulting', 'license')),
    
    -- 金额信息
    total_value DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'CNY',
    
    -- 时间信息
    signed_date DATE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'completed', 'terminated', 'renewed')),
    
    -- 文档和备注
    contract_file VARCHAR(500),     -- 合同文件路径
    description TEXT,               -- 合同描述
    terms TEXT,                     -- 合同条款
    notes TEXT,                     -- 备注
    
    -- 负责人
    created_by INTEGER REFERENCES users(id),
    managed_by INTEGER REFERENCES users(id), -- 合同负责人
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (end_date > start_date),
    CHECK (paid_amount <= total_value)
);

-- 6. 创建企业联系记录表 (重构)
DROP TABLE IF EXISTS customer_contacts;
CREATE TABLE company_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    company_user_id INTEGER REFERENCES company_users(id) ON DELETE SET NULL, -- 联系的具体企业用户
    
    -- 联系信息
    contact_type VARCHAR(20) DEFAULT 'email' CHECK (contact_type IN ('email', 'phone', 'meeting', 'visit', 'video_call', 'other')),
    subject VARCHAR(255),
    content TEXT,
    
    -- 时间信息
    contact_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    next_contact_date TIMESTAMP,
    
    -- 状态和结果
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('planned', 'completed', 'cancelled', 'rescheduled')),
    result VARCHAR(20) CHECK (result IN ('positive', 'neutral', 'negative', 'no_response', 'follow_up_needed')),
    follow_up_required BOOLEAN DEFAULT FALSE,
    
    -- 关联信息
    related_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    related_contract_id INTEGER REFERENCES company_contracts(id) ON DELETE SET NULL,
    
    -- 负责人
    contacted_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 更新projects表以支持多企业关联
-- 为了兼容性，保留原有的customer_id字段，但标记为可空
ALTER TABLE projects ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE projects ADD COLUMN primary_customer_id INTEGER REFERENCES customers(id);

-- 8. 创建视图方便查询

-- 企业统计视图
CREATE OR REPLACE VIEW company_stats AS
SELECT 
    c.id,
    c.company_name,
    c.status,
    c.priority,
    -- 用户统计
    COUNT(DISTINCT cu.id) as user_count,
    COUNT(DISTINCT CASE WHEN cu.is_primary_contact = TRUE THEN cu.id END) as primary_contacts,
    -- 项目统计
    COUNT(DISTINCT pc.project_id) as project_count,
    COUNT(DISTINCT CASE WHEN pc.relation_type = 'owner' THEN pc.project_id END) as owned_projects,
    -- 合同统计
    COUNT(DISTINCT cc.id) as contract_count,
    COALESCE(SUM(DISTINCT cc.total_value), 0) as total_contract_value,
    COALESCE(SUM(DISTINCT cc.paid_amount), 0) as total_paid_amount,
    -- 联系记录统计
    COUNT(DISTINCT co.id) as contact_count,
    MAX(co.contact_date) as last_contact_date
FROM customers c
LEFT JOIN company_users cu ON c.id = cu.customer_id AND cu.status = 'active'
LEFT JOIN project_companies pc ON c.id = pc.customer_id AND pc.is_active = TRUE
LEFT JOIN company_contracts cc ON c.id = cc.customer_id
LEFT JOIN company_contacts co ON c.id = co.customer_id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.company_name, c.status, c.priority;

-- 项目企业关联详情视图
CREATE OR REPLACE VIEW project_company_details AS
SELECT 
    pc.*,
    c.company_name,
    c.industry,
    c.status as company_status,
    p.title as project_title,
    p.status as project_status
FROM project_companies pc
JOIN customers c ON pc.customer_id = c.id
JOIN projects p ON pc.project_id = p.id
WHERE c.deleted_at IS NULL;

-- 9. 创建触发器自动更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 应用触发器到相关表
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON company_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_project_companies_updated_at BEFORE UPDATE ON project_companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_company_contracts_updated_at BEFORE UPDATE ON company_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_company_contacts_updated_at BEFORE UPDATE ON company_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. 创建索引优化查询性能
CREATE INDEX idx_customers_company_name ON customers(company_name);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_industry ON customers(industry);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);

CREATE INDEX idx_company_users_customer_id ON company_users(customer_id);
CREATE INDEX idx_company_users_email ON company_users(email);
CREATE INDEX idx_company_users_role ON company_users(role);

CREATE INDEX idx_project_companies_project_id ON project_companies(project_id);
CREATE INDEX idx_project_companies_customer_id ON project_companies(customer_id);
CREATE INDEX idx_project_companies_relation_type ON project_companies(relation_type);

CREATE INDEX idx_company_contracts_customer_id ON company_contracts(customer_id);
CREATE INDEX idx_company_contracts_status ON company_contracts(status);
CREATE INDEX idx_company_contracts_start_date ON company_contracts(start_date);
CREATE INDEX idx_company_contracts_end_date ON company_contracts(end_date);

CREATE INDEX idx_company_contacts_customer_id ON company_contacts(customer_id);
CREATE INDEX idx_company_contacts_contact_date ON company_contacts(contact_date);
CREATE INDEX idx_company_contacts_status ON company_contacts(status);

-- 11. 插入示例数据

-- 示例企业
INSERT INTO customers (id, company_name, company_code, industry, company_type, business_license, legal_representative, 
                      address, city, province, website, main_phone, main_email, status, priority, annual_contract_value, 
                      employee_count, company_size, created_by) VALUES
(1, '阿里巴巴集团', 'ALI001', '电子商务', 'joint_stock', '91330100MA27MDA23X', '张勇', 
 '杭州市余杭区文一西路969号', '杭州', '浙江', 'https://www.alibaba.com', '0571-85022088', 'contact@alibaba.com', 
 'active', 'high', 1200000.00, 5000, 'enterprise', 1),

(2, '腾讯科技有限公司', 'TCT001', '互联网科技', 'limited_company', '91440300708461136T', '马化腾', 
 '深圳市南山区科技园科技中一路腾讯大厦', '深圳', '广东', 'https://www.tencent.com', '0755-86013388', 'contact@tencent.com', 
 'active', 'high', 800000.00, 3000, 'enterprise', 1),

(3, '百度在线网络技术有限公司', 'BDU001', '人工智能', 'limited_company', '91110000802100433B', '李彦宏', 
 '北京市海淀区上地十街10号百度大厦', '北京', '北京', 'https://www.baidu.com', '010-59928888', 'contact@baidu.com', 
 'potential', 'medium', 500000.00, 2000, 'large', 1),

(4, '华为技术有限公司', 'HW001', '通信设备', 'limited_company', '91440300279439003E', '任正非', 
 '深圳市龙岗区坂田华为总部办公楼', '深圳', '广东', 'https://www.huawei.com', '0755-28780808', 'contact@huawei.com', 
 'active', 'high', 1500000.00, 8000, 'enterprise', 1);

-- 重置序列
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

-- 示例企业用户
INSERT INTO company_users (customer_id, name, position, department, email, phone, mobile, role, is_primary_contact, can_make_decisions, access_level) VALUES
-- 阿里巴巴用户
(1, '张三', 'CTO', '技术部', 'zhangsan@alibaba.com', '0571-85022001', '13800001001', 'primary_contact', TRUE, TRUE, 5),
(1, '李四', '项目经理', '技术部', 'lisi@alibaba.com', '0571-85022002', '13800001002', 'technical_contact', FALSE, TRUE, 4),
(1, '王五', '财务经理', '财务部', 'wangwu@alibaba.com', '0571-85022003', '13800001003', 'finance_contact', FALSE, FALSE, 3),

-- 腾讯用户
(2, '赵六', 'VP Engineering', '技术部', 'zhaoliu@tencent.com', '0755-86013001', '13800002001', 'primary_contact', TRUE, TRUE, 5),
(2, '钱七', '产品经理', '产品部', 'qianqi@tencent.com', '0755-86013002', '13800002002', 'technical_contact', FALSE, TRUE, 4),

-- 百度用户
(3, '孙八', '技术总监', 'AI实验室', 'sunba@baidu.com', '010-59928001', '13800003001', 'primary_contact', TRUE, TRUE, 5),
(3, '周九', '商务经理', '商务部', 'zhoujiu@baidu.com', '010-59928002', '13800003002', 'normal', FALSE, FALSE, 3),

-- 华为用户
(4, '吴十', '解决方案总监', '企业BG', 'wushi@huawei.com', '0755-28780001', '13800004001', 'primary_contact', TRUE, TRUE, 5),
(4, '郑一', '技术专家', '研发部', 'zhengyi@huawei.com', '0755-28780002', '13800004002', 'technical_contact', FALSE, TRUE, 4);

-- 示例合同
INSERT INTO company_contracts (customer_id, contract_number, contract_name, contract_type, total_value, paid_amount, 
                              signed_date, start_date, end_date, status, description, managed_by, created_by) VALUES
(1, 'ALI-2024-001', '阿里云服务合同', 'service', 1200000.00, 600000.00, '2024-01-15', '2024-02-01', '2025-01-31', 'active', 
 '提供云计算和数据处理服务', 1, 1),

(2, 'TCT-2024-001', '腾讯云CDN服务', 'service', 800000.00, 400000.00, '2024-03-10', '2024-04-01', '2025-03-31', 'active', 
 '内容分发网络服务', 1, 1),

(3, '百度AI平台服务合同', 'BDU-2024-001', 'service', 500000.00, 0.00, '2024-06-01', '2024-07-01', '2025-06-30', 'pending', 
 '人工智能平台开发服务', 1, 1),

(4, 'HW-2024-001', '华为通信设备采购', 'product', 1500000.00, 750000.00, '2024-02-20', '2024-03-01', '2024-12-31', 'active', 
 '5G基站设备采购和部署', 1, 1);

-- 示例联系记录
INSERT INTO company_contacts (customer_id, company_user_id, contact_type, subject, content, contact_date, 
                             status, result, contacted_by) VALUES
(1, 1, 'meeting', '项目启动会议', '讨论了项目的具体需求和时间安排', '2024-01-20 10:00:00', 'completed', 'positive', 1),
(1, 2, 'email', '技术方案确认', '发送了详细的技术实施方案', '2024-01-25 14:30:00', 'completed', 'positive', 1),
(2, 4, 'phone', '合同条款确认', '电话确认合同的具体条款', '2024-03-15 09:15:00', 'completed', 'positive', 1),
(3, 6, 'visit', '实地考察', '前往百度总部进行需求调研', '2024-06-10 14:00:00', 'completed', 'neutral', 1),
(4, 9, 'video_call', '项目进度汇报', '通过视频会议汇报项目最新进展', '2024-07-15 16:00:00', 'completed', 'positive', 1);

COMMIT;