# 企业管理路由对比表

**快速参考指南**

---

## 路由系统总览

```
AI Project Backend - 企业管理路由架构
│
├── 🚫 旧版企业路由 (已禁用)
│   └── /api/v1/enterprises/:id/*
│
├── ✅ RBAC v2企业路由 (当前使用)
│   └── /api/v1/enterprises/:enterprise_id/*
│
└── ✅ 组织管理路由 (独立模块)
    └── /api/v1/organization/*
```

---

## 详细对比表

### 基础信息

| 项目 | 旧版路由 | RBAC v2路由 | 组织路由 |
|------|---------|------------|---------|
| **文件** | enterprise_routes.go | enterprise_routes_v2.go | organization_routes.go |
| **状态** | ❌ 已禁用 | ✅ 使用中 | ✅ 使用中 |
| **路径前缀** | /enterprises | /enterprises/:enterprise_id | /organization |
| **参数风格** | :id | :enterprise_id | :id |
| **注册位置** | setup.go:113 (注释) | setup.go:208 | setup.go:119 |
| **代码行数** | 47行 | 376行 | 29行 |

### 功能覆盖

| 功能模块 | 旧版路由 | RBAC v2路由 | 组织路由 |
|---------|---------|------------|---------|
| **企业CRUD** | ✅ 完整 | ❌ 无 | ❌ 无 |
| **用户管理** | ✅ 完整 | ✅ 完整 + 角色 | ✅ 员工查询 |
| **部门管理** | ✅ 完整 | ✅ 统计 | ✅ 完整CRUD |
| **项目管理** | ✅ 列表+创建 | ✅ 完整 | ❌ 无 |
| **权限管理** | ✅ 基础 | ✅ RBAC v2 | ❌ 无 |
| **角色管理** | ❌ 无 | ✅ 完整 | ❌ 无 |
| **文档管理** | ❌ 无 | ✅ 完整 | ❌ 无 |
| **任务管理** | ❌ 无 | ✅ 完整 | ❌ 无 |

### 安全特性

| 安全特性 | 旧版路由 | RBAC v2路由 | 组织路由 |
|---------|---------|------------|---------|
| **JWT认证** | ✅ | ✅ | ✅ |
| **企业隔离** | ❌ | ✅ | ⚠️ 基于上下文 |
| **权限检查** | ⚠️ 基础 | ✅ 细粒度 | ⚠️ 基础 |
| **中间件层** | ⚠️ 简单 | ✅ 多层 | ⚠️ 简单 |
| **审计日志** | ❌ | ✅ | ❌ |

---

## API端点详细对比

### 用户管理API

| 功能 | 旧版路由 | RBAC v2路由 | 组织路由 |
|------|---------|------------|---------|
| **列表** | `GET /enterprises/:id/users` | `GET /enterprises/:enterprise_id/users` | `GET /organization/employees` |
| **创建** | `POST /enterprises/:id/users` | `POST /enterprises/:enterprise_id/users` | ❌ |
| **详情** | `GET /enterprises/:id/users/:userId` | `GET /enterprises/:enterprise_id/users/:user_id` | ❌ |
| **更新** | `PUT /enterprises/:id/users/:userId` | ❌ | ❌ |
| **删除** | ❌ | `DELETE /enterprises/:enterprise_id/users/:user_id` | ❌ |
| **未分配** | `GET /enterprises/:id/users/unassigned` | `GET /enterprises/:enterprise_id/users/unassigned` | ❌ |
| **更新部门** | `PUT /enterprises/:id/users/:userId/department` | `PUT /enterprises/:enterprise_id/users/:user_id/department` | ❌ |
| **更新角色** | ❌ | `PUT /enterprises/:enterprise_id/users/:user_id/roles` | ❌ |

### 部门管理API

| 功能 | 旧版路由 | RBAC v2路由 | 组织路由 |
|------|---------|------------|---------|
| **列表** | `GET /enterprises/:id/departments` | ❌ | `GET /organization/departments` |
| **创建** | `POST /enterprises/:id/departments` | ❌ | `POST /organization/departments` |
| **详情** | ❌ | ❌ | `GET /organization/departments/:id` |
| **更新** | `PUT /enterprises/:id/departments/:dept_id` | ❌ | `PUT /organization/departments/:id` |
| **删除** | `DELETE /enterprises/:id/departments/:dept_id` | ❌ | `DELETE /organization/departments/:id` |
| **统计** | `GET /enterprises/:id/departments/stats` | `GET /enterprises/:enterprise_id/departments/stats` | `GET /organization/stats` |
| **员工** | ❌ | ❌ | `GET /organization/departments/:id/employees` |

### 项目管理API

| 功能 | 旧版路由 | RBAC v2路由 | 组织路由 |
|------|---------|------------|---------|
| **列表** | `GET /enterprises/:id/projects` | `GET /enterprises/:enterprise_id/projects` | ❌ |
| **创建** | `POST /enterprises/:id/projects` | `POST /enterprises/:enterprise_id/projects` | ❌ |
| **任务** | ❌ | `GET/POST /enterprises/:enterprise_id/projects/:project_id/tasks` | ❌ |

### 权限管理API (仅RBAC v2)

| 功能 | RBAC v2路由 |
|------|-----------|
| **角色列表** | `GET /enterprises/:enterprise_id/roles` |
| **创建角色** | `POST /enterprises/:enterprise_id/roles` |
| **角色详情** | `GET /enterprises/:enterprise_id/roles/:role_id` |
| **更新角色** | `PUT /enterprises/:enterprise_id/roles/:role_id` |
| **删除角色** | `DELETE /enterprises/:enterprise_id/roles/:role_id` |
| **分配权限** | `POST /enterprises/:enterprise_id/roles/:role_id/permissions` |
| **权限列表** | `GET /enterprises/:enterprise_id/permissions` |

---

## 权限标识对比

### RBAC v2权限标识 (enterprise_routes_v2.go)

```javascript
// 用户管理
"enterprise.user.list"           // 查看用户列表
"enterprise.user.create"         // 邀请用户
"enterprise.user.read"           // 查看用户详情
"enterprise.user.update"         // 更新用户信息
"enterprise.user.delete"         // 移除用户
"enterprise.user.manage_roles"   // 管理用户角色

// 角色管理
"enterprise.role.list"           // 查看角色列表
"enterprise.role.create"         // 创建角色
"enterprise.role.read"           // 查看角色详情
"enterprise.role.update"         // 更新角色
"enterprise.role.delete"         // 删除角色
"enterprise.role.manage_permissions"  // 管理角色权限

// 权限管理
"enterprise.permission.list"     // 查看权限列表

// 部门管理
"enterprise.department.read"     // 查看部门信息

// 项目管理
"enterprise.project.list"        // 查看项目列表
"enterprise.project.create"      // 创建项目

// 任务管理
"enterprise.task.list"           // 查看任务列表
"enterprise.task.create"         // 创建任务

// 文档管理
"enterprise.document.list"       // 查看文档列表
"enterprise.document.create"     // 创建文档
"enterprise.document.read"       // 查看文档详情
"enterprise.document.update"     // 更新文档
"enterprise.document.delete"     // 删除文档
```

---

## 中间件链对比

### 旧版路由中间件链

```
Request
  ↓
JWT认证 (AuthMiddleware)
  ↓
基础权限检查
  ↓
Handler
```

### RBAC v2路由中间件链

```
Request
  ↓
JWT认证 (AuthMiddleware)
  ↓
企业隔离检查 (EnforceEnterpriseIsolation)
  ↓
细粒度权限检查 (RequireEnterprisePermission)
  ↓
参数适配 (adaptEnterpriseContext)
  ↓
Handler
```

### 组织路由中间件链

```
Request
  ↓
JWT认证 (AuthMiddleware)
  ↓
用户上下文检查
  ↓
Handler
```

---

## 迁移指南

### 前端API调用迁移

#### 用户列表查询

**旧版** (已废弃):
```javascript
// ❌ 不再使用
GET /api/v1/enterprises/3/users
```

**RBAC v2** (推荐):
```javascript
// ✅ 使用新路由
GET /api/v1/enterprises/3/users

// 请求头需要包含JWT
headers: {
  'Authorization': 'Bearer <jwt_token>'
}

// 响应格式
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {...}
  }
}
```

#### 部门统计查询

**旧版** (已废弃):
```javascript
// ❌ 不再使用
GET /api/v1/enterprises/3/departments/stats
```

**RBAC v2** (推荐):
```javascript
// ✅ 使用新路由
GET /api/v1/enterprises/3/departments/stats

// 响应包含实际人数统计
{
  "success": true,
  "data": {
    "total_departments": 5,
    "departments": [
      {
        "id": 1,
        "name": "研发部",
        "member_count": 15
      }
    ]
  }
}
```

#### 组织视角查询

**组织路由** (员工视角):
```javascript
// ✅ 适用于员工查看自己所在组织
GET /api/v1/organization/departments

// 自动基于当前用户的企业上下文
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "研发部",
      "manager": "张三"
    }
  ]
}
```

---

## 测试覆盖建议

### 需要测试的场景

#### RBAC v2路由

- [ ] 企业隔离检查 - 用户A不能访问企业B的数据
- [ ] 权限检查 - 无权限用户被正确拦截
- [ ] 参数适配 - enterprise_id正确传递给handler
- [ ] 角色管理 - 完整的CRUD操作
- [ ] 权限分配 - 为角色分配/移除权限
- [ ] 用户角色更新 - 更新用户角色生效

#### 组织路由

- [ ] 用户上下文 - 只能看到自己企业的数据
- [ ] 部门CRUD - 完整的增删改查
- [ ] 员工查询 - 部门员工列表正确

---

## 性能考虑

### 中间件性能开销

| 中间件 | 平均耗时 | 优化建议 |
|--------|---------|---------|
| JWT认证 | ~5ms | ✅ 已优化 |
| 企业隔离检查 | ~10ms | ⚠️ 可添加缓存 |
| 权限检查 | ~15ms | ⚠️ 可添加Redis缓存 |
| 参数适配 | ~1ms | ✅ 已优化 |

### 优化建议

1. **添加权限缓存**
   ```go
   // 缓存用户-企业-权限映射，TTL 5分钟
   key := fmt.Sprintf("user:%d:enterprise:%d:perms", userID, enterpriseID)
   ```

2. **批量权限检查**
   ```go
   // 一次查询获取用户的所有权限
   permissions := cache.GetUserPermissions(userID, enterpriseID)
   ```

3. **企业隔离缓存**
   ```go
   // 缓存用户-企业关联关系
   key := fmt.Sprintf("user:%d:enterprises", userID)
   ```

---

## 总结

### 关键要点

1. ✅ **旧版路由已安全禁用** - 无需担心路由冲突
2. ✅ **RBAC v2是主力** - 功能完整，安全性强
3. ✅ **组织路由是补充** - 提供员工视角的便捷接口
4. ⚠️ **需要前端迁移** - 逐步迁移到v2路由
5. ⚠️ **性能可优化** - 添加缓存层提升性能

### 下一步行动

1. **立即**: 更新Swagger文档
2. **本周**: 编写v2路由集成测试
3. **本月**: 前端API迁移
4. **下季度**: 移除旧代码，整合组织路由

---

**文档版本**: 1.0
**最后更新**: 2025-11-02
**维护者**: Backend Team
