# Migration 041: Create Enterprise Users Table

## 概述
创建统一的`enterprise_users`表，替代原有的`customer_users`、`company_users`等分散的用户管理表，为企业用户管理提供统一的数据模型。

## 目标
- 统一企业用户数据模型，消除多个用户表的混乱
- 实现基于企业ID的数据隔离
- 支持用户邀请和激活流程
- 提供灵活的权限和角色管理
- 为多租户架构提供用户管理基础

## 表结构

### enterprise_users 表
```sql
CREATE TABLE enterprise_users (
    -- 基础信息
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL,           -- 所属企业ID（外键）
    username VARCHAR(100) NOT NULL,           -- 用户名（企业内唯一）
    email VARCHAR(255) NOT NULL,              -- 邮箱（全局唯一）
    
    -- 用户信息
    name VARCHAR(255),                        -- 真实姓名
    phone VARCHAR(50),                        -- 联系电话
    position VARCHAR(255),                    -- 职位
    department_id INTEGER,                    -- 部门ID
    
    -- 权限角色
    role_id INTEGER,                          -- 角色ID
    is_primary_contact BOOLEAN DEFAULT FALSE, -- 主要联系人
    can_make_decisions BOOLEAN DEFAULT FALSE, -- 决策权限
    access_level INTEGER DEFAULT 1,          -- 访问级别(1-5)
    
    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 用户状态
    
    -- 邀请激活
    invitation_token VARCHAR(255),            -- 邀请令牌
    invitation_sent_at TIMESTAMPTZ,          -- 邀请发送时间
    invitation_accepted_at TIMESTAMPTZ,      -- 邀请接受时间
    last_login_at TIMESTAMPTZ,               -- 最后登录时间
    
    -- 个人信息
    avatar VARCHAR(255),                      -- 头像URL
    bio TEXT,                                -- 个人简介
    
    -- 元数据
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ                   -- 软删除
);
```

## 字段说明

### status 枚举值
- `active`: 活跃用户
- `inactive`: 非活跃用户
- `pending`: 待激活用户（已邀请未激活）
- `locked`: 锁定用户

### access_level 权限级别
- `1`: 基础权限 - 只读权限
- `2`: 一般权限 - 基本操作权限
- `3`: 中级权限 - 部分管理权限
- `4`: 高级权限 - 高级管理权限
- `5`: 完全权限 - 企业管理员权限

## 约束和索引

### 外键约束
- `fk_enterprise_users_enterprise_id`: 关联enterprises表

### 唯一约束
- `idx_enterprise_users_enterprise_username`: 同一企业内用户名唯一
- `idx_enterprise_users_email_unique`: 邮箱地址全局唯一（软删除除外）

### 性能索引
- `idx_enterprise_users_enterprise_id`: 企业ID索引
- `idx_enterprise_users_username`: 用户名索引
- `idx_enterprise_users_email`: 邮箱索引
- `idx_enterprise_users_status`: 状态索引
- `idx_enterprise_users_role_id`: 角色ID索引
- `idx_enterprise_users_department_id`: 部门ID索引
- `idx_enterprise_users_is_primary_contact`: 主要联系人索引
- `idx_enterprise_users_created_at`: 创建时间索引
- `idx_enterprise_users_deleted_at`: 软删除索引
- `idx_enterprise_users_invitation_token`: 邀请令牌索引

### Check 约束
- `access_level`: 限制访问级别在1-5之间
- `status`: 限制状态值为预定义的枚举值

## 数据隔离机制

### 企业级数据隔离
- 所有用户必须关联到特定企业（enterprise_id）
- 用户名在企业内唯一，但不同企业可以有相同用户名
- 查询时必须包含enterprise_id条件确保数据隔离

### 示例查询
```sql
-- 获取特定企业的用户列表
SELECT * FROM enterprise_users WHERE enterprise_id = 1 AND deleted_at IS NULL;

-- 获取企业的主要联系人
SELECT * FROM enterprise_users 
WHERE enterprise_id = 1 AND is_primary_contact = TRUE AND deleted_at IS NULL;

-- 获取有决策权限的用户
SELECT * FROM enterprise_users 
WHERE enterprise_id = 1 AND can_make_decisions = TRUE AND deleted_at IS NULL;
```

## 相对于原表的改进

### 相比 customer_users 表
- 增加了更丰富的权限管理字段
- 支持用户邀请激活流程
- 增加了个人信息字段（头像、简介）
- 统一了状态管理

### 相比 company_users 表
- 简化了复杂的权限结构
- 增加了邀请令牌机制
- 支持软删除
- 统一了字段命名规范

## 执行迁移

### 前置条件
- PostgreSQL 数据库已启动并可连接
- enterprises表已创建（依赖migration 040）
- 具有创建表和索引的权限

### 环境变量（可选）
- `DB_HOST`: 数据库主机（默认：localhost）
- `DB_PORT`: 数据库端口（默认：5432）
- `DB_NAME`: 数据库名称（默认：ai_proj_db）
- `DB_USER`: 数据库用户（默认：postgres）
- `DB_PASSWORD`: 数据库密码（默认：postgres）

### 执行命令
```bash
# 进入迁移目录
cd backend/migrations/041_create_enterprise_users_table

# 执行迁移
./execute_migration.sh
```

### 手动执行SQL
```bash
# UP 迁移
psql -h localhost -p 5433 -U dev_user -d ai_project_db -f up.sql

# DOWN 迁移（回滚）
psql -h localhost -p 5433 -U dev_user -d ai_project_db -f down.sql
```

## 测试数据
迁移会自动插入4条测试数据：

### 测试科技有限公司（enterprise_id: 1）
1. **admin** - 系统管理员（技术总监）
   - 主要联系人，有决策权限，最高权限级别(5)
2. **john_dev** - 张三（高级开发工程师）
   - 普通用户，中级权限(3)

### 示例金融服务公司（enterprise_id: 2）
1. **finance_admin** - 李四（财务经理）
   - 主要联系人，有决策权限，高级权限(4)
2. **analyst** - 王五（数据分析师）
   - 普通用户，一般权限(2)

## 验证迁移
```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables WHERE table_name = 'enterprise_users';

-- 检查索引是否创建
SELECT indexname FROM pg_indexes WHERE tablename = 'enterprise_users';

-- 检查外键约束
SELECT constraint_name FROM information_schema.referential_constraints 
WHERE constraint_name LIKE '%enterprise_users%';

-- 查看测试数据
SELECT id, enterprise_id, username, name, position, is_primary_contact, access_level, status 
FROM enterprise_users ORDER BY enterprise_id, id;

-- 验证数据隔离
SELECT e.name as enterprise_name, COUNT(eu.id) as user_count
FROM enterprises e
LEFT JOIN enterprise_users eu ON e.id = eu.enterprise_id AND eu.deleted_at IS NULL
GROUP BY e.id, e.name;
```

## 用户邀请流程
```sql
-- 1. 创建待激活用户（通过邀请）
INSERT INTO enterprise_users (
    enterprise_id, username, email, name, 
    status, invitation_token, invitation_sent_at
) VALUES (
    1, 'new_user', 'new@testtech.com', '新用户',
    'pending', 'invite_token_123', NOW()
);

-- 2. 用户激活
UPDATE enterprise_users 
SET status = 'active', 
    invitation_accepted_at = NOW(), 
    invitation_token = NULL
WHERE invitation_token = 'invite_token_123';
```

## 回滚
如果需要回滚此迁移：
```bash
psql -h localhost -p 5433 -U dev_user -d ai_project_db -f down.sql
```

## 后续步骤
1. 执行任务1290: 创建enterprise_departments表
2. 执行任务1291: 创建enterprise_roles表
3. 执行数据迁移任务（从旧用户表迁移数据）
4. 更新后端Repository层使用新表

## 注意事项
- 此迁移不会删除原有的customer_users和company_users表
- 邮箱地址必须全局唯一（跨企业）
- 用户名在企业内唯一，不同企业可重复
- 软删除机制通过deleted_at字段实现
- 更新时间通过触发器自动维护
- 建议在生产环境执行前先在测试环境验证
- 后续需要创建enterprise_roles表来完整支持角色权限系统