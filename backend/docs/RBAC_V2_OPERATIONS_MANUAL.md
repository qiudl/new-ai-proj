# RBAC v2 双域权限系统操作手册

**版本**: 1.0
**最后更新**: 2025-10-29
**目标读者**: 系统管理员、企业管理员
**难度级别**: 中级

---

## 目录

1. [系统概述](#系统概述)
2. [双域架构](#双域架构)
3. [系统域管理](#系统域管理)
4. [企业域管理](#企业域管理)
5. [常见操作](#常见操作)
6. [故障排查](#故障排查)
7. [最佳实践](#最佳实践)
8. [API参考](#api参考)

---

## 系统概述

### 什么是RBAC v2？

RBAC v2（Role-Based Access Control Version 2）是本系统的新一代权限管理架构，采用**双域设计**，将系统管理和企业管理完全隔离。

### 核心特性

- ✅ **双域隔离**: 系统域（System Domain）和企业域（Enterprise Domain）权限完全分离
- ✅ **细粒度控制**: 73个权限点，覆盖所有功能模块
- ✅ **多租户支持**: 每个企业独立的角色和权限体系
- ✅ **内置角色**: 预设常用角色，开箱即用
- ✅ **灵活扩展**: 支持自定义角色和动态权限配置

### 版本对比

| 特性 | 旧系统 | RBAC v2 |
|------|--------|---------|
| 权限域 | 单一 | 双域（系统+企业） |
| 多租户 | 不支持 | 完全支持 |
| 权限点数 | ~50 | 73 (22系统 + 51企业) |
| 角色隔离 | 全局共享 | 企业独立 |
| 自定义角色 | 有限 | 完全支持 |

---

## 双域架构

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                  RBAC v2 双域权限系统                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────┐      ┌────────────────────┐   │
│  │   系统域 (System)   │      │  企业域 (Enterprise) │   │
│  ├────────────────────┤      ├────────────────────┤   │
│  │ 管理对象:           │      │ 管理对象:            │   │
│  │ • 企业             │      │ • 项目              │   │
│  │ • 系统用户         │      │ • 任务              │   │
│  │ • 系统角色         │      │ • 文档              │   │
│  │ • 系统权限         │      │ • 企业成员          │   │
│  │ • 系统配置         │      │ • 企业设置          │   │
│  │                    │      │                    │   │
│  │ 目标用户:           │      │ 目标用户:            │   │
│  │ • super_admin      │      │ • enterprise_admin │   │
│  │ • admin            │      │ • project_manager  │   │
│  │ • enterprise_mgr   │      │ • member           │   │
│  │                    │      │ • viewer           │   │
│  └────────────────────┘      └────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 域的选择

| 场景 | 使用域 |
|------|--------|
| 创建新企业 | 系统域 |
| 管理系统用户（admin等） | 系统域 |
| 配置系统设置 | 系统域 |
| 访问所有企业数据（高危） | 系统域 (super_admin only) |
| 管理企业内的项目和任务 | 企业域 |
| 邀请企业成员 | 企业域 |
| 分配企业角色 | 企业域 |
| 设置企业配置 | 企业域 |

---

## 系统域管理

### 系统角色

#### super_admin（超级管理员）

**权限级别**: 1000 (最高)
**权限数量**: 22个
**适用场景**: CTO、技术负责人

**核心权限**:
- ✅ 所有系统域权限
- ✅ **system.enterprise.access_data** (高危权限，可访问所有企业数据)
- ✅ 创建/删除企业
- ✅ 管理所有系统用户
- ✅ 配置系统设置
- ✅ 查看审计日志

**使用建议**:
- ⚠️ 严格限制人数（建议≤3人）
- ⚠️ 定期审查使用记录
- ⚠️ 避免日常使用，仅在必要时使用

#### admin（系统管理员）

**权限级别**: 800
**权限数量**: 20个
**适用场景**: 系统管理员、运维人员

**核心权限**:
- ✅ 企业管理（创建、查看、修改、删除）
- ✅ 系统用户管理
- ✅ 系统角色管理
- ✅ 查看审计日志
- ❌ **不包括** access_data（无法访问企业业务数据）

**使用建议**:
- ✅ 日常系统管理推荐使用
- ✅ 权限适中，风险可控
- ✅ 适合分配给运维团队

#### enterprise_manager（企业管理员）

**权限级别**: 600
**权限数量**: 4个
**适用场景**: 客户成功团队、支持人员

**核心权限**:
- ✅ 查看企业列表和详情
- ✅ 更新企业基本信息
- ✅ 查看系统配置（只读）
- ✅ 查看审计日志（只读）
- ❌ 不能创建/删除企业
- ❌ 不能管理系统用户

**使用建议**:
- ✅ 适合客户支持团队
- ✅ 可以帮助企业配置和维护
- ✅ 权限最小化，安全性高

#### system_user（系统用户）

**权限级别**: 400
**权限数量**: 4个
**适用场景**: 临时访问、受限用户

**核心权限**:
- ✅ 查看系统配置（只读）
- ✅ 查看审计日志（只读）
- ❌ 无管理权限

**使用建议**:
- ✅ 新用户的默认角色
- ✅ 临时账号
- ✅ 只读访问

### 系统权限列表

#### 企业管理 (5个)
```
system.enterprise.create      - 创建企业
system.enterprise.read        - 查看企业
system.enterprise.update      - 更新企业
system.enterprise.delete      - 删除企业
system.enterprise.access_data - 访问企业数据（高危）
```

#### 用户管理 (6个)
```
system.user.create       - 创建系统用户
system.user.read         - 查看用户详情
system.user.list         - 查看用户列表
system.user.update       - 更新用户
system.user.delete       - 删除用户
system.user.assign_role  - 分配角色
```

#### 角色管理 (5个)
```
system.role.create  - 创建角色
system.role.read    - 查看角色详情
system.role.list    - 查看角色列表
system.role.update  - 更新角色
system.role.delete  - 删除角色
```

#### 权限管理 (2个)
```
system.permission.read  - 查看权限详情
system.permission.list  - 查看权限列表
```

#### 系统配置 (2个)
```
system.config.read    - 查看系统配置
system.config.update  - 更新系统配置
```

#### 审计日志 (2个)
```
system.audit.read  - 查看审计日志
system.audit.list  - 查看审计列表
```

---

## 企业域管理

### 企业角色

每个企业在创建时会自动生成4个预设角色：

#### enterprise_admin（企业管理员）

**权限数量**: 18个
**适用场景**: 企业所有者、部门负责人

**核心权限**:
- ✅ 项目：创建、查看、修改、删除
- ✅ 任务：创建、查看、修改、删除、分配
- ✅ 文档：创建、查看、修改、删除
- ✅ 成员：查看、更新、邀请、移除
- ✅ 设置：更新企业配置

**使用建议**:
- ✅ 企业内最高权限
- ✅ 分配给企业关键负责人
- ✅ 建议每个企业2-5人

#### project_manager（项目经理）

**权限数量**: ~12个
**适用场景**: 项目经理、团队负责人

**核心权限**:
- ✅ 项目：创建、查看、修改
- ✅ 任务：完全管理（创建、查看、修改、删除、分配）
- ✅ 文档：完全管理
- ✅ 成员：查看（只读）
- ❌ 不能删除项目
- ❌ 不能管理企业设置

**使用建议**:
- ✅ 项目日常管理角色
- ✅ 可以分配任务给团队成员
- ✅ 适合团队Leader

#### member（普通成员）⭐

**权限数量**: ~6个
**适用场景**: 普通员工、开发人员
**默认角色**: ✅ 新邀请用户自动分配此角色

**核心权限**:
- ✅ 项目：查看
- ✅ 任务：查看、更新自己的任务
- ✅ 文档：查看、创建
- ❌ 不能创建项目
- ❌ 不能分配任务给他人
- ❌ 不能删除任何内容

**使用建议**:
- ✅ **推荐作为默认角色**
- ✅ 适合大部分团队成员
- ✅ 权限适中，满足日常工作需求

#### viewer（只读用户）

**权限数量**: ~3个
**适用场景**: 外部顾问、临时查看

**核心权限**:
- ✅ 项目：查看（只读）
- ✅ 任务：查看（只读）
- ✅ 文档：查看（只读）
- ❌ 无任何修改权限

**使用建议**:
- ✅ 外部合作伙伴
- ✅ 临时访问
- ✅ 审计查看

### 企业权限列表

#### 项目管理 (13个)
```
enterprise.project.create     - 创建项目
enterprise.project.read       - 查看项目
enterprise.project.update     - 更新项目
enterprise.project.delete     - 删除项目
enterprise.project.archive    - 归档项目
enterprise.project.restore    - 恢复项目
... (其他项目相关权限)
```

#### 任务管理 (15个)
```
enterprise.task.create   - 创建任务
enterprise.task.read     - 查看任务
enterprise.task.update   - 更新任务
enterprise.task.delete   - 删除任务
enterprise.task.assign   - 分配任务
... (其他任务相关权限)
```

#### 文档管理 (10个)
```
enterprise.document.create  - 创建文档
enterprise.document.read    - 查看文档
enterprise.document.update  - 更新文档
enterprise.document.delete  - 删除文档
... (其他文档相关权限)
```

#### 成员管理 (8个)
```
enterprise.member.read    - 查看成员
enterprise.member.update  - 更新成员
enterprise.member.invite  - 邀请成员
enterprise.member.remove  - 移除成员
... (其他成员相关权限)
```

#### 设置管理 (5个)
```
enterprise.settings.read    - 查看设置
enterprise.settings.update  - 更新设置
... (其他设置相关权限)
```

---

## 常见操作

### 操作1: 创建新企业

**使用场景**: 为新客户开通企业账号

**操作步骤**:

1. **系统域登录**: 使用admin或super_admin账号登录

2. **创建企业** (API或前端):
```bash
POST /api/v1/enterprises
{
  "name": "新企业名称",
  "contact_person": "联系人",
  "contact_email": "email@example.com"
}
```

3. **预设角色自动创建**: 系统自动为新企业创建4个预设角色
   - enterprise_admin
   - project_manager
   - member
   - viewer

4. **邀请企业管理员**: 邀请第一个用户作为企业管理员
```bash
POST /api/v1/enterprises/{enterprise_id}/users
{
  "user_id": 123,
  "role_ids": [企业admin角色ID]
}
```

**注意事项**:
- ✅ 企业创建后无法删除（仅可标记为非活跃）
- ✅ 预设角色不可删除，可以修改权限
- ✅ 建议先创建企业管理员，再由管理员邀请其他成员

### 操作2: 邀请企业用户

**使用场景**: 企业管理员添加新成员

**操作步骤**:

1. **确保用户已存在** (如果没有，先创建用户):
```bash
POST /api/v1/users
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "********"
}
```

2. **邀请用户到企业**:
```bash
POST /api/v1/enterprises/{enterprise_id}/users
{
  "user_id": 456
}
```

3. **系统自动分配角色**:
   - ✅ 自动分配`member`（普通成员）角色
   - ✅ 用户可以立即使用企业基础功能

4. **（可选）调整角色**:
```bash
PUT /api/v1/enterprises/{enterprise_id}/users/{user_id}/roles
{
  "role_ids": [project_manager_role_id]
}
```

**注意事项**:
- ✅ 新用户默认获得member角色（~6个权限）
- ✅ 用户必须重新登录才能获得新权限
- ✅ 支持同时分配多个角色

### 操作3: 调整用户角色

**使用场景**: 升级/降级用户权限

**操作步骤**:

1. **查看用户当前角色**:
```bash
GET /api/v1/enterprises/{enterprise_id}/users/{user_id}
```

2. **更新角色**:
```bash
PUT /api/v1/enterprises/{enterprise_id}/users/{user_id}/roles
{
  "role_ids": [new_role_id1, new_role_id2]
}
```

3. **通知用户重新登录**:
   - ⚠️ 权限更改后，用户必须重新登录才能生效
   - ⚠️ 旧的JWT token包含旧的权限信息

**常见角色升级路径**:
```
viewer (3权限)
  ↓ 升级
member (6权限)
  ↓ 升级
project_manager (12权限)
  ↓ 升级
enterprise_admin (18权限)
```

### 操作4: 批量修复NULL role_id用户

**使用场景**: 修复旧数据或迁移后的权限问题

**操作步骤**:

1. **查找问题用户**:
```sql
SELECT
    eu.id,
    eu.user_id,
    eu.username,
    e.name as enterprise_name
FROM enterprise_users eu
JOIN enterprises e ON eu.enterprise_id = e.id
WHERE eu.role_id IS NULL
AND eu.deleted_at IS NULL
AND eu.status = 'active';
```

2. **批量分配member角色**:
```sql
UPDATE enterprise_users
SET
    role_id = (
        SELECT id FROM enterprise_roles
        WHERE enterprise_id = enterprise_users.enterprise_id
        AND code = 'member'
        LIMIT 1
    ),
    updated_at = NOW()
WHERE role_id IS NULL
AND deleted_at IS NULL
AND status = 'active';
```

3. **验证修复结果**:
```sql
SELECT COUNT(*) FROM enterprise_users
WHERE role_id IS NULL
AND deleted_at IS NULL
AND status = 'active';
-- 应返回: 0
```

### 操作5: 查看用户权限

**使用场景**: 排查权限问题

**方法1: 数据库查询 (RBAC v2)**
```sql
-- 查看用户的RBAC v2权限
SELECT
    eu.username,
    er.code as role_code,
    er.name as role_name,
    ep.code as permission_code,
    ep.name as permission_name
FROM enterprise_users eu
JOIN enterprise_roles er ON eu.role_id = er.id
JOIN enterprise_role_permissions erp ON er.id = erp.role_id
JOIN enterprise_permissions ep ON erp.permission_id = ep.id
WHERE eu.user_id = {user_id}
AND eu.enterprise_id = {enterprise_id};
```

**方法2: API查询**
```bash
GET /api/v1/enterprises/{enterprise_id}/users/{user_id}
```

**方法3: 检查JWT Token**
```javascript
// 在浏览器Console
const token = localStorage.getItem('auth_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
```

---

## 故障排查

### 问题1: 用户报告403权限错误

**症状**:
```
403 Forbidden
抱歉，您没有权限访问此页面
需要权限: project.detail.read
```

**排查步骤**:

1. **检查RBAC v2角色分配**:
```sql
SELECT eu.user_id, eu.role_id, er.code, er.name
FROM enterprise_users eu
LEFT JOIN enterprise_roles er ON eu.role_id = er.id
WHERE eu.user_id = {user_id};
```

**可能原因A**: role_id为NULL
```sql
-- 修复: 分配member角色
UPDATE enterprise_users
SET role_id = (
    SELECT id FROM enterprise_roles
    WHERE enterprise_id = {enterprise_id}
    AND code = 'member'
    LIMIT 1
)
WHERE user_id = {user_id} AND enterprise_id = {enterprise_id};
```

2. **检查旧系统角色** (前端仍在使用):
```sql
SELECT u.id, cr.role_code, cr.role_name
FROM users u
JOIN enterprise_user_roles eur ON u.id = eur.user_id
LEFT JOIN company_roles cr ON eur.role_id = cr.id
WHERE u.id = {user_id};
```

**可能原因B**: 旧系统角色权限不足
```sql
-- 修复: 更新为company_admin
UPDATE enterprise_user_roles
SET role_id = 1  -- company_admin
WHERE user_id = {user_id};
```

3. **验证JWT Token内容**:
```javascript
// 检查JWT中的role字段
const token = localStorage.getItem('auth_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Role:', payload.role);  // 应该是company_admin或其他有效角色
```

**可能原因C**: 用户未重新登录
- ✅ **解决方案**: 用户必须完全退出并重新登录

### 问题2: 左侧菜单显示不正确

**症状**: 企业管理员看不到企业组织管理菜单

**排查步骤**:

1. **检查user_type和role**:
```javascript
const payload = JSON.parse(atob(localStorage.getItem('auth_token').split('.')[1]));
console.log('User Type:', payload.user_type);  // 应为 "enterprise"
console.log('Role:', payload.role);            // 应为 "company_admin"
```

2. **验证前端菜单配置**:
```javascript
// 检查menuVisibility.ts配置
// enterprise_users 菜单需要:
// userType: COMPANY_USER
// requiredRole: ['company_admin']
```

3. **清除缓存重新登录**:
```
1. 退出登录
2. 清除浏览器缓存和LocalStorage
3. 使用无痕模式重新登录
4. 检查菜单是否正确显示
```

### 问题3: API返回"Invalid token"

**症状**:
```json
{
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Invalid token"
  }
}
```

**排查步骤**:

1. **检查token是否过期**:
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expires at:', new Date(payload.exp * 1000));
console.log('Current time:', new Date());
```

2. **检查JWT_SECRET配置**:
```bash
# 确保前后端使用相同的secret
grep JWT_SECRET .env
```

3. **检查token格式**:
```javascript
// JWT应该有3个部分，用.分隔
const parts = token.split('.');
console.log('Token parts:', parts.length);  // 应为3
```

**解决方案**: 重新登录获取新token

### 问题4: 新邀请用户无法访问任何功能

**症状**: 新用户登录后什么都做不了

**排查步骤**:

1. **检查是否自动分配了角色**:
```sql
SELECT eu.id, eu.user_id, eu.role_id, er.code
FROM enterprise_users eu
LEFT JOIN enterprise_roles er ON eu.role_id = er.id
WHERE eu.user_id = {new_user_id};
```

**预期结果**: role_id不为NULL，code为'member'

2. **如果role_id为NULL** (旧版本bug):
```sql
-- 手动分配member角色
UPDATE enterprise_users
SET role_id = (
    SELECT id FROM enterprise_roles
    WHERE enterprise_id = {enterprise_id}
    AND code = 'member'
    LIMIT 1
)
WHERE user_id = {new_user_id};
```

3. **要求用户重新登录**:
   - 数据库更新后，JWT token仍包含旧信息
   - 必须重新登录获取新token

---

## 最佳实践

### 1. 角色分配原则

#### 最小权限原则
- ✅ 新用户默认分配`member`角色
- ✅ 只在需要时升级权限
- ✅ 定期审查高权限用户

#### 职责分离
- ✅ super_admin：系统架构级操作
- ✅ admin：日常系统管理
- ✅ enterprise_admin：企业内管理
- ✅ member：普通业务操作

### 2. 权限审计

#### 定期审计（建议每季度）
```sql
-- 查找所有super_admin用户
SELECT u.id, u.username, su.created_at
FROM users u
JOIN system_users su ON u.id = su.user_id
WHERE su.role_id = (SELECT id FROM system_roles WHERE code = 'super_admin');

-- 查找所有enterprise_admin用户
SELECT eu.id, eu.username, e.name as enterprise_name
FROM enterprise_users eu
JOIN enterprise_roles er ON eu.role_id = er.id
JOIN enterprises e ON eu.enterprise_id = e.id
WHERE er.code = 'enterprise_admin';
```

#### 审计内容
- ✅ super_admin人数（应≤3）
- ✅ 最后登录时间（超过90天未登录的高权限用户）
- ✅ 权限变更记录
- ✅ 异常访问模式

### 3. 用户生命周期管理

#### 入职
```
1. 创建用户账号
2. 邀请加入企业 → 自动分配member角色
3. （如需要）升级到project_manager或更高
4. 发送欢迎邮件和使用指南
```

#### 职位变动
```
1. 评估新职位所需权限
2. 更新企业角色
3. 通知用户重新登录
4. 记录权限变更
```

#### 离职
```
1. 移除企业成员身份（软删除）
2. 撤销所有企业角色
3. 禁用系统账号（如适用）
4. 备份用户数据
```

### 4. 安全建议

#### 系统域
- ⚠️ super_admin账号使用强密码+2FA
- ⚠️ 记录所有access_data权限使用
- ⚠️ admin账号定期轮换密码
- ⚠️ 禁止共享系统管理员账号

#### 企业域
- ✅ 企业管理员至少2人（避免单点）
- ✅ 定期审查成员列表
- ✅ 离职用户立即移除
- ✅ 使用审计日志追踪敏感操作

### 5. 性能优化

#### 权限缓存
```
- JWT token包含基础权限信息
- 避免每次请求都查询数据库
- Token过期时间: 24小时（可配置）
```

#### 数据库索引
```sql
-- 关键索引（已创建）
CREATE INDEX idx_enterprise_users_role_id ON enterprise_users(role_id);
CREATE INDEX idx_enterprise_users_user_id ON enterprise_users(user_id);
CREATE INDEX idx_enterprise_roles_code ON enterprise_roles(enterprise_id, code);
```

---

## API参考

### 系统域API

#### 获取系统角色列表
```http
GET /api/v1/system/roles
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 1,
        "code": "super_admin",
        "name": "超级管理员",
        "is_active": true,
        "permission_count": 22
      }
    ],
    "total": 4
  }
}
```

#### 获取系统权限列表
```http
GET /api/v1/system/permissions
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": 1,
        "code": "system.enterprise.create",
        "name": "创建企业",
        "resource": "enterprise",
        "action": "create"
      }
    ],
    "total": 22
  }
}
```

#### 获取系统用户列表
```http
GET /api/v1/system/users
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "user_id": 1,
        "username": "admin",
        "role_code": "super_admin",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 7
  }
}
```

### 企业域API

#### 获取企业角色列表
```http
GET /api/v1/enterprises/{enterprise_id}/roles
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 1,
        "code": "enterprise_admin",
        "name": "企业管理员",
        "is_preset": true,
        "permission_count": 18
      }
    ],
    "total": 4
  }
}
```

#### 邀请用户到企业
```http
POST /api/v1/enterprises/{enterprise_id}/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": 123,
  "role_ids": [2, 3]  // 可选，不指定则自动分配member
}

Response:
{
  "success": true,
  "data": {
    "enterprise_user_id": 456,
    "user_id": 123,
    "enterprise_id": 17,
    "default_role_assigned": true,
    "default_role_id": 24,
    "roles_assigned": 0
  },
  "message": "用户成功添加到企业（已自动分配默认角色：普通成员）"
}
```

#### 更新用户角色
```http
PUT /api/v1/enterprises/{enterprise_id}/users/{user_id}/roles
Authorization: Bearer {token}
Content-Type: application/json

{
  "role_ids": [1, 2]
}

Response:
{
  "success": true,
  "data": {
    "user_id": 123,
    "enterprise_id": 17,
    "roles": [
      {
        "id": 1,
        "code": "enterprise_admin",
        "name": "企业管理员"
      }
    ],
    "roles_added": 1,
    "roles_removed": 0
  }
}
```

---

## 附录

### 数据库表结构

#### system_roles
```sql
CREATE TABLE system_roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    privilege_level INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_builtin BOOLEAN DEFAULT FALSE
);
```

#### enterprise_roles
```sql
CREATE TABLE enterprise_roles (
    id SERIAL PRIMARY KEY,
    enterprise_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_preset BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(enterprise_id, code)
);
```

#### enterprise_users
```sql
CREATE TABLE enterprise_users (
    id SERIAL PRIMARY KEY,
    enterprise_id INT NOT NULL,
    user_id INT NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role_id INT,  -- RBAC v2 角色
    status VARCHAR(20) DEFAULT 'active'
);
```

### 快速命令参考

```bash
# 查找NULL role_id用户
SELECT COUNT(*) FROM enterprise_users WHERE role_id IS NULL AND deleted_at IS NULL;

# 批量分配member角色
UPDATE enterprise_users SET role_id = (SELECT id FROM enterprise_roles WHERE enterprise_id = enterprise_users.enterprise_id AND code = 'member' LIMIT 1) WHERE role_id IS NULL;

# 查看用户权限
SELECT eu.username, er.code, COUNT(ep.id) FROM enterprise_users eu JOIN enterprise_roles er ON eu.role_id = er.id LEFT JOIN enterprise_role_permissions erp ON er.id = erp.role_id LEFT JOIN enterprise_permissions ep ON erp.permission_id = ep.id WHERE eu.user_id = ? GROUP BY eu.username, er.code;
```

---

## 文档更新记录

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2025-10-29 | 初始版本 | Claude Code AI |

---

**反馈**: 如有问题或建议，请联系系统管理员团队

**相关文档**:
- RBAC_V2_FINAL_STATUS.md - 系统最终状态报告
- ENTERPRISE_MENU_VERIFICATION.md - 菜单显示验证
- AUTO_ROLE_ASSIGNMENT_IMPLEMENTATION.md - 自动角色分配
