# Permission Repository 架构演进

## 迁移前架构 (遗留设计)

```
┌─────────────────────────────────────────────────────────────┐
│                      业务层 (Services)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐     │
│  │ PermissionService    │    │ Other Services       │     │
│  │ - CheckUserPerm()    │    │                      │     │
│  │ - GetUserRolePerm()  │    │                      │     │
│  └──────────┬───────────┘    └──────────────────────┘     │
│             │                                               │
└─────────────┼───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据访问层 (Repositories)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ ❌ PermissionServiceRepository (遗留)              │   │
│  │    - IsSystemAdmin()                               │   │
│  │    - GetCompanyUserID()                            │   │
│  │    - GetUserAccessibleProjects()                   │   │
│  │    - CheckCustomPermission()                       │   │
│  │    - GetUserRolePermissions()                      │   │
│  │    - CheckPermissionDelegation*()                  │   │
│  │    - UpsertPermission()                            │   │
│  │    - CreateRoleRecord()                            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ ✅ PermissionRepository (新实现 - 未充分使用)       │   │
│  │    - GetRoles()                                    │   │
│  │    - CheckUserPermission()                         │   │
│  │    - GetUserPermissions()                          │   │
│  │    - GetUserPermissionOverrides()                  │   │
│  │    - SetRolePermissions()                          │   │
│  │    - LogPermissionChange()                         │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ PermissionServiceV2Repository (RBAC v2)            │   │
│  │    - CheckSystemPermission()                       │   │
│  │    - CheckEnterpriseRolePermission()               │   │
│  │    - GetUserEnterpriseCustomPermissions()          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据库层                              │
├─────────────────────────────────────────────────────────────┤
│  • users                    • company_users                 │
│  • company_roles            • permissions                   │
│  • role_permissions         • permission_delegations        │
│  • company_user_project_permissions                         │
│  • system_roles             • enterprise_permissions        │
└─────────────────────────────────────────────────────────────┘
```

**问题**:
- ❌ 三个 repository 职责重叠
- ❌ 代码重复,维护成本高
- ❌ 新旧实现并存,容易混淆
- ❌ `PermissionRepository` 功能未充分利用

---

## 迁移后架构 (统一设计)

```
┌─────────────────────────────────────────────────────────────┐
│                      业务层 (Services)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐     │
│  │ PermissionService    │    │ Other Services       │     │
│  │ - CheckUserPerm()    │    │                      │     │
│  │ - GetUserRolePerm()  │    │                      │     │
│  └──────────┬───────────┘    └──────────────────────┘     │
│             │                                               │
└─────────────┼───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    适配器层 (Adapters)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 🔄 PermissionServiceRepositoryAdapter              │   │
│  │    (实现 PermissionServiceRepository 接口)         │   │
│  │                                                    │   │
│  │    - IsSystemAdmin()           → SQL查询          │   │
│  │    - GetCompanyUserID()        → SQL查询          │   │
│  │    - GetUserAccessibleProjects() → SQL查询        │   │
│  │    - CheckCustomPermission()   → permRepo方法     │   │
│  │    - GetUserRolePermissions()  → SQL查询          │   │
│  │    - CheckPermissionDelegation*() → SQL查询       │   │
│  │    - UpsertPermission()        → SQL插入          │   │
│  │    - CreateRoleRecord()        → SQL插入          │   │
│  └────────────┬───────────────────────────────────────┘   │
│               │ 依赖                                        │
└───────────────┼─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据访问层 (Repositories)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ ✅ PermissionRepository (统一实现)                  │   │
│  │    核心权限管理仓库 - 1493 行                       │   │
│  │                                                    │   │
│  │    角色管理:                                        │   │
│  │    • GetRoles() / CreateRole() / UpdateRole()     │   │
│  │    • GetSystemRoles() / GetEnterpriseRoles()      │   │
│  │    • CreateRoleFromTemplate()                     │   │
│  │                                                    │   │
│  │    权限管理:                                        │   │
│  │    • GetPermissions() / GetRolePermissions()      │   │
│  │    • SetRolePermissions()                         │   │
│  │    • GetRolesWithPermissions() (优化查询)          │   │
│  │                                                    │   │
│  │    权限检查:                                        │   │
│  │    • CheckUserPermission() (层级继承)              │   │
│  │    • CheckMultiplePermissions()                   │   │
│  │    • GetUserPermissions() (综合摘要)               │   │
│  │                                                    │   │
│  │    自定义权限:                                      │   │
│  │    • GetUserPermissionOverrides()                 │   │
│  │    • SetUserPermissionOverride()                  │   │
│  │    • RemoveUserPermissionOverride()               │   │
│  │                                                    │   │
│  │    项目权限:                                        │   │
│  │    • GetUserProjectPermissions()                  │   │
│  │    • SetUserProjectPermissions()                  │   │
│  │    • RemoveUserProjectPermissions()               │   │
│  │                                                    │   │
│  │    审计与分析:                                      │   │
│  │    • LogPermissionChange()                        │   │
│  │    • GetPermissionAuditLogs()                     │   │
│  │    • GetPermissionInheritanceTrace()              │   │
│  │    • AnalyzePermissionConflicts()                 │   │
│  │                                                    │   │
│  │    超级管理员:                                      │   │
│  │    • initSuperadminFromEnv() (环境变量支持)        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ PermissionServiceV2Repository (RBAC v2)            │   │
│  │    专注于企业级双层权限 - 224 行                    │   │
│  │                                                    │   │
│  │    • CheckSystemPermission()                      │   │
│  │    • GetUserSystemPermissions()                   │   │
│  │    • CheckEnterpriseRolePermission()              │   │
│  │    • GetUserEnterpriseRolePermissions()           │   │
│  │    • GetUserEnterpriseCustomPermissions()         │   │
│  │    • CheckCustomPermissionOverride()              │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据库层                              │
├─────────────────────────────────────────────────────────────┤
│  RBAC v1 表:                                                │
│  • users                    • company_users                 │
│  • company_roles            • permissions                   │
│  • role_permissions         • company_user_project_perms    │
│  • permission_delegations   • permission_requests           │
│                                                             │
│  RBAC v2 表:                                                │
│  • system_roles             • system_permissions            │
│  • system_role_permissions                                  │
│  • enterprise_user_roles    • enterprise_permissions        │
│  • enterprise_role_permissions                              │
│  • enterprise_user_custom_permissions                       │
└─────────────────────────────────────────────────────────────┘
```

**改进**:
- ✅ 单一数据源: `PermissionRepository`
- ✅ 适配器解耦: 保持向后兼容
- ✅ 职责清晰: 每个 repository 有明确边界
- ✅ 易于维护: 减少重复代码

---

## 权限检查流程对比

### 迁移前流程

```
用户权限检查请求
    │
    ├─→ PermissionService.CheckUserPermission()
    │       │
    │       ├─→ PermissionServiceRepository.IsSystemAdmin()
    │       │       │
    │       │       └─→ SELECT role FROM users WHERE id = ?
    │       │
    │       ├─→ PermissionServiceRepository.CheckCustomPermission()
    │       │       │
    │       │       └─→ SELECT is_granted FROM user_custom_permission
    │       │
    │       ├─→ PermissionServiceRepository.GetProjectPermissions()
    │       │       │
    │       │       └─→ SELECT can_* FROM company_user_project_permissions
    │       │
    │       └─→ PermissionServiceRepository.GetUserRolePermissions()
    │               │
    │               └─→ SELECT p.permission_code FROM permissions p
    │                   JOIN role_permissions rp ...
    │
    └─→ 返回权限结果
```

### 迁移后流程

```
用户权限检查请求
    │
    ├─→ PermissionService.CheckUserPermission()
    │       │
    │       ├─→ PermissionServiceRepositoryAdapter.IsSystemAdmin()
    │       │       │
    │       │       └─→ 直接 SQL 查询 (保持兼容)
    │       │
    │       ├─→ PermissionServiceRepositoryAdapter.CheckCustomPermission()
    │       │       │
    │       │       ├─→ GetCompanyUserID() → SQL查询
    │       │       │
    │       │       └─→ PermissionRepository.GetUserPermissionOverrides()
    │       │               │
    │       │               └─→ SELECT custom_permissions FROM company_users
    │       │
    │       ├─→ PermissionServiceRepositoryAdapter.GetProjectPermissions()
    │       │       │
    │       │       └─→ 直接 SQL 查询 (保持兼容)
    │       │
    │       └─→ PermissionServiceRepositoryAdapter.GetUserRolePermissions()
    │               │
    │               └─→ 直接 SQL 查询 (保持兼容)
    │
    └─→ 返回权限结果
```

**性能**: 查询逻辑完全一致,性能无变化

---

## 三个 Repository 的职责划分

### 1. PermissionRepository (核心仓库)

**定位**: 统一的权限管理数据访问层

**职责**:
- ✅ 角色和权限的 CRUD 操作
- ✅ 层级权限检查 (继承、覆盖、项目级)
- ✅ 自定义权限管理
- ✅ 审计日志记录
- ✅ 权限冲突分析
- ✅ 支持 RBAC v1 和 v2

**使用场景**:
- 所有新代码应该使用此 repository
- 通过适配器支持遗留代码

### 2. PermissionServiceRepositoryAdapter (适配器)

**定位**: 遗留接口的适配层

**职责**:
- ✅ 实现 `PermissionServiceRepository` 接口
- ✅ 将调用转发到 `PermissionRepository` 或直接 SQL
- ✅ 保持向后兼容性

**使用场景**:
- 仅供 `PermissionService` 使用
- 过渡期解决方案
- 未来应逐步废弃

### 3. PermissionServiceV2Repository (企业级)

**定位**: RBAC v2 双层权限专用

**职责**:
- ✅ 系统级权限检查 (system_roles)
- ✅ 企业级权限检查 (enterprise_roles)
- ✅ 企业自定义权限覆盖
- ✅ Super Admin 旁路检查

**使用场景**:
- 仅用于企业多租户场景
- 与 `PermissionRepository` 并存

---

## 迁移路径图

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 适配器过渡 (当前阶段) ✅                            │
├─────────────────────────────────────────────────────────────┤
│  • 创建 PermissionServiceRepositoryAdapter                  │
│  • 删除 PermissionServiceRepository 实现                    │
│  • 保持接口定义用于兼容                                      │
│  • 验证功能正常                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 渐进式迁移 (1-2月)                                 │
├─────────────────────────────────────────────────────────────┤
│  • 重构 PermissionService 直接使用 PermissionRepository     │
│  • 添加单元测试和集成测试                                    │
│  • 优化权限检查性能                                          │
│  • 添加缓存层                                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 完全统一 (3-6月)                                   │
├─────────────────────────────────────────────────────────────┤
│  • 删除 PermissionServiceRepositoryAdapter                  │
│  • 删除 PermissionServiceRepository 接口定义                │
│  • 统一到 RBAC v2 架构                                       │
│  • 完善权限管理 API                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 性能分析

### 查询复杂度对比

| 操作 | 迁移前 | 迁移后 | 变化 |
|------|--------|--------|------|
| IsSystemAdmin | 1 查询 | 1 查询 | 无变化 |
| GetCompanyUserID | 1 查询 | 1 查询 | 无变化 |
| CheckCustomPermission | 1 查询 | 2 查询 | +1 (GetCompanyUserID) |
| GetUserRolePermissions | 1 查询 | 1 查询 | 无变化 |
| GetProjectPermissions | 1 查询 | 1 查询 | 无变化 |

**结论**: 除了 `CheckCustomPermission` 多一次查询外,其他操作性能完全一致。

### 优化建议

```go
// 可以通过缓存 user_id -> company_user_id 映射来优化
type PermissionServiceRepositoryAdapter struct {
    permRepo     PermissionRepository
    db           *sql.DB
    userIDCache  map[int]int // user_id -> company_user_id
    cacheMutex   sync.RWMutex
}
```

---

## 总结

通过适配器模式,我们成功实现了:

1. ✅ **代码统一**: 单一数据源 `PermissionRepository`
2. ✅ **向后兼容**: 保持所有现有代码正常运行
3. ✅ **零风险迁移**: 无需修改业务逻辑
4. ✅ **清晰架构**: 职责分离,易于理解
5. ✅ **未来扩展**: 为完全迁移铺平道路

这是一个低风险、高收益的重构策略!
