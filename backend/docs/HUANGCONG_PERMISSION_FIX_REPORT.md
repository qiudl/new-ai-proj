# huangcong 账号权限修复报告

**修复时间**: 2025-10-29
**账号**: huangcong (user_id=115)
**企业**: 深圳酷采信息技术有限公司 (enterprise_id=17)

---

## 问题描述

huangcong 用户访问系统时遇到403权限错误：

```
抱歉，您没有权限访问此页面
需要权限: project.detail.read, project:read
需要权限: task.list.read, task:read
```

**症状**:
1. 无法访问项目详情页面
2. 无法查看任务列表
3. 左侧菜单显示不正确（不是企业管理员应有的菜单）

---

## 根本原因分析

### 1. 企业角色未分配（RBAC v2）
**问题**: `enterprise_users.role_id` 为 NULL
- huangcong 在 RBAC v2 的 `enterprise_users` 表中没有被分配企业角色
- 导致无法通过 RBAC v2 权限检查

### 2. 旧系统角色权限不足
**问题**: 旧系统中只有"系统支持员"角色（role_id=24），仅3个权限
- 旧权限系统中，huangcong 被分配了 `system_support` 角色
- 该角色权限极少，无法访问项目和任务功能

### 3. 缺失关键权限
**问题**: company_admin 角色缺少4个关键权限
- `project.read` (id=56)
- `project:read` (id=73)
- `task.read` (id=60)
- `task:read` (id=65)

### 4. 双权限系统兼容问题
**根源**: 前端仍在使用旧的 permissions 表检查权限，而不是 RBAC v2 的 enterprise_permissions
- 需要同时在两个系统中配置权限
- RBAC v2 尚未完全替代旧系统

---

## 修复措施

### 修复1: 分配 RBAC v2 企业角色
```sql
UPDATE enterprise_users
SET role_id = 22  -- enterprise_admin
WHERE user_id = 115 AND enterprise_id = 17;
```

**结果**: huangcong 现在是 `enterprise_admin`（企业管理员），拥有18个企业权限

### 修复2: 更新旧系统角色
```sql
UPDATE enterprise_user_roles
SET role_id = 1  -- company_admin
WHERE user_id = 115;
```

**结果**: huangcong 现在是 `company_admin`（企业管理员），权限从3个→29个

### 修复3: 补充缺失权限
```sql
INSERT INTO role_permissions (role_id, permission_id)
VALUES
    (1, 56),  -- project.read
    (1, 73),  -- project:read
    (1, 60),  -- task.read
    (1, 65);  -- task:read
```

**结果**: company_admin 角色现在拥有所有 project 和 task 相关权限

---

## 修复后的权限配置

### RBAC v2（新系统）
| 项目 | 值 |
|------|-----|
| 角色ID | 22 |
| 角色代码 | `enterprise_admin` |
| 角色名称 | 企业管理员 |
| 权限数量 | 18个 |

**权限列表**:
- `enterprise.project.create/read/update/delete` (4个)
- `enterprise.task.create/read/update/delete/assign` (5个)
- `enterprise.document.create/read/update/delete` (4个)
- `enterprise.member.read/update/invite/remove` (4个)
- `enterprise.settings.update` (1个)

### 旧系统（兼容）
| 项目 | 值 |
|------|-----|
| 角色ID | 1 |
| 角色代码 | `company_admin` |
| 角色名称 | 企业管理员 |
| 权限数量 | 29个 |

**关键权限**:
- ✅ `project.detail.read` - 查看项目详情
- ✅ `project.list.read` - 查看项目列表
- ✅ `project.create` - 创建项目
- ✅ `project.update` - 编辑项目
- ✅ `project.delete` - 删除项目
- ✅ `project.members.manage` - 管理项目成员
- ✅ `project.read` - 项目查看（新增）
- ✅ `project:read` - 读取项目（新增）
- ✅ `task.detail.read` - 查看任务详情
- ✅ `task.list.read` - 查看任务列表
- ✅ `task.create` - 创建任务
- ✅ `task.update` - 编辑任务
- ✅ `task.delete` - 删除任务
- ✅ `task.assign` - 分配任务
- ✅ `task.read` - 任务查看（新增）
- ✅ `task:read` - 读取任务（新增）

---

## 验证步骤

### 1. 数据库验证
```sql
-- 验证RBAC v2角色
SELECT
    eu.username,
    er.code,
    er.name,
    COUNT(erp.id) as permission_count
FROM enterprise_users eu
JOIN enterprise_roles er ON eu.role_id = er.id
LEFT JOIN enterprise_role_permissions erp ON er.id = erp.role_id
WHERE eu.user_id = 115
GROUP BY eu.username, er.code, er.name;

-- 验证旧系统角色
SELECT
    u.username,
    cr.role_code,
    cr.role_name,
    COUNT(rp.permission_id) as permission_count
FROM users u
JOIN enterprise_user_roles eur ON u.id = eur.user_id
JOIN company_roles cr ON eur.role_id = cr.id
LEFT JOIN role_permissions rp ON cr.id = rp.role_id
WHERE u.id = 115
GROUP BY u.username, cr.role_code, cr.role_name;
```

### 2. 前端测试
请 huangcong 执行以下操作：
1. **完全退出系统**（清除浏览器缓存或无痕模式）
2. **重新登录**
3. **检查左侧菜单**: 应显示企业管理员菜单
4. **访问项目列表**: 应能正常查看
5. **访问任务列表**: 应能正常查看
6. **访问项目详情**: 应能正常查看

---

## 后续建议

### 短期（立即）
1. ✅ 通知 huangcong 重新登录测试
2. ⏸️ 检查其他企业用户是否也有类似问题
3. ⏸️ 验证企业管理员菜单是否正确显示

### 中期（本周）
1. ⏸️ 审查所有企业用户的角色分配
2. ⏸️ 为未分配角色的用户批量分配默认角色
3. ⏸️ 更新用户创建流程，确保自动分配角色

### 长期（本月）
1. ⏸️ 完成 RBAC v2 前端集成
2. ⏸️ 逐步迁移前端权限检查到 RBAC v2
3. ⏸️ 建立权限配置监控和告警
4. ⏸️ 编写权限配置标准操作手册

---

## 影响范围

### 受益用户
- **直接**: huangcong (user_id=115)
- **间接**: 所有 company_admin 角色的用户（现在都有完整的 project 和 task 权限）

### 可能需要检查的用户
运行以下查询找出其他可能有问题的用户：

```sql
-- 查找RBAC v2中role_id为NULL的企业用户
SELECT
    eu.id,
    eu.username,
    eu.email,
    e.name as enterprise_name
FROM enterprise_users eu
JOIN enterprises e ON eu.enterprise_id = e.id
WHERE eu.role_id IS NULL
AND eu.deleted_at IS NULL
AND eu.status = 'active'
ORDER BY eu.created_at DESC
LIMIT 50;
```

---

## 技术债务

1. **双权限系统**: 需要同时维护 RBAC v2 和旧权限系统
2. **权限代码不统一**: 存在多种格式 (`project.read`, `project:read`, `enterprise.project.read`)
3. **前端未迁移**: 前端仍使用旧的 permissions 表
4. **角色分配缺失**: 新用户创建时未自动分配角色

---

## 执行记录

```sql
-- 执行时间: 2025-10-29 13:00:00
-- 执行人: Claude Code AI
-- 审核人: [待填写]

-- 操作1: RBAC v2角色分配
UPDATE enterprise_users SET role_id = 22 WHERE user_id = 115 AND enterprise_id = 17;
-- 影响行数: 1

-- 操作2: 旧系统角色更新
UPDATE enterprise_user_roles SET role_id = 1 WHERE user_id = 115;
-- 影响行数: 1

-- 操作3: 补充权限
INSERT INTO role_permissions (role_id, permission_id, created_at)
VALUES (1, 56, NOW()), (1, 73, NOW()), (1, 60, NOW()), (1, 65, NOW());
-- 影响行数: 4

-- 总计修改: 3条UPDATE, 4条INSERT
```

---

## 附录：权限代码对照表

| 旧格式 | 新格式 (RBAC v2) | 说明 |
|--------|------------------|------|
| `project.detail.read` | `enterprise.project.read` | 查看项目详情 |
| `project.list.read` | `enterprise.project.read` | 查看项目列表 |
| `project.create` | `enterprise.project.create` | 创建项目 |
| `project:read` | `enterprise.project.read` | 读取项目 |
| `task.detail.read` | `enterprise.task.read` | 查看任务详情 |
| `task.list.read` | `enterprise.task.read` | 查看任务列表 |
| `task:read` | `enterprise.task.read` | 读取任务 |

---

**修复状态**: ✅ 已完成
**需要用户操作**: 重新登录
**预计生效时间**: 立即（登录后）
