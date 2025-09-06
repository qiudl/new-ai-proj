# Migration 040: Create Enterprises Table

## 概述
创建统一的`enterprises`表，替代原有的`customers`和`companies`表的混合模式，为企业数据管理提供统一的数据模型。

## 目标
- 统一企业数据模型，消除customers/companies表的重复和混乱
- 为多租户架构提供清晰的企业主体
- 简化企业信息管理，去除不必要的字段
- 为后续的enterprise_users、enterprise_departments等关联表奠定基础

## 表结构

### enterprises 表
```sql
CREATE TABLE enterprises (
    -- 基础信息
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,              -- 企业名称
    code VARCHAR(100) UNIQUE NOT NULL,       -- 企业代码（全局唯一）
    
    -- 分类信息
    industry_type VARCHAR(100),              -- 行业类型
    business_type VARCHAR(50) NOT NULL DEFAULT 'corporation', -- 企业性质
    
    -- 法务信息
    registration_number VARCHAR(100),        -- 工商注册号
    tax_id VARCHAR(100),                    -- 税号
    legal_representative VARCHAR(255),       -- 法定代表人
    
    -- 联系信息
    contact_email VARCHAR(255),             -- 联系邮箱
    contact_phone VARCHAR(50),              -- 联系电话
    address TEXT,                           -- 详细地址
    city VARCHAR(100),                      -- 城市
    province VARCHAR(100),                  -- 省份
    postal_code VARCHAR(20),                -- 邮政编码
    website VARCHAR(255),                   -- 官方网站
    
    -- 业务信息
    description TEXT,                       -- 企业描述
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 状态
    
    -- 元数据
    created_by INTEGER,                     -- 创建人
    updated_by INTEGER,                     -- 更新人
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ                  -- 软删除
);
```

## 字段说明

### business_type 枚举值
- `individual`: 个人/个体工商户
- `partnership`: 合伙企业
- `corporation`: 公司制企业
- `llc`: 有限责任公司

### status 枚举值
- `active`: 活跃企业
- `inactive`: 非活跃企业
- `suspended`: 暂停合作企业

## 索引设计
- `idx_enterprises_code`: 企业代码唯一索引
- `idx_enterprises_name`: 企业名称索引
- `idx_enterprises_status`: 状态索引
- `idx_enterprises_industry_type`: 行业类型索引
- `idx_enterprises_business_type`: 企业性质索引
- `idx_enterprises_created_at`: 创建时间索引
- `idx_enterprises_deleted_at`: 软删除索引

## 触发器
- `trigger_enterprises_updated_at`: 自动更新`updated_at`字段

## 相对于原表的改进

### 相比 customers 表
- 移除了客户特有的字段（如contract_value, priority等）
- 增加了企业法务信息（registration_number, tax_id）
- 统一了命名规范

### 相比 companies 表
- 移除了无用的字段（annual_contract_value, employee_count, company_size）
- 简化了地址结构
- 统一了状态枚举值

## 执行迁移

### 前置条件
- PostgreSQL 数据库已启动并可连接
- 具有创建表和索引的权限
- 设置环境变量（可选）：
  - `DB_HOST`: 数据库主机（默认：localhost）
  - `DB_PORT`: 数据库端口（默认：5432）
  - `DB_NAME`: 数据库名称（默认：ai_proj_db）
  - `DB_USER`: 数据库用户（默认：postgres）
  - `DB_PASSWORD`: 数据库密码（默认：postgres）

### 执行命令
```bash
# 进入迁移目录
cd backend/migrations/040_create_enterprises_table

# 执行迁移
./execute_migration.sh
```

### 手动执行SQL
```bash
# UP 迁移
psql -h localhost -p 5432 -U postgres -d ai_proj_db -f up.sql

# DOWN 迁移（回滚）
psql -h localhost -p 5432 -U postgres -d ai_proj_db -f down.sql
```

## 测试数据
迁移会自动插入两条测试数据：
1. 测试科技有限公司 (TEST_TECH_2024)
2. 示例金融服务公司 (EXAMPLE_FIN_2024)

## 验证迁移
```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables WHERE table_name = 'enterprises';

-- 检查索引是否创建
SELECT indexname FROM pg_indexes WHERE tablename = 'enterprises';

-- 检查触发器是否创建
SELECT tgname FROM pg_trigger WHERE tgrelid = 'enterprises'::regclass;

-- 查看测试数据
SELECT id, name, code, status FROM enterprises;
```

## 回滚
如果需要回滚此迁移：
```bash
psql -h localhost -p 5432 -U postgres -d ai_proj_db -f down.sql
```

## 后续步骤
1. 执行任务1289: 创建enterprise_departments表
2. 执行任务1290: 创建enterprise_users表
3. 执行任务1291: 创建enterprise_roles表
4. 执行数据迁移（阶段2）

## 注意事项
- 此迁移不会删除原有的customers和companies表
- 企业代码(code)必须全局唯一
- 软删除机制通过deleted_at字段实现
- 更新时间通过触发器自动维护
- 建议在生产环境执行前先在测试环境验证