# Migration 042: Create Enterprise Departments Table

## 概述
创建支持层级结构的`enterprise_departments`表，替代原有的`company_departments`表，为企业组织架构管理提供统一的数据模型。

## 目标
- 统一企业部门数据模型，替代原有company_departments表
- 支持灵活的部门层级结构（无层级限制）
- 实现基于企业ID的数据隔离
- 提供自动的层级计算和路径维护
- 支持部门排序和状态管理

## 表结构

### enterprise_departments 表
```sql
CREATE TABLE enterprise_departments (
    -- 基础信息
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL,          -- 所属企业ID（外键）
    name VARCHAR(255) NOT NULL,              -- 部门名称
    
    -- 层级结构
    parent_id INTEGER,                       -- 父部门ID（自引用）
    level INTEGER NOT NULL DEFAULT 1,       -- 部门层级（自动计算）
    path TEXT,                               -- 层级路径（自动维护）
    sort_order INTEGER DEFAULT 0,           -- 同级排序权重
    
    -- 管理信息
    manager_id INTEGER,                      -- 部门经理ID
    description TEXT,                        -- 部门描述
    
    -- 统计信息
    employee_count INTEGER DEFAULT 0,       -- 员工数量统计
    
    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 部门状态
    
    -- 元数据
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ                  -- 软删除
);
```

## 字段说明

### status 枚举值
- `active`: 活跃部门
- `inactive`: 非活跃部门  
- `archived`: 已归档部门

### 层级结构设计
- **level**: 自动计算的层级深度，从1开始
- **path**: 存储从根到父级的完整路径，格式如 "1/3/5"
- **parent_id**: 自引用外键，支持无限层级嵌套

## 自动化功能

### 触发器功能
1. **update_enterprise_departments_updated_at**: 自动更新updated_at字段
2. **update_department_level_and_path**: 自动计算并维护level和path字段

### 层级计算逻辑
```sql
-- 当插入或更新parent_id时，自动计算：
-- 1. level = parent_level + 1 (根部门level=1)
-- 2. path = parent_path + '/' + parent_id (根部门path='')
```

## 约束和索引

### 外键约束
- `fk_enterprise_departments_enterprise_id`: 关联enterprises表
- `fk_enterprise_departments_parent_id`: 自引用父部门关系

### 唯一约束
- `idx_enterprise_departments_unique_name`: 同企业内同级部门名称唯一

### 性能索引
- `idx_enterprise_departments_enterprise_id`: 企业ID索引
- `idx_enterprise_departments_parent_id`: 父部门ID索引
- `idx_enterprise_departments_manager_id`: 部门经理索引
- `idx_enterprise_departments_name`: 部门名称索引
- `idx_enterprise_departments_status`: 状态索引
- `idx_enterprise_departments_level`: 层级索引
- `idx_enterprise_departments_path`: 路径索引
- `idx_enterprise_departments_sort_order`: 排序索引
- `idx_enterprise_departments_created_at`: 创建时间索引
- `idx_enterprise_departments_deleted_at`: 软删除索引

## 层级查询示例

### 获取部门树形结构
```sql
-- 获取特定企业的完整部门树
SELECT 
    REPEAT('  ', level-1) || name as department_tree,
    id, parent_id, level, path, status
FROM enterprise_departments 
WHERE enterprise_id = 1 AND deleted_at IS NULL
ORDER BY COALESCE(path || '/' || id::TEXT, id::TEXT);
```

### 获取部门的所有子部门
```sql
-- 获取部门ID为3的所有下级部门
SELECT * FROM enterprise_departments 
WHERE enterprise_id = 1 
  AND (path LIKE '%/3/%' OR path LIKE '%/3' OR parent_id = 3)
  AND deleted_at IS NULL;
```

### 获取部门路径
```sql
-- 获取从根部门到指定部门的完整路径
WITH RECURSIVE dept_path AS (
  -- 起始部门
  SELECT id, name, parent_id, level, name::TEXT as full_path
  FROM enterprise_departments 
  WHERE id = 5 AND enterprise_id = 1
  
  UNION ALL
  
  -- 递归查找父部门
  SELECT d.id, d.name, d.parent_id, d.level, 
         d.name || ' > ' || dp.full_path
  FROM enterprise_departments d
  JOIN dept_path dp ON d.id = dp.parent_id
)
SELECT full_path FROM dept_path WHERE parent_id IS NULL;
```

## 测试数据结构

### 测试科技有限公司（enterprise_id: 1）
```
技术部 (level 1)
├── 前端开发组 (level 2)
├── 后端开发组 (level 2)  
└── 测试组 (level 2)

市场部 (level 1)
├── 销售组 (level 2)
└── 运营组 (level 2)

人事部 (level 1)
```

### 示例金融服务公司（enterprise_id: 2）
```
业务部 (level 1)
├── 信贷组 (level 2)
└── 理财组 (level 2)

风控部 (level 1)

财务部 (level 1)
```

## 相对于原表的改进

### 相比 company_departments 表
- 简化了字段结构，移除了不必要的复杂度
- 增加了自动的层级计算功能
- 统一了命名规范（company_id → enterprise_id）
- 改进了路径存储机制
- 增加了更灵活的状态管理

## 执行迁移

### 前置条件
- PostgreSQL 数据库已启动并可连接
- enterprises表已创建（依赖migration 040）
- 具有创建表和索引的权限

### 环境变量
- `DB_HOST`: 数据库主机（默认：localhost）
- `DB_PORT`: 数据库端口（默认：5432） 
- `DB_NAME`: 数据库名称（默认：ai_proj_db）
- `DB_USER`: 数据库用户（默认：postgres）
- `DB_PASSWORD`: 数据库密码（默认：postgres）

### 执行命令
```bash
# 进入迁移目录
cd backend/migrations/042_create_enterprise_departments_table

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

## 验证迁移
```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables WHERE table_name = 'enterprise_departments';

-- 检查索引是否创建
SELECT indexname FROM pg_indexes WHERE tablename = 'enterprise_departments';

-- 检查外键约束
SELECT constraint_name FROM information_schema.referential_constraints 
WHERE constraint_name LIKE '%enterprise_departments%';

-- 验证层级结构
SELECT 
    e.name as enterprise_name,
    COUNT(CASE WHEN ed.level = 1 THEN 1 END) as level_1_depts,
    COUNT(CASE WHEN ed.level = 2 THEN 1 END) as level_2_depts,
    COUNT(ed.id) as total_depts
FROM enterprises e
LEFT JOIN enterprise_departments ed ON e.id = ed.enterprise_id AND ed.deleted_at IS NULL
GROUP BY e.id, e.name;

-- 查看部门树形结构
SELECT 
    REPEAT('  ', level-1) || name as department_tree,
    level, path, status
FROM enterprise_departments 
WHERE enterprise_id = 1 AND deleted_at IS NULL
ORDER BY COALESCE(path || '/' || id::TEXT, id::TEXT);
```

## 部门管理操作

### 创建新部门
```sql
-- 创建一级部门
INSERT INTO enterprise_departments (enterprise_id, name, description, created_by)
VALUES (1, '财务部', '负责财务管理', 1);

-- 创建二级部门（parent_id = 技术部的ID）
INSERT INTO enterprise_departments (enterprise_id, name, parent_id, description, created_by)
VALUES (1, 'DevOps组', 1, '负责运维和部署', 1);
```

### 移动部门
```sql
-- 将部门移动到新的父部门下
UPDATE enterprise_departments 
SET parent_id = 2, updated_by = 1
WHERE id = 5 AND enterprise_id = 1;
-- level和path会被触发器自动重新计算
```

### 部门排序
```sql
-- 调整同级部门的排序
UPDATE enterprise_departments 
SET sort_order = 1
WHERE id = 1 AND enterprise_id = 1; -- 技术部排第一

UPDATE enterprise_departments 
SET sort_order = 2  
WHERE id = 2 AND enterprise_id = 1; -- 市场部排第二
```

## 回滚
如果需要回滚此迁移：
```bash
psql -h localhost -p 5433 -U dev_user -d ai_project_db -f down.sql
```

## 后续步骤
1. 执行任务1291: 创建enterprise_roles表
2. 更新enterprise_users表添加manager_id外键约束
3. 执行数据迁移任务（从company_departments迁移数据）
4. 更新后端Repository层使用新表结构

## 注意事项
- 此迁移不会删除原有的company_departments表
- 部门名称在同企业同级下必须唯一
- level和path字段由触发器自动维护，不建议手动修改
- 删除部门时会自动将子部门的parent_id设为NULL
- 软删除机制通过deleted_at字段实现
- 层级结构支持无限层级嵌套
- 建议在生产环境执行前先在测试环境验证