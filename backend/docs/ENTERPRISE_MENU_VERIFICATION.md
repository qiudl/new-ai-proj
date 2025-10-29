# 企业管理员菜单显示验证报告

**验证时间**: 2025-10-29
**目标用户**: huangcong 及其他企业管理员用户
**状态**: ✅ 后端已修复，需用户重新登录验证

---

## 问题分析

### 用户报告问题

"左侧菜单貌似不是企业管理员的"

### 根本原因

**双权限系统导致的不一致**:

1. **RBAC v2（新）**: huangcong已分配`enterprise_admin`角色 (18个企业权限)
2. **旧系统（前端使用）**: JWT token中的`role`字段来自旧的`company_roles`表
3. **前端判断**: 前端菜单可见性基于JWT中的`role`和`user_type`字段

---

## JWT Token 结构

### Token Claims

```go
type JWTClaims struct {
    UserID           int    `json:"user_id"`
    Username         string `json:"username"`
    Role             string `json:"role"`              // 旧系统角色（company_admin, company_user等）
    UserType         string `json:"user_type"`         // "system" 或 "enterprise"
    EnterpriseUserID *int   `json:"enterprise_user_id,omitempty"`
    EnterpriseID     *int   `json:"enterprise_id,omitempty"`
    jwt.RegisteredClaims
}
```

**关键字段说明**:
- `role`: 来自`company_roles.role_code`（旧系统）
- `user_type`: 来自`users.user_type`（"system" | "enterprise"）

---

## 前端菜单配置

### 企业管理员应看到的菜单

根据 `frontend/src/config/menuVisibility.ts` 配置：

#### 通用菜单（user_type: BOTH）
✅ 工作台
- 工作概览 (`/`)
- 时间周报 (`/time-weekly-report`)
- 任务周报 (`/task-dashboard`)

✅ 计时系统
- 个人计时 (`/personal-timer`)
- 计时数据分析 (`/timer-analytics`)

✅ 项目客户管理
- 项目列表 (`/projects`)
- 任务列表 (`/tasks`)

✅ 文档管理
- 工作笔记 (`/work-note`)
- 任务文档 (`/task-documents`)

#### 企业管理员专有菜单（role: company_admin）

✅ 企业组织管理 (`user_type: COMPANY_USER, role: company_admin`)
- 组织架构管理 (`/organization-structure`)
- 岗位管理 (`/position-management`)
- 企业角色管理 (`/enterprise-roles`)
- 企业用户管理 (`/enterprise-users`)

✅ 系统管理（部分权限）
- 用户管理 (`/user-management`) - 需要`company_admin`角色
- 审计日志 (`/audit-logs`) - 需要`company_admin`角色
- API Key管理 (`/api-keys`) - 需要`company_admin`角色

---

## 当前修复状态

### 已完成修复（2025-10-29）

#### 1. RBAC v2 角色分配 ✅

```sql
-- huangcong 在 RBAC v2 系统中
SELECT eu.user_id, eu.username, er.code, er.name
FROM enterprise_users eu
JOIN enterprise_roles er ON eu.role_id = er.id
WHERE eu.user_id = 115;

-- 结果:
-- user_id: 115
-- username: huangcong
-- code: enterprise_admin
-- name: 企业管理员
-- 权限数: 18个
```

#### 2. 旧系统角色更新 ✅

```sql
-- huangcong 在旧系统中
SELECT u.id, u.username, cr.role_code, cr.role_name
FROM users u
JOIN enterprise_user_roles eur ON u.id = eur.user_id
JOIN company_roles cr ON eur.role_id = cr.id
WHERE u.id = 115;

-- 结果:
-- id: 115
-- username: huangcong
-- role_code: company_admin
-- role_name: 企业管理员
-- 权限数: 29个
```

#### 3. company_admin 角色权限补充 ✅

```sql
-- company_admin 角色现拥有的权限
SELECT COUNT(*) FROM role_permissions WHERE role_id = 1;
-- 结果: 29个权限

-- 关键新增权限:
-- ✅ project.read
-- ✅ project:read
-- ✅ task.read
-- ✅ task:read
-- ✅ project.detail.read
-- ✅ project.list.read
-- ✅ task.detail.read
-- ✅ task.list.read
```

---

## 验证步骤

### 步骤1: 用户必须重新登录 ⚠️

**重要**: huangcong 必须完全退出系统并重新登录才能获得新的JWT token

**原因**:
- JWT token在登录时生成，包含角色信息
- 数据库中的角色已更新为`company_admin`
- 但旧的JWT token仍包含旧的角色信息（可能是`system_support`）
- 只有重新登录才能生成包含新角色的JWT token

**操作方法**:
```
1. 点击右上角用户头像
2. 选择"退出登录"
3. 清除浏览器缓存（推荐）或使用无痕模式
4. 重新登录
```

### 步骤2: 验证JWT Token内容

重新登录后，在浏览器开发者工具中检查JWT token：

```javascript
// 在浏览器Console中执行
const token = localStorage.getItem('auth_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User Type:', payload.user_type);  // 应为 "enterprise"
console.log('Role:', payload.role);            // 应为 "company_admin"
console.log('Enterprise ID:', payload.enterprise_id);  // 应为 17
```

**预期结果**:
```json
{
  "user_id": 115,
  "username": "huangcong",
  "role": "company_admin",          // ✅ 关键字段
  "user_type": "enterprise",        // ✅ 关键字段
  "enterprise_user_id": 115,
  "enterprise_id": 17,
  "exp": 1234567890,
  "iat": 1234567890,
  "nbf": 1234567890,
  "sub": "huangcong"
}
```

### 步骤3: 检查左侧菜单显示

重新登录后，验证以下菜单项是否正确显示：

#### 应该显示的菜单（company_admin）

| 菜单组 | 菜单项 | 检查 |
|--------|--------|------|
| 工作台 | 工作概览 | ✅ |
| 工作台 | 时间周报 | ✅ |
| 工作台 | 任务周报 | ✅ |
| 计时系统 | 个人计时 | ✅ |
| 计时系统 | 计时数据分析 | ✅ |
| 项目客户管理 | 项目列表 | ✅ |
| 项目客户管理 | 任务列表 | ✅ |
| 文档管理 | 工作笔记 | ✅ |
| 文档管理 | 任务文档 | ✅ |
| **企业组织管理** | **组织架构管理** | ✅ |
| **企业组织管理** | **岗位管理** | ✅ |
| **企业组织管理** | **企业角色管理** | ✅ |
| **企业组织管理** | **企业用户管理** | ✅ |
| 系统管理 | 用户管理 | ✅ |
| 系统管理 | 审计日志 | ✅ |
| 系统管理 | API Keys | ✅ |

#### 不应该显示的菜单（仅system用户）

| 菜单项 | 说明 |
|--------|------|
| 企业管理 (`/enterprises`) | 仅系统用户 |
| 权限管理 (`/permissions`) | 仅admin |
| 角色管理 (`/role-management`) | 仅admin |
| AI配置 (`/ai-config`) | 仅admin |
| 导航管理 | 仅admin |

### 步骤4: 功能访问测试

测试关键功能是否可以正常访问：

```
1. 访问项目列表 (/projects)
   - 预期: ✅ 200 正常显示

2. 访问任务列表 (/tasks)
   - 预期: ✅ 200 正常显示

3. 访问企业用户管理 (/enterprise-users)
   - 预期: ✅ 200 正常显示

4. 访问组织架构管理 (/organization-structure)
   - 预期: ✅ 200 正常显示
```

---

## 故障排查

### 如果菜单仍显示不正确

#### 检查项1: JWT Token角色

```javascript
// 浏览器Console
const token = localStorage.getItem('auth_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Role:', payload.role);  // 必须是 "company_admin"
```

**如果role不是company_admin**:
1. 确认已完全退出登录
2. 清除浏览器所有cookie和LocalStorage
3. 使用无痕模式重新登录
4. 联系系统管理员检查数据库中的角色配置

#### 检查项2: 前端权限检查逻辑

检查浏览器Console是否有权限相关的错误信息：
```
❌ Permission denied: ...
❌ Access forbidden: ...
❌ Role mismatch: ...
```

#### 检查项3: API权限验证

打开浏览器Network标签，检查API请求是否返回403：
```
GET /api/v1/projects -> 403 Forbidden
```

**如果出现403**:
- 检查后端权限中间件配置
- 验证company_admin角色是否有对应的API权限
- 检查`role_permissions`表中的权限分配

---

## 其他受影响用户

以下用户也已修复，同样需要重新登录：

| 用户 | enterprise_id | 企业名称 | 状态 |
|------|---------------|----------|------|
| huangcong | 17 | 深圳酷采信息技术有限公司 | ✅ 已修复 |
| chenc | 8 | 温州金曼荣 | ✅ 已修复 |
| akang | 7 | 北京欢乐宿供应链科技有限公司 | ✅ 已修复 |
| litingting | 3 | 李宁集团 | ✅ 已修复 |
| jintan | 8 | 温州金曼荣 | ✅ 已修复 |
| sudm | 16 | 广西酒店集团 | ✅ 已修复 |

**所有这些用户都需要重新登录以获得新的JWT token和正确的菜单显示。**

---

## 技术债务和长期解决方案

### 当前问题

1. **双权限系统**: RBAC v2 (enterprise_roles) 和旧系统 (company_roles) 同时存在
2. **前端依赖旧系统**: JWT token和菜单判断都使用旧系统的role字段
3. **同步维护成本**: 需要同时更新两个系统的角色和权限

### 长期解决方案

#### 阶段1: 前端迁移（本月）

1. **更新JWT Claims**: 添加RBAC v2的角色信息
```go
type JWTClaims struct {
    UserID           int    `json:"user_id"`
    Username         string `json:"username"`
    Role             string `json:"role"`              // 旧系统（保留向后兼容）
    RoleV2           string `json:"role_v2"`           // RBAC v2角色代码
    UserType         string `json:"user_type"`
    EnterpriseUserID *int   `json:"enterprise_user_id,omitempty"`
    EnterpriseID     *int   `json:"enterprise_id,omitempty"`
    jwt.RegisteredClaims
}
```

2. **前端菜单逻辑更新**: 优先使用`role_v2`字段判断权限

3. **权限检查迁移**: 逐步将前端权限检查从旧系统迁移到RBAC v2

#### 阶段2: 统一权限系统（本季度）

1. 弃用旧的`company_roles`和`role_permissions`表
2. 所有权限检查统一使用RBAC v2
3. 前端完全移除对旧role字段的依赖

---

## 相关文档

- **RBAC v2最终状态报告**: `RBAC_V2_FINAL_STATUS.md`
- **huangcong权限修复报告**: `HUANGCONG_PERMISSION_FIX_REPORT.md`
- **自动角色分配实现**: `AUTO_ROLE_ASSIGNMENT_IMPLEMENTATION.md`

---

## 总结

### 当前状态

- ✅ 后端权限配置已完成
- ✅ RBAC v2角色已分配
- ✅ 旧系统角色已更新
- ⏸️ **需要用户重新登录以生效**

### 验证清单

- [ ] huangcong 重新登录
- [ ] 验证JWT token中role为"company_admin"
- [ ] 检查左侧菜单显示企业组织管理菜单组
- [ ] 测试项目和任务列表访问正常
- [ ] 测试企业用户管理功能正常

### 预期结果

重新登录后，huangcong及其他已修复用户应该能够：
- ✅ 看到完整的企业管理员菜单
- ✅ 访问项目和任务功能（无403错误）
- ✅ 使用企业组织管理功能
- ✅ 管理企业用户和角色

---

**验证状态**: ⏸️ 等待用户重新登录
**预计生效时间**: 立即（重新登录后）
**风险等级**: 低（仅需用户操作，无系统风险）

**重要提示**: 请通知所有已修复的用户（6位）重新登录，以获得正确的权限和菜单显示。
