# 角色权限系统重构方案

## 📋 文档信息

- **文档版本**: v1.0
- **创建日期**: 2025-10-28
- **最后更新**: 2025-10-28
- **作者**: Claude Code
- **状态**: 提案阶段

---

## 🎯 重构目标

实现**系统管理员权限**和**企业租户权限**的完全分离，构建清晰、安全、高性能的双层RBAC权限架构。

### 核心诉求

1. ✅ **完全分离**: 系统角色和企业角色使用独立的表、权限域和检查逻辑
2. ✅ **严格隔离**: 系统管理员不能直接访问企业业务数据
3. ✅ **简化架构**: 减少权限层级，移除过度设计的复杂性
4. ✅ **统一标准**: 规范权限代码格式和检查流程
5. ✅ **提升性能**: 优化权限检查，减少数据库查询
6. ✅ **安全加固**: 修复现有的企业隔离漏洞

---

## 🔴 现状问题分析

### 1. 系统角色与企业角色严重混淆

**问题描述:**
- 系统角色（`superadmin`, `system_admin`, `enterprise_admin`）和企业角色存储在同一个`company_roles`表
- 权限检查代码中混用字符串比对和数据库查询
- 无法区分平台管理权限和企业内部管理权限

**代码示例:**
```go
// handlers/common_helpers.go - 混乱的角色检查
if roleStr == "admin" || roleStr == "super_admin" {
    return true  // 系统角色
}
if roleStr == "enterprise_admin" || roleStr == "enterprise_user" {
    // 企业角色
}
```

**影响:**
- 权限边界模糊
- 安全风险增加
- 代码难以维护

### 2. 两套用户-企业关系系统并存

**问题描述:**
```
旧系统: users → company_users → companies (customers表)
新系统: users → enterprise_users → enterprises
```

**数据库证据:**
```sql
-- Migration 040: 创建enterprises表
CREATE TABLE enterprises (...);
CREATE TABLE enterprise_users (...);

-- 但旧的company_users表仍然存在
SELECT * FROM company_users WHERE deleted_at IS NULL;  -- 仍有数据
```

**影响:**
- 身份识别混乱
- 数据迁移不完整
- 权限检查需要兼容两套系统

### 3. 企业隔离存在严重安全漏洞

**文件**: `handlers/common_helpers.go:158`

```go
func CheckEnterpriseAccess(c *gin.Context, resourceEnterpriseID *int) (bool, string) {
    roleStr := c.GetString("role")

    // 🔴 漏洞1: Admin用户绕过所有企业隔离
    if roleStr == "admin" || roleStr == "super_admin" {
        return true, ""  // 无条件访问任何企业数据
    }

    // 🔴 漏洞2: 资源无enterprise_id时允许访问
    if resourceEnterpriseID == nil {
        return true, ""  // 跨企业数据泄露风险
    }

    // 🔴 漏洞3: 兼容旧系统导致的后门
    if roleStr == "company_admin" || roleStr == "company_user" {
        return true, ""  // 暂时允许，未限制范围
    }

    // ... 其余逻辑
}
```

**安全风险:**
- 系统管理员可以无审计地访问所有企业数据
- 资源未标记enterprise_id时存在跨租户访问风险
- 旧角色系统用户可能绕过新的隔离机制

### 4. 权限代码格式混乱

**发现的5种格式:**
```go
// constants/permissions.go
"dashboard.read"              // 格式1: 点号分隔
"project:read"                // 格式2: 冒号分隔
"project.read"                // 格式3: 点号分隔（与格式1冲突）
"project.list.read"           // 格式4: 三段点号
"enterprise.project.read"     // 格式5: 前缀+点号
```

**问题根源:**
- 权限代码在多次迭代中未统一规范
- `EnterpriseUserBasePermissions`包含多个变体（为了兼容性）
- 权限检查时可能无法匹配正确的代码

**示例:**
```go
// constants/permissions.go:45
EnterpriseUserBasePermissions = []string{
    "project.read",
    "project:read",           // 重复！
    "project.list.read",      // 重复！
    "project.detail.read",    // 重复！
    "enterprise.project.read", // 重复！
    // ...
}
```

### 5. 权限系统过度复杂

**8层权限级别:**
```go
// services/unified_permission_service.go
const (
    LevelSystem      // 系统级
    LevelEnterprise  // 企业级
    LevelDepartment  // 部门级
    LevelPosition    // 职位级
    LevelProject     // 项目级
    LevelUser        // 用户级
    LevelDelegated   // 委派级
    LevelPolicy      // 策略级
)
```

**14个权限相关表:**
- permissions, permission_hierarchy, permission_contexts
- dynamic_permission_rules, permission_cache
- company_roles, role_permissions, role_templates
- permission_audit_logs, permission_approval_requests
- ...

**性能问题:**
```sql
-- 查询用户有效权限的视图（migration 034）
CREATE VIEW user_effective_permissions AS
SELECT DISTINCT ...
FROM company_users cu
LEFT JOIN role_permissions rp ...
LEFT JOIN permission_hierarchy ph ...  -- 递归JOIN
LEFT JOIN user_context_permissions ucp ...
LEFT JOIN dynamic_permission_rules dpr ...
WHERE ... -- 复杂的条件表达式
```

**影响:**
- 权限检查延迟增加（多表JOIN + 递归查询）
- 代码维护困难
- 缓存失效策略复杂

### 6. 缺失的功能和文档

**未实现的功能:**
- 企业级角色权限自定义界面
- 权限审批流程（代码存在但未启用）
- 系统角色权限管理API
- 权限变更审计追踪

**文档缺失:**
- 权限系统架构文档
- 权限代码命名规范
- 角色创建和分配流程
- 企业隔离实施指南

---

## 🎯 重构方案

### 设计原则

1. **双域分离**: System Domain（系统域）和 Enterprise Domain（企业域）完全独立
2. **最小权限**: 默认拒绝，显式授权
3. **单一职责**: 每个角色只负责一个权限域
4. **可审计性**: 所有权限变更可追溯
5. **性能优先**: 减少数据库查询，优化缓存策略

---

## 📊 新架构设计

### 1. 双层权限域架构

```
┌─────────────────────────────────────────────────────────┐
│       System Permission Domain (系统权限域)              │
├─────────────────────────────────────────────────────────┤
│  管理范围:                                               │
│  - 平台基础设施 (数据库、服务器、监控)                    │
│  - 企业租户管理 (创建、编辑、删除企业)                    │
│  - 系统用户管理 (平台管理员)                             │
│  - 系统配置和全局设置                                     │
│                                                          │
│  角色示例:                                               │
│  - super_admin    (超级管理员，所有系统权限)              │
│  - system_admin   (系统管理员，企业管理)                  │
│  - system_auditor (系统审计员，只读访问)                  │
│                                                          │
│  权限示例:                                               │
│  - system.enterprise.create                              │
│  - system.enterprise.delete                              │
│  - system.monitoring.view                                │
│  - system.config.update                                  │
│                                                          │
│  限制:                                                   │
│  ❌ 不能直接访问企业业务数据 (项目、任务、文档)            │
│  ✅ 可以通过管理门户查看企业统计信息                       │
└─────────────────────────────────────────────────────────┘
                         ↓
              (通过Enterprise Admin Portal)
                         ↓
┌─────────────────────────────────────────────────────────┐
│      Enterprise Permission Domain (企业权限域)           │
├─────────────────────────────────────────────────────────┤
│  管理范围:                                               │
│  - 企业内部用户管理                                       │
│  - 企业项目/任务管理                                      │
│  - 企业文档和知识库                                       │
│  - 企业部门和职位                                         │
│                                                          │
│  角色示例:                                               │
│  - enterprise_admin (企业管理员，企业内所有权限)          │
│  - project_manager  (项目经理，项目管理权限)              │
│  - team_member      (团队成员，基础权限)                  │
│  - guest            (访客，只读权限)                      │
│                                                          │
│  权限示例:                                               │
│  - enterprise.user.create                                │
│  - enterprise.project.manage                             │
│  - enterprise.task.assign                                │
│  - enterprise.document.edit                              │
│                                                          │
│  隔离:                                                   │
│  ✅ 完全隔离于其他企业                                    │
│  ✅ 通过enterprise_id强制过滤                             │
│  ❌ 无法访问系统级功能                                    │
└─────────────────────────────────────────────────────────┘
```

### 2. 数据库结构重构

#### 2.1 系统权限域表结构

```sql
-- ============================================
-- 系统权限域 (System Permission Domain)
-- ============================================

-- 系统角色定义（平台级，预定义角色）
CREATE TABLE system_roles (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,  -- super_admin, system_admin, system_auditor
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    privilege_level INT NOT NULL,           -- 1-100，数字越小权限越高
    is_active BOOLEAN DEFAULT TRUE,
    is_deletable BOOLEAN DEFAULT FALSE,     -- 系统预设角色不可删除
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统权限定义（平台级）
CREATE TABLE system_permissions (
    id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL,  -- system.enterprise.create
    permission_name VARCHAR(200) NOT NULL,
    module VARCHAR(50) NOT NULL,            -- system, platform, audit, monitoring
    resource VARCHAR(50) NOT NULL,          -- enterprise, user, config, logs
    action VARCHAR(50) NOT NULL,            -- create, read, update, delete, manage
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 索引
    INDEX idx_system_perm_code (permission_code),
    INDEX idx_system_perm_module (module)
);

-- 系统角色-权限映射
CREATE TABLE system_role_permissions (
    id SERIAL PRIMARY KEY,
    system_role_id INT NOT NULL REFERENCES system_roles(id) ON DELETE CASCADE,
    system_permission_id INT NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,  -- user_id of the granter

    UNIQUE(system_role_id, system_permission_id),
    INDEX idx_sys_role_perm (system_role_id)
);

-- 系统用户（平台管理员）
CREATE TABLE system_users (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 关联现有用户表
    system_role_id INT NOT NULL REFERENCES system_roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,  -- 记录谁分配的
    notes TEXT,       -- 备注信息

    UNIQUE(user_id),  -- 一个用户只能有一个系统角色
    INDEX idx_sys_user_role (system_role_id)
);

-- 系统权限审计日志
CREATE TABLE system_permission_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,                   -- 操作者
    action_type VARCHAR(50) NOT NULL,       -- grant_role, revoke_role, grant_permission
    target_user_id INT,                     -- 被操作的用户
    target_role_id INT,                     -- 被操作的角色
    permission_code VARCHAR(100),           -- 涉及的权限
    old_value TEXT,                         -- 旧值
    new_value TEXT,                         -- 新值
    reason TEXT,                            -- 操作原因
    ip_address VARCHAR(45),                 -- 操作者IP
    user_agent TEXT,                        -- 浏览器信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_sys_audit_user (user_id),
    INDEX idx_sys_audit_time (created_at),
    INDEX idx_sys_audit_action (action_type)
);
```

#### 2.2 企业权限域表结构

```sql
-- ============================================
-- 企业权限域 (Enterprise Permission Domain)
-- ============================================

-- 企业角色定义（租户级，可自定义）
CREATE TABLE enterprise_roles (
    id SERIAL PRIMARY KEY,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL,         -- enterprise_admin, project_manager, member
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_preset BOOLEAN DEFAULT FALSE, -- 是否为系统预设角色（不可删除）
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,

    UNIQUE(enterprise_id, role_code),       -- 企业内角色代码唯一
    INDEX idx_ent_role_enterprise (enterprise_id),
    INDEX idx_ent_role_code (enterprise_id, role_code)
);

-- 企业权限定义（全局，所有企业共享）
CREATE TABLE enterprise_permissions (
    id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL,  -- enterprise.project.create
    permission_name VARCHAR(200) NOT NULL,
    module VARCHAR(50) NOT NULL,            -- project, task, document, user, department
    resource VARCHAR(50) NOT NULL,          -- project, task, document, user
    action VARCHAR(50) NOT NULL,            -- create, read, update, delete, manage, assign
    scope VARCHAR(50) DEFAULT 'enterprise', -- enterprise, department, project, own
    description TEXT,
    is_base_permission BOOLEAN DEFAULT FALSE,  -- 是否为基础权限（所有用户默认拥有）
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_ent_perm_code (permission_code),
    INDEX idx_ent_perm_module (module),
    INDEX idx_ent_perm_base (is_base_permission)
);

-- 企业角色-权限映射
CREATE TABLE enterprise_role_permissions (
    id SERIAL PRIMARY KEY,
    enterprise_role_id INT NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    enterprise_permission_id INT NOT NULL REFERENCES enterprise_permissions(id) ON DELETE CASCADE,
    scope_constraint JSONB,                 -- 权限范围约束 {"department_id": [1,2,3]}
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,

    UNIQUE(enterprise_role_id, enterprise_permission_id),
    INDEX idx_ent_role_perm (enterprise_role_id)
);

-- 企业用户表（重构现有enterprise_users）
-- 保留现有表，但添加新字段
ALTER TABLE enterprise_users
    ADD COLUMN IF NOT EXISTS primary_role_id INT REFERENCES enterprise_roles(id),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 企业用户-多角色映射（支持一个用户拥有多个角色）
CREATE TABLE enterprise_user_roles (
    id SERIAL PRIMARY KEY,
    enterprise_user_id INT NOT NULL REFERENCES enterprise_users(id) ON DELETE CASCADE,
    enterprise_role_id INT NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,       -- 是否为主角色
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    expires_at TIMESTAMP,                   -- 角色过期时间（可选）

    UNIQUE(enterprise_user_id, enterprise_role_id),
    INDEX idx_ent_user_role (enterprise_user_id),
    INDEX idx_ent_role_user (enterprise_role_id)
);

-- 企业用户-自定义权限（覆盖角色权限）
CREATE TABLE enterprise_user_custom_permissions (
    id SERIAL PRIMARY KEY,
    enterprise_user_id INT NOT NULL REFERENCES enterprise_users(id) ON DELETE CASCADE,
    enterprise_permission_id INT NOT NULL REFERENCES enterprise_permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL,            -- TRUE=授予, FALSE=撤销（覆盖角色权限）
    scope_constraint JSONB,                 -- 权限范围约束
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    expires_at TIMESTAMP,                   -- 权限过期时间
    reason TEXT,                            -- 授予原因

    UNIQUE(enterprise_user_id, enterprise_permission_id),
    INDEX idx_ent_user_custom_perm (enterprise_user_id)
);

-- 企业权限审计日志
CREATE TABLE enterprise_permission_audit_logs (
    id SERIAL PRIMARY KEY,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    user_id INT NOT NULL,                   -- 操作者
    action_type VARCHAR(50) NOT NULL,       -- assign_role, revoke_role, grant_permission
    target_user_id INT,                     -- 被操作的用户
    target_role_id INT,                     -- 被操作的角色
    permission_code VARCHAR(100),           -- 涉及的权限
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_ent_audit_enterprise (enterprise_id),
    INDEX idx_ent_audit_user (user_id),
    INDEX idx_ent_audit_time (created_at)
);
```

#### 2.3 统一权限缓存表

```sql
-- ============================================
-- 权限缓存 (统一缓存层)
-- ============================================

CREATE TABLE permission_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,  -- "sys:123:system.enterprise.create"
                                             -- "ent:5:456:enterprise.project.read"
    domain VARCHAR(20) NOT NULL,             -- 'system' or 'enterprise'
    user_id INT NOT NULL,
    enterprise_id INT,                       -- 企业域必填，系统域为NULL
    permission_code VARCHAR(100) NOT NULL,
    has_permission BOOLEAN NOT NULL,
    scope_data JSONB,                        -- 权限范围数据（如可访问的项目ID列表）
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,           -- 缓存过期时间

    INDEX idx_cache_key (cache_key),
    INDEX idx_cache_user_domain (user_id, domain),
    INDEX idx_cache_expires (expires_at)
);

-- 缓存清理触发器（定期清理过期缓存）
CREATE INDEX idx_cache_cleanup ON permission_cache(expires_at) WHERE expires_at < CURRENT_TIMESTAMP;
```

#### 2.4 数据迁移脚本

```sql
-- ============================================
-- 数据迁移 (从旧系统迁移到新系统)
-- ============================================

BEGIN;

-- Step 1: 迁移系统角色
INSERT INTO system_roles (role_code, role_name, description, privilege_level, is_deletable)
VALUES
    ('super_admin', '超级管理员', '拥有所有系统权限', 1, FALSE),
    ('system_admin', '系统管理员', '企业管理、配置管理', 10, FALSE),
    ('system_operator', '系统操作员', '日常运维操作', 20, FALSE),
    ('system_auditor', '系统审计员', '审计日志查看', 30, FALSE),
    ('system_support', '系统支持员', '客户支持', 40, FALSE);

-- Step 2: 迁移系统权限
INSERT INTO system_permissions (permission_code, permission_name, module, resource, action, description)
VALUES
    ('system.enterprise.create', '创建企业', 'system', 'enterprise', 'create', '创建新的企业租户'),
    ('system.enterprise.read', '查看企业', 'system', 'enterprise', 'read', '查看企业信息'),
    ('system.enterprise.update', '编辑企业', 'system', 'enterprise', 'update', '编辑企业信息'),
    ('system.enterprise.delete', '删除企业', 'system', 'enterprise', 'delete', '删除企业（软删除）'),
    ('system.enterprise.list', '企业列表', 'system', 'enterprise', 'list', '查看所有企业列表'),
    ('system.user.create', '创建系统用户', 'system', 'user', 'create', '创建系统管理员'),
    ('system.user.read', '查看系统用户', 'system', 'user', 'read', '查看系统用户信息'),
    ('system.user.update', '编辑系统用户', 'system', 'user', 'update', '编辑系统用户'),
    ('system.user.delete', '删除系统用户', 'system', 'user', 'delete', '删除系统用户'),
    ('system.role.assign', '分配系统角色', 'system', 'role', 'assign', '为用户分配系统角色'),
    ('system.config.read', '查看系统配置', 'system', 'config', 'read', '查看系统配置'),
    ('system.config.update', '修改系统配置', 'system', 'config', 'update', '修改系统配置'),
    ('system.monitoring.view', '系统监控', 'system', 'monitoring', 'view', '查看系统监控数据'),
    ('system.audit.view', '审计日志', 'system', 'audit', 'view', '查看审计日志');

-- Step 3: 分配系统角色权限
-- Super Admin拥有所有权限
INSERT INTO system_role_permissions (system_role_id, system_permission_id)
SELECT sr.id, sp.id
FROM system_roles sr
CROSS JOIN system_permissions sp
WHERE sr.role_code = 'super_admin';

-- System Admin拥有企业管理权限
INSERT INTO system_role_permissions (system_role_id, system_permission_id)
SELECT sr.id, sp.id
FROM system_roles sr
CROSS JOIN system_permissions sp
WHERE sr.role_code = 'system_admin'
  AND sp.module IN ('system')
  AND sp.resource IN ('enterprise', 'user', 'config');

-- System Auditor拥有只读权限
INSERT INTO system_role_permissions (system_role_id, system_permission_id)
SELECT sr.id, sp.id
FROM system_roles sr
CROSS JOIN system_permissions sp
WHERE sr.role_code = 'system_auditor'
  AND sp.action IN ('read', 'view', 'list');

-- Step 4: 迁移现有系统用户
-- 从users表中识别系统管理员（role字段为system相关角色）
INSERT INTO system_users (user_id, system_role_id, assigned_at, notes)
SELECT
    u.id,
    sr.id,
    u.created_at,
    '从旧系统自动迁移'
FROM users u
JOIN system_roles sr ON (
    (u.role = 'super_admin' AND sr.role_code = 'super_admin') OR
    (u.role = 'admin' AND sr.role_code = 'system_admin') OR
    (u.role = 'system_admin' AND sr.role_code = 'system_admin')
)
WHERE u.user_type = 'system'
  AND u.deleted_at IS NULL;

-- Step 5: 创建企业预设角色（为每个企业）
INSERT INTO enterprise_roles (enterprise_id, role_code, role_name, description, is_system_preset)
SELECT
    e.id,
    'enterprise_admin',
    '企业管理员',
    '企业内所有权限',
    TRUE
FROM enterprises e
WHERE e.deleted_at IS NULL;

INSERT INTO enterprise_roles (enterprise_id, role_code, role_name, description, is_system_preset)
SELECT
    e.id,
    'project_manager',
    '项目经理',
    '项目管理权限',
    TRUE
FROM enterprises e
WHERE e.deleted_at IS NULL;

INSERT INTO enterprise_roles (enterprise_id, role_code, role_name, description, is_system_preset)
SELECT
    e.id,
    'team_member',
    '团队成员',
    '基础权限',
    TRUE
FROM enterprises e
WHERE e.deleted_at IS NULL;

-- Step 6: 迁移企业权限定义
INSERT INTO enterprise_permissions (permission_code, permission_name, module, resource, action, scope, is_base_permission)
VALUES
    -- 基础权限
    ('enterprise.dashboard.read', '查看仪表盘', 'dashboard', 'dashboard', 'read', 'enterprise', TRUE),
    ('enterprise.profile.read', '查看个人资料', 'profile', 'profile', 'read', 'own', TRUE),
    ('enterprise.profile.update', '编辑个人资料', 'profile', 'profile', 'update', 'own', TRUE),

    -- 用户管理权限
    ('enterprise.user.create', '创建用户', 'user', 'user', 'create', 'enterprise', FALSE),
    ('enterprise.user.read', '查看用户', 'user', 'user', 'read', 'enterprise', FALSE),
    ('enterprise.user.update', '编辑用户', 'user', 'user', 'update', 'enterprise', FALSE),
    ('enterprise.user.delete', '删除用户', 'user', 'user', 'delete', 'enterprise', FALSE),
    ('enterprise.user.assign_role', '分配角色', 'user', 'user', 'assign_role', 'enterprise', FALSE),

    -- 角色权限管理
    ('enterprise.role.create', '创建角色', 'role', 'role', 'create', 'enterprise', FALSE),
    ('enterprise.role.read', '查看角色', 'role', 'role', 'read', 'enterprise', FALSE),
    ('enterprise.role.update', '编辑角色', 'role', 'role', 'update', 'enterprise', FALSE),
    ('enterprise.role.delete', '删除角色', 'role', 'role', 'delete', 'enterprise', FALSE),
    ('enterprise.role.assign_permission', '分配权限', 'role', 'permission', 'assign', 'enterprise', FALSE),

    -- 项目管理权限
    ('enterprise.project.create', '创建项目', 'project', 'project', 'create', 'enterprise', FALSE),
    ('enterprise.project.read', '查看项目', 'project', 'project', 'read', 'enterprise', TRUE),
    ('enterprise.project.update', '编辑项目', 'project', 'project', 'update', 'project', FALSE),
    ('enterprise.project.delete', '删除项目', 'project', 'project', 'delete', 'project', FALSE),
    ('enterprise.project.manage', '管理项目', 'project', 'project', 'manage', 'project', FALSE),

    -- 任务管理权限
    ('enterprise.task.create', '创建任务', 'task', 'task', 'create', 'project', TRUE),
    ('enterprise.task.read', '查看任务', 'task', 'task', 'read', 'enterprise', TRUE),
    ('enterprise.task.update', '编辑任务', 'task', 'task', 'update', 'task', FALSE),
    ('enterprise.task.delete', '删除任务', 'task', 'task', 'delete', 'task', FALSE),
    ('enterprise.task.assign', '分配任务', 'task', 'task', 'assign', 'project', FALSE),

    -- 文档管理权限
    ('enterprise.document.create', '创建文档', 'document', 'document', 'create', 'enterprise', TRUE),
    ('enterprise.document.read', '查看文档', 'document', 'document', 'read', 'enterprise', TRUE),
    ('enterprise.document.update', '编辑文档', 'document', 'document', 'update', 'own', TRUE),
    ('enterprise.document.delete', '删除文档', 'document', 'document', 'delete', 'own', TRUE),

    -- 部门管理权限
    ('enterprise.department.create', '创建部门', 'department', 'department', 'create', 'enterprise', FALSE),
    ('enterprise.department.read', '查看部门', 'department', 'department', 'read', 'enterprise', FALSE),
    ('enterprise.department.update', '编辑部门', 'department', 'department', 'update', 'enterprise', FALSE),
    ('enterprise.department.delete', '删除部门', 'department', 'department', 'delete', 'enterprise', FALSE);

-- Step 7: 为企业管理员角色分配所有权限
INSERT INTO enterprise_role_permissions (enterprise_role_id, enterprise_permission_id)
SELECT er.id, ep.id
FROM enterprise_roles er
CROSS JOIN enterprise_permissions ep
WHERE er.role_code = 'enterprise_admin'
  AND er.is_system_preset = TRUE;

-- Step 8: 为项目经理分配项目和任务权限
INSERT INTO enterprise_role_permissions (enterprise_role_id, enterprise_permission_id)
SELECT er.id, ep.id
FROM enterprise_roles er
CROSS JOIN enterprise_permissions ep
WHERE er.role_code = 'project_manager'
  AND er.is_system_preset = TRUE
  AND (
      ep.is_base_permission = TRUE
      OR ep.module IN ('project', 'task', 'document')
  );

-- Step 9: 为团队成员分配基础权限
INSERT INTO enterprise_role_permissions (enterprise_role_id, enterprise_permission_id)
SELECT er.id, ep.id
FROM enterprise_roles er
CROSS JOIN enterprise_permissions ep
WHERE er.role_code = 'team_member'
  AND er.is_system_preset = TRUE
  AND ep.is_base_permission = TRUE;

-- Step 10: 迁移企业用户的角色
-- 更新enterprise_users表的primary_role_id
UPDATE enterprise_users eu
SET primary_role_id = er.id
FROM enterprise_roles er
WHERE eu.enterprise_id = er.enterprise_id
  AND eu.deleted_at IS NULL
  AND er.role_code = (
      CASE
          WHEN eu.access_level = 'admin' THEN 'enterprise_admin'
          WHEN eu.access_level = 'manager' THEN 'project_manager'
          ELSE 'team_member'
      END
  );

-- 插入用户角色映射
INSERT INTO enterprise_user_roles (enterprise_user_id, enterprise_role_id, is_primary)
SELECT eu.id, eu.primary_role_id, TRUE
FROM enterprise_users eu
WHERE eu.primary_role_id IS NOT NULL
  AND eu.deleted_at IS NULL;

COMMIT;
```

#### 2.5 清理旧表（谨慎执行）

```sql
-- ============================================
-- 清理旧表 (在确认新系统稳定后执行)
-- ============================================

-- 警告：这些操作不可逆，执行前务必备份数据库！

BEGIN;

-- 备份旧表
CREATE TABLE _backup_company_roles AS SELECT * FROM company_roles;
CREATE TABLE _backup_company_users AS SELECT * FROM company_users;
CREATE TABLE _backup_role_permissions AS SELECT * FROM role_permissions;

-- 删除过度复杂的权限表
DROP TABLE IF EXISTS permission_hierarchy CASCADE;
DROP TABLE IF EXISTS dynamic_permission_rules CASCADE;
DROP TABLE IF EXISTS permission_contexts CASCADE;
DROP TABLE IF EXISTS user_context_permissions CASCADE;
DROP TABLE IF EXISTS permission_group CASCADE;
DROP TABLE IF EXISTS permission_category_mappings CASCADE;

-- 删除旧的视图
DROP VIEW IF EXISTS user_effective_permissions CASCADE;
DROP VIEW IF EXISTS role_permission_summary CASCADE;

-- 重命名旧表（保留一段时间，最终删除）
ALTER TABLE company_roles RENAME TO _deprecated_company_roles;
ALTER TABLE company_users RENAME TO _deprecated_company_users;
ALTER TABLE role_permissions RENAME TO _deprecated_role_permissions;

COMMIT;
```

---

### 3. Go代码架构重构

#### 3.1 用户身份识别统一接口

**文件**: `models/user_identity.go`

```go
package models

import "time"

// PermissionDomain 权限域
type PermissionDomain string

const (
    DomainSystem     PermissionDomain = "system"
    DomainEnterprise PermissionDomain = "enterprise"
)

// UserIdentity 统一的用户身份接口
type UserIdentity interface {
    GetUserID() uint
    GetDomain() PermissionDomain
    GetEnterpriseID() *uint
    GetRoleCode() string
    GetRoleCodes() []string
    IsSystemUser() bool
    IsEnterpriseUser() bool
    GetPrivilegeLevel() int
}

// SystemUserIdentity 系统用户身份
type SystemUserIdentity struct {
    UserID         uint
    SystemUserID   uint
    SystemRoleID   uint
    RoleCode       string
    RoleName       string
    PrivilegeLevel int
    IsActive       bool
}

func (s *SystemUserIdentity) GetUserID() uint {
    return s.UserID
}

func (s *SystemUserIdentity) GetDomain() PermissionDomain {
    return DomainSystem
}

func (s *SystemUserIdentity) GetEnterpriseID() *uint {
    return nil // 系统用户不属于任何企业
}

func (s *SystemUserIdentity) GetRoleCode() string {
    return s.RoleCode
}

func (s *SystemUserIdentity) GetRoleCodes() []string {
    return []string{s.RoleCode} // 系统用户只有一个角色
}

func (s *SystemUserIdentity) IsSystemUser() bool {
    return true
}

func (s *SystemUserIdentity) IsEnterpriseUser() bool {
    return false
}

func (s *SystemUserIdentity) GetPrivilegeLevel() int {
    return s.PrivilegeLevel
}

// EnterpriseUserIdentity 企业用户身份
type EnterpriseUserIdentity struct {
    UserID           uint
    EnterpriseID     uint
    EnterpriseUserID uint
    PrimaryRoleID    uint
    RoleCode         string
    RoleName         string
    RoleCodes        []string // 所有角色代码
    IsActive         bool
}

func (e *EnterpriseUserIdentity) GetUserID() uint {
    return e.UserID
}

func (e *EnterpriseUserIdentity) GetDomain() PermissionDomain {
    return DomainEnterprise
}

func (e *EnterpriseUserIdentity) GetEnterpriseID() *uint {
    return &e.EnterpriseID
}

func (e *EnterpriseUserIdentity) GetRoleCode() string {
    return e.RoleCode
}

func (e *EnterpriseUserIdentity) GetRoleCodes() []string {
    return e.RoleCodes
}

func (e *EnterpriseUserIdentity) IsSystemUser() bool {
    return false
}

func (e *EnterpriseUserIdentity) IsEnterpriseUser() bool {
    return true
}

func (e *EnterpriseUserIdentity) GetPrivilegeLevel() int {
    return 100 // 企业用户没有全局权限级别
}

// IdentityProvider 身份提供者接口
type IdentityProvider interface {
    GetSystemUserIdentity(userID uint) (*SystemUserIdentity, error)
    GetEnterpriseUserIdentity(userID uint, enterpriseID uint) (*EnterpriseUserIdentity, error)
    GetUserIdentity(userID uint) (UserIdentity, error) // 自动识别
}
```

#### 3.2 权限检查服务重构

**文件**: `services/permission_service_v2.go`

```go
package services

import (
    "context"
    "fmt"
    "time"

    "new-ai-proj/models"
)

// PermissionServiceV2 权限检查服务接口
type PermissionServiceV2 interface {
    // 系统域权限检查
    CheckSystemPermission(ctx context.Context, userID uint, permissionCode string) (bool, error)

    // 企业域权限检查
    CheckEnterprisePermission(ctx context.Context, userID uint, enterpriseID uint, permissionCode string) (bool, error)

    // 批量权限检查
    CheckPermissions(ctx context.Context, identity models.UserIdentity, permissionCodes []string) (map[string]bool, error)

    // 获取用户所有权限
    GetUserPermissions(ctx context.Context, identity models.UserIdentity) ([]string, error)

    // 刷新权限缓存
    InvalidateCache(ctx context.Context, identity models.UserIdentity) error

    // 检查企业访问权限
    CheckEnterpriseAccess(ctx context.Context, userID uint, resourceEnterpriseID uint) (bool, error)
}

type permissionServiceV2Impl struct {
    systemPermChecker     *SystemPermissionChecker
    enterprisePermChecker *EnterprisePermissionChecker
    cache                 *PermissionCache
    identityProvider      models.IdentityProvider
}

// NewPermissionServiceV2 创建权限服务实例
func NewPermissionServiceV2(
    systemChecker *SystemPermissionChecker,
    enterpriseChecker *EnterprisePermissionChecker,
    cache *PermissionCache,
    identityProvider models.IdentityProvider,
) PermissionServiceV2 {
    return &permissionServiceV2Impl{
        systemPermChecker:     systemChecker,
        enterprisePermChecker: enterpriseChecker,
        cache:                 cache,
        identityProvider:      identityProvider,
    }
}

// CheckSystemPermission 检查系统域权限
func (s *permissionServiceV2Impl) CheckSystemPermission(
    ctx context.Context,
    userID uint,
    permissionCode string,
) (bool, error) {
    // 1. 构建缓存key
    cacheKey := fmt.Sprintf("sys:%d:%s", userID, permissionCode)

    // 2. 检查缓存
    if cached, found := s.cache.Get(ctx, cacheKey); found {
        return cached, nil
    }

    // 3. 获取系统用户身份
    identity, err := s.identityProvider.GetSystemUserIdentity(userID)
    if err != nil {
        return false, fmt.Errorf("获取系统用户身份失败: %w", err)
    }

    if !identity.IsActive {
        return false, fmt.Errorf("系统用户已禁用")
    }

    // 4. 检查角色权限
    hasPermission, err := s.systemPermChecker.CheckRolePermission(
        ctx,
        identity.SystemRoleID,
        permissionCode,
    )
    if err != nil {
        return false, fmt.Errorf("检查系统权限失败: %w", err)
    }

    // 5. 缓存结果（15分钟）
    s.cache.Set(ctx, cacheKey, hasPermission, 15*time.Minute)

    return hasPermission, nil
}

// CheckEnterprisePermission 检查企业域权限
func (s *permissionServiceV2Impl) CheckEnterprisePermission(
    ctx context.Context,
    userID uint,
    enterpriseID uint,
    permissionCode string,
) (bool, error) {
    // 1. 构建缓存key
    cacheKey := fmt.Sprintf("ent:%d:%d:%s", enterpriseID, userID, permissionCode)

    // 2. 检查缓存
    if cached, found := s.cache.Get(ctx, cacheKey); found {
        return cached, nil
    }

    // 3. 获取企业用户身份
    identity, err := s.identityProvider.GetEnterpriseUserIdentity(userID, enterpriseID)
    if err != nil {
        return false, fmt.Errorf("获取企业用户身份失败: %w", err)
    }

    if !identity.IsActive {
        return false, fmt.Errorf("企业用户已禁用")
    }

    // 4. 检查是否为基础权限（所有认证用户都有）
    if s.enterprisePermChecker.IsBasePermission(ctx, permissionCode) {
        s.cache.Set(ctx, cacheKey, true, 1*time.Hour)
        return true, nil
    }

    // 5. 检查用户自定义权限（优先级最高）
    if customPerm, found := s.enterprisePermChecker.GetCustomPermission(
        ctx,
        identity.EnterpriseUserID,
        permissionCode,
    ); found {
        s.cache.Set(ctx, cacheKey, customPerm.IsGranted, 15*time.Minute)
        return customPerm.IsGranted, nil
    }

    // 6. 检查角色权限（合并多个角色）
    roleIDs := s.enterprisePermChecker.GetUserRoleIDs(ctx, identity.EnterpriseUserID)
    hasPermission, err := s.enterprisePermChecker.CheckRolesPermission(
        ctx,
        roleIDs,
        permissionCode,
    )
    if err != nil {
        return false, fmt.Errorf("检查企业权限失败: %w", err)
    }

    // 7. 缓存结果
    s.cache.Set(ctx, cacheKey, hasPermission, 15*time.Minute)

    return hasPermission, nil
}

// CheckEnterpriseAccess 检查用户是否可以访问指定企业的资源
func (s *permissionServiceV2Impl) CheckEnterpriseAccess(
    ctx context.Context,
    userID uint,
    resourceEnterpriseID uint,
) (bool, error) {
    // 1. 获取用户身份
    identity, err := s.identityProvider.GetUserIdentity(userID)
    if err != nil {
        return false, err
    }

    // 2. 系统用户不能直接访问企业数据
    if identity.IsSystemUser() {
        return false, fmt.Errorf("系统管理员不能直接访问企业数据，请通过企业管理门户操作")
    }

    // 3. 企业用户只能访问自己企业的数据
    if identity.IsEnterpriseUser() {
        userEnterpriseID := identity.GetEnterpriseID()
        if userEnterpriseID == nil {
            return false, fmt.Errorf("企业用户缺少enterprise_id")
        }

        if *userEnterpriseID != resourceEnterpriseID {
            return false, fmt.Errorf("无权访问其他企业的数据")
        }

        return true, nil
    }

    return false, fmt.Errorf("未知的用户类型")
}

// BatchCheckPermissions 批量权限检查
func (s *permissionServiceV2Impl) CheckPermissions(
    ctx context.Context,
    identity models.UserIdentity,
    permissionCodes []string,
) (map[string]bool, error) {
    result := make(map[string]bool)

    for _, code := range permissionCodes {
        var hasPermission bool
        var err error

        if identity.IsSystemUser() {
            hasPermission, err = s.CheckSystemPermission(ctx, identity.GetUserID(), code)
        } else if identity.IsEnterpriseUser() {
            enterpriseID := identity.GetEnterpriseID()
            if enterpriseID == nil {
                result[code] = false
                continue
            }
            hasPermission, err = s.CheckEnterprisePermission(ctx, identity.GetUserID(), *enterpriseID, code)
        }

        if err != nil {
            result[code] = false
        } else {
            result[code] = hasPermission
        }
    }

    return result, nil
}

// GetUserPermissions 获取用户的所有权限
func (s *permissionServiceV2Impl) GetUserPermissions(
    ctx context.Context,
    identity models.UserIdentity,
) ([]string, error) {
    if identity.IsSystemUser() {
        sysIdentity := identity.(*models.SystemUserIdentity)
        return s.systemPermChecker.GetRolePermissions(ctx, sysIdentity.SystemRoleID)
    } else if identity.IsEnterpriseUser() {
        entIdentity := identity.(*models.EnterpriseUserIdentity)
        return s.enterprisePermChecker.GetUserPermissions(ctx, entIdentity.EnterpriseUserID)
    }

    return nil, fmt.Errorf("未知的用户类型")
}

// InvalidateCache 清除用户的权限缓存
func (s *permissionServiceV2Impl) InvalidateCache(
    ctx context.Context,
    identity models.UserIdentity,
) error {
    pattern := ""
    if identity.IsSystemUser() {
        pattern = fmt.Sprintf("sys:%d:*", identity.GetUserID())
    } else if identity.IsEnterpriseUser() {
        enterpriseID := identity.GetEnterpriseID()
        if enterpriseID == nil {
            return fmt.Errorf("企业用户缺少enterprise_id")
        }
        pattern = fmt.Sprintf("ent:%d:%d:*", *enterpriseID, identity.GetUserID())
    }

    return s.cache.DeletePattern(ctx, pattern)
}
```

**文件**: `services/system_permission_checker.go`

```go
package services

import (
    "context"
    "gorm.io/gorm"
)

// SystemPermissionChecker 系统权限检查器
type SystemPermissionChecker struct {
    db *gorm.DB
}

func NewSystemPermissionChecker(db *gorm.DB) *SystemPermissionChecker {
    return &SystemPermissionChecker{db: db}
}

// CheckRolePermission 检查系统角色是否拥有指定权限
func (c *SystemPermissionChecker) CheckRolePermission(
    ctx context.Context,
    systemRoleID uint,
    permissionCode string,
) (bool, error) {
    var count int64

    err := c.db.WithContext(ctx).
        Table("system_role_permissions srp").
        Joins("JOIN system_permissions sp ON srp.system_permission_id = sp.id").
        Where("srp.system_role_id = ?", systemRoleID).
        Where("sp.permission_code = ?", permissionCode).
        Where("sp.is_active = TRUE").
        Count(&count).Error

    if err != nil {
        return false, err
    }

    return count > 0, nil
}

// GetRolePermissions 获取系统角色的所有权限
func (c *SystemPermissionChecker) GetRolePermissions(
    ctx context.Context,
    systemRoleID uint,
) ([]string, error) {
    var permissions []string

    err := c.db.WithContext(ctx).
        Table("system_role_permissions srp").
        Joins("JOIN system_permissions sp ON srp.system_permission_id = sp.id").
        Where("srp.system_role_id = ?", systemRoleID).
        Where("sp.is_active = TRUE").
        Pluck("sp.permission_code", &permissions).Error

    if err != nil {
        return nil, err
    }

    return permissions, nil
}
```

**文件**: `services/enterprise_permission_checker.go`

```go
package services

import (
    "context"
    "gorm.io/gorm"
)

// EnterprisePermissionChecker 企业权限检查器
type EnterprisePermissionChecker struct {
    db *gorm.DB
}

func NewEnterprisePermissionChecker(db *gorm.DB) *EnterprisePermissionChecker {
    return &EnterprisePermissionChecker{db: db}
}

// IsBasePermission 检查是否为基础权限
func (c *EnterprisePermissionChecker) IsBasePermission(
    ctx context.Context,
    permissionCode string,
) bool {
    var count int64

    c.db.WithContext(ctx).
        Table("enterprise_permissions").
        Where("permission_code = ?", permissionCode).
        Where("is_base_permission = TRUE").
        Where("is_active = TRUE").
        Count(&count)

    return count > 0
}

// GetCustomPermission 获取用户的自定义权限
func (c *EnterprisePermissionChecker) GetCustomPermission(
    ctx context.Context,
    enterpriseUserID uint,
    permissionCode string,
) (*CustomPermission, bool) {
    var customPerm CustomPermission

    err := c.db.WithContext(ctx).
        Table("enterprise_user_custom_permissions eucp").
        Joins("JOIN enterprise_permissions ep ON eucp.enterprise_permission_id = ep.id").
        Where("eucp.enterprise_user_id = ?", enterpriseUserID).
        Where("ep.permission_code = ?", permissionCode).
        Where("(eucp.expires_at IS NULL OR eucp.expires_at > NOW())").
        Select("eucp.is_granted, eucp.scope_constraint").
        First(&customPerm).Error

    if err != nil {
        return nil, false
    }

    return &customPerm, true
}

// CheckRolesPermission 检查角色是否拥有权限（合并多个角色）
func (c *EnterprisePermissionChecker) CheckRolesPermission(
    ctx context.Context,
    roleIDs []uint,
    permissionCode string,
) (bool, error) {
    if len(roleIDs) == 0 {
        return false, nil
    }

    var count int64

    err := c.db.WithContext(ctx).
        Table("enterprise_role_permissions erp").
        Joins("JOIN enterprise_permissions ep ON erp.enterprise_permission_id = ep.id").
        Where("erp.enterprise_role_id IN ?", roleIDs).
        Where("ep.permission_code = ?", permissionCode).
        Where("ep.is_active = TRUE").
        Count(&count).Error

    if err != nil {
        return false, err
    }

    return count > 0, nil
}

// GetUserRoleIDs 获取用户的所有角色ID
func (c *EnterprisePermissionChecker) GetUserRoleIDs(
    ctx context.Context,
    enterpriseUserID uint,
) []uint {
    var roleIDs []uint

    c.db.WithContext(ctx).
        Table("enterprise_user_roles").
        Where("enterprise_user_id = ?", enterpriseUserID).
        Where("(expires_at IS NULL OR expires_at > NOW())").
        Pluck("enterprise_role_id", &roleIDs)

    return roleIDs
}

// GetUserPermissions 获取用户的所有权限（合并角色权限和自定义权限）
func (c *EnterprisePermissionChecker) GetUserPermissions(
    ctx context.Context,
    enterpriseUserID uint,
) ([]string, error) {
    // 1. 获取基础权限
    var basePerms []string
    c.db.WithContext(ctx).
        Table("enterprise_permissions").
        Where("is_base_permission = TRUE").
        Where("is_active = TRUE").
        Pluck("permission_code", &basePerms)

    // 2. 获取角色权限
    roleIDs := c.GetUserRoleIDs(ctx, enterpriseUserID)
    var rolePerms []string
    if len(roleIDs) > 0 {
        c.db.WithContext(ctx).
            Table("enterprise_role_permissions erp").
            Joins("JOIN enterprise_permissions ep ON erp.enterprise_permission_id = ep.id").
            Where("erp.enterprise_role_id IN ?", roleIDs).
            Where("ep.is_active = TRUE").
            Pluck("ep.permission_code", &rolePerms)
    }

    // 3. 获取自定义权限（授予的）
    var customPerms []string
    c.db.WithContext(ctx).
        Table("enterprise_user_custom_permissions eucp").
        Joins("JOIN enterprise_permissions ep ON eucp.enterprise_permission_id = ep.id").
        Where("eucp.enterprise_user_id = ?", enterpriseUserID).
        Where("eucp.is_granted = TRUE").
        Where("(eucp.expires_at IS NULL OR eucp.expires_at > NOW())").
        Pluck("ep.permission_code", &customPerms)

    // 4. 获取自定义权限（撤销的）
    var revokedPerms []string
    c.db.WithContext(ctx).
        Table("enterprise_user_custom_permissions eucp").
        Joins("JOIN enterprise_permissions ep ON eucp.enterprise_permission_id = ep.id").
        Where("eucp.enterprise_user_id = ?", enterpriseUserID).
        Where("eucp.is_granted = FALSE").
        Where("(eucp.expires_at IS NULL OR eucp.expires_at > NOW())").
        Pluck("ep.permission_code", &revokedPerms)

    // 5. 合并权限
    permSet := make(map[string]bool)

    // 添加基础权限
    for _, perm := range basePerms {
        permSet[perm] = true
    }

    // 添加角色权限
    for _, perm := range rolePerms {
        permSet[perm] = true
    }

    // 添加自定义授予权限
    for _, perm := range customPerms {
        permSet[perm] = true
    }

    // 移除自定义撤销权限
    for _, perm := range revokedPerms {
        delete(permSet, perm)
    }

    // 转换为数组
    result := make([]string, 0, len(permSet))
    for perm := range permSet {
        result = append(result, perm)
    }

    return result, nil
}

// CustomPermission 自定义权限
type CustomPermission struct {
    IsGranted       bool
    ScopeConstraint map[string]interface{}
}
```

#### 3.3 中间件重构

**文件**: `middleware/permission_middleware_v2.go`

```go
package middleware

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "new-ai-proj/models"
    "new-ai-proj/services"
)

// PermissionMiddlewareV2 权限中间件
type PermissionMiddlewareV2 struct {
    permService      services.PermissionServiceV2
    identityProvider models.IdentityProvider
}

func NewPermissionMiddlewareV2(
    permService services.PermissionServiceV2,
    identityProvider models.IdentityProvider,
) *PermissionMiddlewareV2 {
    return &PermissionMiddlewareV2{
        permService:      permService,
        identityProvider: identityProvider,
    }
}

// RequireSystemPermission 要求系统域权限
func (m *PermissionMiddlewareV2) RequireSystemPermission(permissionCode string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 获取用户ID
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
            c.Abort()
            return
        }

        // 2. 获取用户身份
        identity, err := m.identityProvider.GetSystemUserIdentity(userID.(uint))
        if err != nil {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "需要系统管理员权限",
                "detail": err.Error(),
            })
            c.Abort()
            return
        }

        // 3. 检查权限
        hasPermission, err := m.permService.CheckSystemPermission(
            c.Request.Context(),
            identity.GetUserID(),
            permissionCode,
        )
        if err != nil || !hasPermission {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "权限不足",
                "required": permissionCode,
            })
            c.Abort()
            return
        }

        // 4. 将身份信息存入context
        c.Set("user_identity", identity)
        c.Next()
    }
}

// RequireEnterprisePermission 要求企业域权限
func (m *PermissionMiddlewareV2) RequireEnterprisePermission(permissionCode string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 获取用户ID和企业ID
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
            c.Abort()
            return
        }

        enterpriseID, exists := c.Get("enterprise_id")
        if !exists {
            c.JSON(http.StatusForbidden, gin.H{"error": "缺少企业身份"})
            c.Abort()
            return
        }

        // 2. 获取用户身份
        identity, err := m.identityProvider.GetEnterpriseUserIdentity(
            userID.(uint),
            enterpriseID.(uint),
        )
        if err != nil {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "需要企业用户身份",
                "detail": err.Error(),
            })
            c.Abort()
            return
        }

        // 3. 检查权限
        hasPermission, err := m.permService.CheckEnterprisePermission(
            c.Request.Context(),
            identity.GetUserID(),
            *identity.GetEnterpriseID(),
            permissionCode,
        )
        if err != nil || !hasPermission {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "权限不足",
                "required": permissionCode,
            })
            c.Abort()
            return
        }

        // 4. 将身份信息存入context
        c.Set("user_identity", identity)
        c.Next()
    }
}

// RequireSystemUser 要求系统用户身份（不检查具体权限）
func (m *PermissionMiddlewareV2) RequireSystemUser() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
            c.Abort()
            return
        }

        identity, err := m.identityProvider.GetSystemUserIdentity(userID.(uint))
        if err != nil {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "需要系统管理员身份",
                "detail": err.Error(),
            })
            c.Abort()
            return
        }

        c.Set("user_identity", identity)
        c.Next()
    }
}

// RequireEnterpriseUser 要求企业用户身份（不检查具体权限）
func (m *PermissionMiddlewareV2) RequireEnterpriseUser() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
            c.Abort()
            return
        }

        enterpriseID, exists := c.Get("enterprise_id")
        if !exists {
            c.JSON(http.StatusForbidden, gin.H{"error": "缺少企业身份"})
            c.Abort()
            return
        }

        identity, err := m.identityProvider.GetEnterpriseUserIdentity(
            userID.(uint),
            enterpriseID.(uint),
        )
        if err != nil {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "需要企业用户身份",
                "detail": err.Error(),
            })
            c.Abort()
            return
        }

        c.Set("user_identity", identity)
        c.Next()
    }
}

// EnforceEnterpriseIsolation 强制企业隔离中间件
func (m *PermissionMiddlewareV2) EnforceEnterpriseIsolation() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
            c.Abort()
            return
        }

        // 获取用户身份
        identity, err := m.identityProvider.GetUserIdentity(userID.(uint))
        if err != nil {
            c.JSON(http.StatusForbidden, gin.H{"error": "无法识别用户身份"})
            c.Abort()
            return
        }

        // 系统用户不能直接访问企业数据
        if identity.IsSystemUser() {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "系统管理员不能直接访问企业数据",
                "hint": "请通过企业管理门户进行操作",
            })
            c.Abort()
            return
        }

        // 企业用户只能访问自己企业的数据
        if identity.IsEnterpriseUser() {
            resourceEnterpriseID := extractEnterpriseIDFromResource(c)
            userEnterpriseID := identity.GetEnterpriseID()

            if resourceEnterpriseID != nil && userEnterpriseID != nil {
                if *resourceEnterpriseID != *userEnterpriseID {
                    c.JSON(http.StatusForbidden, gin.H{
                        "error": "无权访问其他企业的数据",
                    })
                    c.Abort()
                    return
                }
            } else if resourceEnterpriseID != nil {
                // 资源有enterprise_id但用户没有，拒绝访问
                c.JSON(http.StatusForbidden, gin.H{
                    "error": "用户缺少企业身份",
                })
                c.Abort()
                return
            }
        }

        c.Set("user_identity", identity)
        c.Next()
    }
}

// extractEnterpriseIDFromResource 从资源中提取enterprise_id
func extractEnterpriseIDFromResource(c *gin.Context) *uint {
    // 1. 从路径参数提取
    if enterpriseIDStr := c.Param("enterprise_id"); enterpriseIDStr != "" {
        var enterpriseID uint
        if _, err := fmt.Sscanf(enterpriseIDStr, "%d", &enterpriseID); err == nil {
            return &enterpriseID
        }
    }

    // 2. 从查询参数提取
    if enterpriseIDStr := c.Query("enterprise_id"); enterpriseIDStr != "" {
        var enterpriseID uint
        if _, err := fmt.Sscanf(enterpriseIDStr, "%d", &enterpriseID); err == nil {
            return &enterpriseID
        }
    }

    // 3. 从context提取（前置中间件可能已设置）
    if enterpriseID, exists := c.Get("resource_enterprise_id"); exists {
        if id, ok := enterpriseID.(uint); ok {
            return &id
        }
    }

    return nil
}
```

#### 3.4 路由分离

**文件**: `routes/system_routes_v2.go`

```go
package routes

import (
    "github.com/gin-gonic/gin"
    "new-ai-proj/core"
    "new-ai-proj/handlers"
    "new-ai-proj/middleware"
)

// SetupSystemRoutesV2 设置系统域路由
func SetupSystemRoutesV2(r *gin.Engine, app *core.Application) {
    permMW := app.GetPermissionMiddlewareV2()

    // 系统API根路径
    systemAPI := r.Group("/api/v1/system")
    systemAPI.Use(permMW.RequireSystemUser()) // 所有系统路由都要求系统用户身份

    // 企业管理（系统管理员）
    enterprises := systemAPI.Group("/enterprises")
    {
        enterprises.GET("",
            permMW.RequireSystemPermission("system.enterprise.list"),
            handlers.ListEnterprises,
        )
        enterprises.POST("",
            permMW.RequireSystemPermission("system.enterprise.create"),
            handlers.CreateEnterprise,
        )
        enterprises.GET("/:id",
            permMW.RequireSystemPermission("system.enterprise.read"),
            handlers.GetEnterprise,
        )
        enterprises.PUT("/:id",
            permMW.RequireSystemPermission("system.enterprise.update"),
            handlers.UpdateEnterprise,
        )
        enterprises.DELETE("/:id",
            permMW.RequireSystemPermission("system.enterprise.delete"),
            handlers.SoftDeleteEnterprise,
        )

        // 企业统计信息（不访问业务数据）
        enterprises.GET("/:id/stats",
            permMW.RequireSystemPermission("system.enterprise.read"),
            handlers.GetEnterpriseStats,
        )
    }

    // 系统用户管理
    systemUsers := systemAPI.Group("/users")
    {
        systemUsers.GET("",
            permMW.RequireSystemPermission("system.user.read"),
            handlers.ListSystemUsers,
        )
        systemUsers.POST("",
            permMW.RequireSystemPermission("system.user.create"),
            handlers.CreateSystemUser,
        )
        systemUsers.GET("/:id",
            permMW.RequireSystemPermission("system.user.read"),
            handlers.GetSystemUser,
        )
        systemUsers.PUT("/:id",
            permMW.RequireSystemPermission("system.user.update"),
            handlers.UpdateSystemUser,
        )
        systemUsers.DELETE("/:id",
            permMW.RequireSystemPermission("system.user.delete"),
            handlers.DeleteSystemUser,
        )

        // 分配系统角色
        systemUsers.PUT("/:id/role",
            permMW.RequireSystemPermission("system.role.assign"),
            handlers.AssignSystemRole,
        )
    }

    // 系统角色管理（只读）
    systemRoles := systemAPI.Group("/roles")
    {
        systemRoles.GET("", handlers.ListSystemRoles)
        systemRoles.GET("/:id", handlers.GetSystemRole)
        systemRoles.GET("/:id/permissions", handlers.GetSystemRolePermissions)
    }

    // 系统权限管理（只读）
    systemPermissions := systemAPI.Group("/permissions")
    {
        systemPermissions.GET("", handlers.ListSystemPermissions)
        systemPermissions.GET("/:id", handlers.GetSystemPermission)
    }

    // 平台监控
    monitoring := systemAPI.Group("/monitoring")
    monitoring.Use(permMW.RequireSystemPermission("system.monitoring.view"))
    {
        monitoring.GET("/stats", handlers.GetPlatformStats)
        monitoring.GET("/health", handlers.GetSystemHealth)
    }

    // 审计日志
    audit := systemAPI.Group("/audit")
    audit.Use(permMW.RequireSystemPermission("system.audit.view"))
    {
        audit.GET("/logs", handlers.GetSystemAuditLogs)
        audit.GET("/logs/:id", handlers.GetSystemAuditLog)
    }

    // 系统配置
    config := systemAPI.Group("/config")
    {
        config.GET("",
            permMW.RequireSystemPermission("system.config.read"),
            handlers.GetSystemConfig,
        )
        config.PUT("",
            permMW.RequireSystemPermission("system.config.update"),
            handlers.UpdateSystemConfig,
        )
    }
}
```

**文件**: `routes/enterprise_routes_v2.go`

```go
package routes

import (
    "github.com/gin-gonic/gin"
    "new-ai-proj/core"
    "new-ai-proj/handlers"
    "new-ai-proj/middleware"
)

// SetupEnterpriseRoutesV2 设置企业域路由
func SetupEnterpriseRoutesV2(r *gin.Engine, app *core.Application) {
    permMW := app.GetPermissionMiddlewareV2()

    // 企业API根路径
    enterpriseAPI := r.Group("/api/v1/enterprise")
    enterpriseAPI.Use(
        permMW.RequireEnterpriseUser(),      // 要求企业用户身份
        permMW.EnforceEnterpriseIsolation(), // 强制企业隔离
    )

    // 企业用户管理
    users := enterpriseAPI.Group("/users")
    {
        users.GET("",
            permMW.RequireEnterprisePermission("enterprise.user.read"),
            handlers.ListEnterpriseUsers,
        )
        users.POST("",
            permMW.RequireEnterprisePermission("enterprise.user.create"),
            handlers.CreateEnterpriseUser,
        )
        users.GET("/:id",
            permMW.RequireEnterprisePermission("enterprise.user.read"),
            handlers.GetEnterpriseUser,
        )
        users.PUT("/:id",
            permMW.RequireEnterprisePermission("enterprise.user.update"),
            handlers.UpdateEnterpriseUser,
        )
        users.DELETE("/:id",
            permMW.RequireEnterprisePermission("enterprise.user.delete"),
            handlers.DeleteEnterpriseUser,
        )

        // 分配角色
        users.PUT("/:id/roles",
            permMW.RequireEnterprisePermission("enterprise.user.assign_role"),
            handlers.AssignUserRoles,
        )

        // 自定义权限
        users.GET("/:id/permissions", handlers.GetUserPermissions)
        users.PUT("/:id/permissions",
            permMW.RequireEnterprisePermission("enterprise.user.assign_role"),
            handlers.SetUserCustomPermissions,
        )
    }

    // 企业角色管理
    roles := enterpriseAPI.Group("/roles")
    {
        roles.GET("", handlers.ListEnterpriseRoles)
        roles.POST("",
            permMW.RequireEnterprisePermission("enterprise.role.create"),
            handlers.CreateEnterpriseRole,
        )
        roles.GET("/:id", handlers.GetEnterpriseRole)
        roles.PUT("/:id",
            permMW.RequireEnterprisePermission("enterprise.role.update"),
            handlers.UpdateEnterpriseRole,
        )
        roles.DELETE("/:id",
            permMW.RequireEnterprisePermission("enterprise.role.delete"),
            handlers.DeleteEnterpriseRole,
        )

        // 角色权限
        roles.GET("/:id/permissions", handlers.GetRolePermissions)
        roles.PUT("/:id/permissions",
            permMW.RequireEnterprisePermission("enterprise.role.assign_permission"),
            handlers.AssignRolePermissions,
        )
    }

    // 企业权限列表（只读）
    permissions := enterpriseAPI.Group("/permissions")
    {
        permissions.GET("", handlers.ListEnterprisePermissions)
        permissions.GET("/:id", handlers.GetEnterprisePermission)
    }

    // 企业项目管理
    projects := enterpriseAPI.Group("/projects")
    {
        projects.GET("",
            permMW.RequireEnterprisePermission("enterprise.project.read"),
            handlers.ListProjects,
        )
        projects.POST("",
            permMW.RequireEnterprisePermission("enterprise.project.create"),
            handlers.CreateProject,
        )
        projects.GET("/:id",
            permMW.RequireEnterprisePermission("enterprise.project.read"),
            handlers.GetProject,
        )
        projects.PUT("/:id",
            permMW.RequireEnterprisePermission("enterprise.project.update"),
            handlers.UpdateProject,
        )
        projects.DELETE("/:id",
            permMW.RequireEnterprisePermission("enterprise.project.delete"),
            handlers.DeleteProject,
        )
    }

    // 企业任务管理
    tasks := enterpriseAPI.Group("/tasks")
    {
        tasks.GET("",
            permMW.RequireEnterprisePermission("enterprise.task.read"),
            handlers.ListTasks,
        )
        tasks.POST("",
            permMW.RequireEnterprisePermission("enterprise.task.create"),
            handlers.CreateTask,
        )
        tasks.GET("/:id",
            permMW.RequireEnterprisePermission("enterprise.task.read"),
            handlers.GetTask,
        )
        tasks.PUT("/:id",
            permMW.RequireEnterprisePermission("enterprise.task.update"),
            handlers.UpdateTask,
        )
        tasks.DELETE("/:id",
            permMW.RequireEnterprisePermission("enterprise.task.delete"),
            handlers.DeleteTask,
        )

        // 分配任务
        tasks.PUT("/:id/assign",
            permMW.RequireEnterprisePermission("enterprise.task.assign"),
            handlers.AssignTask,
        )
    }

    // 企业文档管理
    documents := enterpriseAPI.Group("/documents")
    {
        documents.GET("",
            permMW.RequireEnterprisePermission("enterprise.document.read"),
            handlers.ListDocuments,
        )
        documents.POST("",
            permMW.RequireEnterprisePermission("enterprise.document.create"),
            handlers.CreateDocument,
        )
        documents.GET("/:id",
            permMW.RequireEnterprisePermission("enterprise.document.read"),
            handlers.GetDocument,
        )
        documents.PUT("/:id",
            permMW.RequireEnterprisePermission("enterprise.document.update"),
            handlers.UpdateDocument,
        )
        documents.DELETE("/:id",
            permMW.RequireEnterprisePermission("enterprise.document.delete"),
            handlers.DeleteDocument,
        )
    }

    // 企业部门管理
    departments := enterpriseAPI.Group("/departments")
    {
        departments.GET("", handlers.ListDepartments)
        departments.POST("",
            permMW.RequireEnterprisePermission("enterprise.department.create"),
            handlers.CreateDepartment,
        )
        departments.GET("/:id", handlers.GetDepartment)
        departments.PUT("/:id",
            permMW.RequireEnterprisePermission("enterprise.department.update"),
            handlers.UpdateDepartment,
        )
        departments.DELETE("/:id",
            permMW.RequireEnterprisePermission("enterprise.department.delete"),
            handlers.DeleteDepartment,
        )
    }
}
```

---

### 4. 实施计划

#### 阶段1: 数据库重构（2-3周）

**Week 1: 创建新表**
- [ ] 创建system_roles, system_permissions, system_role_permissions表
- [ ] 创建system_users表
- [ ] 创建enterprise_roles, enterprise_permissions表
- [ ] 创建enterprise_role_permissions, enterprise_user_roles表
- [ ] 创建enterprise_user_custom_permissions表
- [ ] 重构permission_cache表

**Week 2: 数据迁移**
- [ ] 迁移系统角色和权限定义
- [ ] 迁移现有系统用户到system_users表
- [ ] 为所有企业创建预设角色
- [ ] 迁移企业用户的角色关系
- [ ] 验证数据完整性

**Week 3: 清理和测试**
- [ ] 备份旧表
- [ ] 删除过度复杂的权限表
- [ ] 重命名废弃表
- [ ] 数据一致性测试
- [ ] 性能基准测试

#### 阶段2: 代码重构（3-4周）

**Week 4: 核心服务层**
- [ ] 实现UserIdentity接口和实现类
- [ ] 实现IdentityProvider
- [ ] 实现SystemPermissionChecker
- [ ] 实现EnterprisePermissionChecker
- [ ] 实现PermissionServiceV2
- [ ] 单元测试覆盖率>80%

**Week 5: 中间件层**
- [ ] 实现PermissionMiddlewareV2
- [ ] 实现RequireSystemPermission中间件
- [ ] 实现RequireEnterprisePermission中间件
- [ ] 实现EnforceEnterpriseIsolation中间件
- [ ] 集成测试

**Week 6-7: Handler和路由层**
- [ ] 创建SystemRoutesV2
- [ ] 创建EnterpriseRoutesV2
- [ ] 更新所有Handler使用新的权限检查
- [ ] 修复CheckEnterpriseAccess安全漏洞
- [ ] API测试

#### 阶段3: 灰度发布和切换（2周）

**Week 8: 灰度发布**
- [ ] 部署新代码到测试环境
- [ ] 新旧系统并行运行
- [ ] AB测试（10% → 50% → 100%）
- [ ] 监控错误率和性能

**Week 9: 完全切换**
- [ ] 切换所有流量到新系统
- [ ] 禁用旧的权限检查代码
- [ ] 文档更新
- [ ] 培训和交接

#### 阶段4: 清理和优化（1周）

**Week 10: 代码清理**
- [ ] 删除废弃代码
- [ ] 优化性能瓶颈
- [ ] 完善监控和告警
- [ ] 最终验收测试

---

### 5. 风险评估

| 风险 | 严重程度 | 可能性 | 缓解措施 |
|------|---------|--------|---------|
| 数据迁移失败 | 🔴 高 | 🟡 中 | 充分测试、分步迁移、回滚方案 |
| 权限检查逻辑错误 | 🔴 高 | 🟡 中 | 单元测试、集成测试、灰度发布 |
| 性能下降 | 🟡 中 | 🟡 中 | 性能基准测试、缓存优化 |
| 业务中断 | 🔴 高 | 🟢 低 | 灰度发布、监控告警、快速回滚 |
| 用户混淆 | 🟡 中 | 🟡 中 | 清晰文档、用户培训 |
| 兼容性问题 | 🟡 中 | 🟡 中 | API版本管理、向后兼容 |

---

### 6. 成功指标

**功能指标:**
- ✅ 系统角色和企业角色完全分离
- ✅ 所有API路由使用新的权限检查
- ✅ 企业隔离漏洞修复
- ✅ 权限代码格式统一

**性能指标:**
- ✅ 权限检查平均延迟 < 10ms
- ✅ 缓存命中率 > 90%
- ✅ API响应时间无明显增加

**质量指标:**
- ✅ 单元测试覆盖率 > 80%
- ✅ 集成测试通过率 100%
- ✅ 零安全漏洞
- ✅ 代码审查通过

**业务指标:**
- ✅ 零数据丢失
- ✅ 业务中断时间 < 1小时
- ✅ 用户投诉 < 5起

---

### 7. 后续优化

1. **权限审批流程**
   - 实现权限变更审批工作流
   - 敏感权限需要二次确认
   - 权限变更通知机制

2. **权限分析和推荐**
   - 基于用户行为分析权限使用情况
   - 推荐合适的角色
   - 识别权限冗余

3. **细粒度权限控制**
   - 字段级权限（如只能编辑自己的字段）
   - 时间限制（临时权限）
   - 数量限制（如每月最多创建10个项目）

4. **权限可视化**
   - 权限矩阵展示
   - 角色权限对比
   - 用户权限路径追踪

---

## 📚 附录

### A. 权限代码命名规范

**系统权限格式**: `system.<resource>.<action>`

示例:
- `system.enterprise.create`
- `system.user.assign_role`
- `system.config.update`

**企业权限格式**: `enterprise.<module>.<action>`

示例:
- `enterprise.project.create`
- `enterprise.task.assign`
- `enterprise.user.read`

### B. 角色定义参考

**系统角色:**
- `super_admin`: 超级管理员（所有系统权限）
- `system_admin`: 系统管理员（企业管理、配置管理）
- `system_operator`: 系统操作员（日常运维）
- `system_auditor`: 系统审计员（审计日志查看）
- `system_support`: 系统支持员（客户支持）

**企业预设角色:**
- `enterprise_admin`: 企业管理员（企业内所有权限）
- `project_manager`: 项目经理（项目和任务管理）
- `team_member`: 团队成员（基础权限）
- `guest`: 访客（只读权限）

### C. 相关文档

- [RBAC_CURRENT_ISSUES.md](./RBAC_CURRENT_ISSUES.md) - 当前问题详细分析
- [RBAC_MIGRATION_GUIDE.md](./RBAC_MIGRATION_GUIDE.md) - 迁移指南
- [RBAC_API_REFERENCE.md](./RBAC_API_REFERENCE.md) - API参考文档
- [RBAC_TESTING_PLAN.md](./RBAC_TESTING_PLAN.md) - 测试计划

---

**文档变更历史:**

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| v1.0 | 2025-10-28 | Claude Code | 初始版本 |

---

**审批记录:**

| 角色 | 姓名 | 签名 | 日期 |
|------|------|------|------|
| 产品负责人 | | | |
| 技术负责人 | | | |
| 安全负责人 | | | |
