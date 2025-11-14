# Permission Repositories 使用指南

## 快速参考

| Repository | 文件 | 状态 | 用途 | 何时使用 |
|-----------|------|------|------|---------|
| **PermissionRepository** | permission_repository.go | ✅ 推荐 | 统一权限管理 | 所有新代码 |
| **PermissionServiceRepositoryAdapter** | permission_service_repository_adapter.go | ⚠️ 过渡 | 遗留兼容层 | 自动使用 |
| **PermissionServiceV2Repository** | permission_service_v2_repository.go | ✅ 专用 | 企业双层权限 | 企业级功能 |
| ~~PermissionServiceRepository~~ | ~~permission_service_repository.go~~ | ❌ 已删除 | 遗留实现 | 不再使用 |

---

## 1. PermissionRepository ⭐ (推荐使用)

### 文件信息

- **路径**: `backend/database/permission_repository.go`
- **代码量**: 1493 行
- **状态**: ✅ **主要使用,推荐新代码使用**
- **创建时间**: RBAC v2 系统引入时

### 功能概览

最全面的权限管理 repository,支持 RBAC v1 和 v2 双版本。

#### 角色管理

```go
// 基础角色 CRUD
GetRoles(ctx context.Context, companyID *int) ([]*models.CompanyRole, error)
GetRoleByID(ctx context.Context, roleID int) (*models.CompanyRole, error)
GetRoleByCode(ctx context.Context, roleCode string) (*models.CompanyRole, error)
CreateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error)
UpdateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error)
DeleteRole(ctx context.Context, roleID int) error

// RBAC v2: 双层角色管理
GetSystemRoles(ctx context.Context) ([]*models.CompanyRole, error)
GetEnterpriseRoles(ctx context.Context, enterpriseID int) ([]*models.CompanyRole, error)
GetEnterpriseRoleByCode(ctx context.Context, roleCode string, enterpriseID int) (*models.CompanyRole, error)
CreateRoleFromTemplate(ctx context.Context, templateRoleCode string, enterpriseID int, customName *string) (*models.CompanyRole, error)
```

#### 权限管理

```go
// 权限定义
GetPermissions(ctx context.Context) ([]*models.Permission, error)
GetPermissionsByModule(ctx context.Context, module string) ([]*models.Permission, error)

// 角色权限关联
GetRolePermissions(ctx context.Context, roleID int) ([]*models.Permission, error)
GetRolesWithPermissions(ctx context.Context, companyID *int) ([]*models.CompanyRole, map[int][]*models.Permission, error)
GetRolePermissionIDs(ctx context.Context, roleID int) ([]int, error)
SetRolePermissions(ctx context.Context, roleID int, permissionIDs []int) error
```

#### 权限检查 (核心功能)

```go
// 层级权限检查 (支持继承和覆盖)
CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error)

// 批量检查
CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error)

// 获取用户权限摘要
GetUserPermissions(ctx context.Context, companyUserID int) (*models.UserPermissionSummary, error)
```

#### 自定义权限

```go
// 自定义权限覆盖
GetUserPermissionOverrides(ctx context.Context, companyUserID int) (map[string]bool, error)
SetUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string, isGranted bool, reason string) error
RemoveUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string) error
```

#### 项目级权限

```go
GetUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) (*models.CompanyUserProjectPermission, error)
SetUserProjectPermissions(ctx context.Context, permission *models.CompanyUserProjectPermission) error
RemoveUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) error
```

#### 审计与分析

```go
// 审计日志
LogPermissionChange(ctx context.Context, log *models.PermissionAuditLog) error
GetPermissionAuditLogs(ctx context.Context, companyUserID *int, limit, offset int) ([]*models.PermissionAuditLog, int, error)

// 权限追踪
GetPermissionInheritanceTrace(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionInheritanceTrace, error)

// 冲突分析
AnalyzePermissionConflicts(ctx context.Context, companyUserID int) (*models.PermissionAnalysis, error)
```

### 使用示例

```go
// 创建 repository
permRepo := database.NewPermissionRepository(db)

// 检查用户权限
result, err := permRepo.CheckUserPermission(ctx, companyUserID, "project.update", &projectID)
if err != nil {
    return err
}
if result.HasPermission {
    fmt.Printf("权限来源: %s, 原因: %s\n", result.Source, result.Reason)
}

// 获取用户所有权限
summary, err := permRepo.GetUserPermissions(ctx, companyUserID)
if err != nil {
    return err
}
fmt.Printf("用户角色: %s\n", summary.Role.RoleName)
fmt.Printf("自定义权限: %+v\n", summary.CustomPermissions)
fmt.Printf("有效权限: %d 个\n", len(summary.EffectivePermissions))

// 设置自定义权限覆盖
err = permRepo.SetUserPermissionOverride(ctx, companyUserID, "finance.read", true, "临时财务审计需要")

// 分析权限冲突
analysis, err := permRepo.AnalyzePermissionConflicts(ctx, companyUserID)
if len(analysis.Conflicts) > 0 {
    fmt.Printf("发现 %d 个权限冲突\n", len(analysis.Conflicts))
}
```

### 特性

- ✅ **层级权限检查**: 支持自定义覆盖 → 项目权限 → 角色权限的继承链
- ✅ **超级管理员**: 支持通过环境变量配置 super admin
- ✅ **审计完整**: 所有权限变更都有日志记录
- ✅ **性能优化**: `GetRolesWithPermissions()` 解决 N+1 查询问题
- ✅ **冲突检测**: 自动分析权限冲突和冗余
- ✅ **双版本支持**: 同时支持 RBAC v1 和 v2

### 数据库表

- `company_roles` - 角色定义
- `permissions` - 权限定义
- `role_permissions` - 角色权限关联
- `company_users` - 企业用户 (含 custom_permissions JSONB)
- `company_user_project_permissions` - 项目级权限
- `permission_audit_logs` - 权限审计日志

---

## 2. PermissionServiceRepositoryAdapter ⚠️ (过渡层)

### 文件信息

- **路径**: `backend/database/permission_service_repository_adapter.go`
- **代码量**: 380 行
- **状态**: ⚠️ **过渡期使用,未来将废弃**
- **创建时间**: 2025-01-14 (迁移时创建)

### 功能概览

适配器模式实现,将遗留的 `PermissionServiceRepository` 接口桥接到新的 `PermissionRepository`。

#### 适配的方法

```go
// 用户身份
IsSystemAdmin(ctx context.Context, userID int) (bool, error)
GetCompanyUserID(ctx context.Context, userID int) (int, error)

// 项目访问
GetUserAccessibleProjects(ctx context.Context, userID int) ([]int, error)
GetProjectPermissions(ctx context.Context, companyUserID int, projectID int) (*ProjectPermissionData, error)

// 自定义权限
CheckCustomPermission(ctx context.Context, userID int, permissionCode string) (isSet bool, isGranted bool, err error)

// 角色权限
GetUserRolePermissions(ctx context.Context, userID int) (map[string]bool, error)

// 动态权限
CheckPermissionDelegationWithProject(ctx context.Context, userID int, permissionCode string, projectID int) (bool, string, string, error)
CheckPermissionDelegationWithoutProject(ctx context.Context, userID int, permissionCode string) (bool, string, string, error)
CheckTemporaryPermission(ctx context.Context, userID int, permissionCode string) (bool, string, error)

// 管理操作
UpsertPermission(ctx context.Context, code, name, description, module, resource, action string, isActive bool) error
CreateRoleRecord(ctx context.Context, roleCode, roleName, description string) (int, error)
GetPermissionIDByCode(ctx context.Context, permissionCode string) (int, error)
AssignPermissionToRole(ctx context.Context, roleID int, permissionID int) error
UpdateUserRole(ctx context.Context, userID int, roleID int) error
UpsertProjectPermissions(ctx context.Context, companyUserID int, projectID int, permissions *ProjectPermissionData) error
```

### 使用示例

```go
// 自动在 application.go 中使用
permRepo := database.NewPermissionRepository(sqlDB)
permissionServiceRepo := database.NewPermissionServiceRepositoryAdapter(permRepo, sqlDB)

// 传递给遗留的 PermissionService
permissionService := services.NewPermissionService(permissionServiceRepo)
```

### 设计说明

- **透明适配**: `PermissionService` 无需修改即可使用
- **部分转发**: 某些方法直接执行 SQL,某些方法转发到 `PermissionRepository`
- **保持兼容**: 接口签名和行为完全一致
- **过渡方案**: 未来会被直接使用 `PermissionRepository` 取代

### 不要直接使用

❌ 除非你在维护遗留的 `PermissionService`,否则不要直接使用此适配器。

✅ 新代码应该直接使用 `PermissionRepository`。

---

## 3. PermissionServiceV2Repository ✅ (企业专用)

### 文件信息

- **路径**: `backend/database/permission_service_v2_repository.go`
- **代码量**: 224 行
- **状态**: ✅ **活跃使用,专注于 RBAC v2**
- **创建时间**: RBAC v2 企业多租户系统引入时

### 功能概览

专门为 RBAC v2 双层权限体系设计的 repository。

#### 系统级权限

```go
// 检查系统权限 (bypass super_admin)
CheckSystemPermission(ctx context.Context, userID uint, permission string) (bool, error)

// 获取用户所有系统权限
GetUserSystemPermissions(ctx context.Context, userID uint) ([]string, error)
```

#### 企业级权限

```go
// 检查企业角色权限
CheckEnterpriseRolePermission(ctx context.Context, userID uint, enterpriseID uint, permission string) (bool, error)

// 获取用户在企业中的角色权限
GetUserEnterpriseRolePermissions(ctx context.Context, userID uint, enterpriseID uint) ([]string, error)
```

#### 自定义覆盖

```go
// 获取企业级自定义权限 (返回 map[permission_code]grant_type)
GetUserEnterpriseCustomPermissions(ctx context.Context, userID uint, enterpriseID uint) (map[string]string, error)

// 检查自定义权限覆盖
CheckCustomPermissionOverride(ctx context.Context, userID uint, enterpriseID uint, permission string) (bool, bool, error)
```

### 使用示例

```go
// 创建 repository
permV2Repo := database.NewPermissionServiceV2Repository(db)

// 检查系统权限 (会自动检查 super_admin bypass)
hasPermission, err := permV2Repo.CheckSystemPermission(ctx, userID, "system.users.manage")
if err != nil {
    return err
}

// 检查企业权限
hasEnterprisePermission, err := permV2Repo.CheckEnterpriseRolePermission(ctx, userID, enterpriseID, "enterprise.projects.create")

// 获取自定义覆盖
customPerms, err := permV2Repo.GetUserEnterpriseCustomPermissions(ctx, userID, enterpriseID)
for permCode, grantType := range customPerms {
    fmt.Printf("%s: %s\n", permCode, grantType) // "grant" or "deny"
}

// 检查覆盖优先级
hasOverride, isGranted, err := permV2Repo.CheckCustomPermissionOverride(ctx, userID, enterpriseID, "sensitive.data.export")
if hasOverride {
    if isGranted {
        fmt.Println("明确授权")
    } else {
        fmt.Println("明确拒绝")
    }
}
```

### 特性

- ✅ **双层权限**: 系统层 (system_roles) + 企业层 (enterprise_roles)
- ✅ **Super Admin 旁路**: super_admin 角色自动绕过所有权限检查
- ✅ **自定义覆盖**: 支持 grant/deny 两种覆盖类型
- ✅ **过期时间**: 自定义权限支持 `expires_at` 字段

### 数据库表

- `system_roles` - 系统级角色
- `system_permissions` - 系统级权限
- `system_role_permissions` - 系统角色权限关联
- `enterprise_user_roles` - 企业用户角色
- `enterprise_permissions` - 企业级权限
- `enterprise_role_permissions` - 企业角色权限关联
- `enterprise_user_custom_permissions` - 企业用户自定义权限

### 与 PermissionRepository 的区别

| 特性 | PermissionRepository | PermissionServiceV2Repository |
|------|---------------------|------------------------------|
| 表结构 | company_roles, permissions | system_roles, enterprise_permissions |
| 层级 | 单层 (角色→权限) | 双层 (系统→企业) |
| 多租户 | 部分支持 | 完全支持 |
| Super Admin | 环境变量配置 | 数据库角色 + bypass |
| 自定义权限 | JSONB 字段 | 独立表 + grant_type |

---

## 迁移历史

### 2025-01-14: 删除 PermissionServiceRepository

#### 迁移前

```
PermissionService
    └─→ PermissionServiceRepository (旧实现)
            ├─→ IsSystemAdmin()
            ├─→ GetUserRolePermissions()
            └─→ ... (11个方法)
```

#### 迁移后

```
PermissionService
    └─→ PermissionServiceRepositoryAdapter (适配器)
            ├─→ IsSystemAdmin() → 直接SQL
            ├─→ CheckCustomPermission() → PermissionRepository
            └─→ GetUserRolePermissions() → 直接SQL
```

#### 删除的文件

- ❌ `backend/database/permission_service_repository.go` (392行)

#### 新增的文件

- ✅ `backend/database/permission_service_repository_adapter.go` (380行)

#### 保留的接口

- ✅ `PermissionServiceRepository` 接口定义 (用于向后兼容)
- ✅ 标记为 `@deprecated` 和使用说明

---

## 开发指南

### 新功能开发

✅ **推荐**: 直接使用 `PermissionRepository`

```go
// ✅ 推荐做法
permRepo := database.NewPermissionRepository(db)
result, err := permRepo.CheckUserPermission(ctx, companyUserID, "project.update", &projectID)
```

❌ **不推荐**: 使用适配器或遗留接口

```go
// ❌ 不推荐
adapter := database.NewPermissionServiceRepositoryAdapter(permRepo, db)
hasPermission, err := adapter.CheckCustomPermission(ctx, userID, "project.update")
```

### 企业级功能

✅ 使用 `PermissionServiceV2Repository`

```go
// ✅ 企业双层权限
permV2Repo := database.NewPermissionServiceV2Repository(db)
hasSystemPerm, err := permV2Repo.CheckSystemPermission(ctx, userID, "system.users.manage")
hasEnterprisePerm, err := permV2Repo.CheckEnterpriseRolePermission(ctx, userID, enterpriseID, "enterprise.projects.create")
```

### 遗留代码维护

⚠️ 如果必须维护遗留的 `PermissionService`:

```go
// ⚠️ 遗留代码维护
permRepo := database.NewPermissionRepository(db)
adapter := database.NewPermissionServiceRepositoryAdapter(permRepo, db)
permService := services.NewPermissionService(adapter)
```

---

## 最佳实践

### 1. 权限检查

```go
// ✅ 使用层级检查 (推荐)
result, err := permRepo.CheckUserPermission(ctx, companyUserID, "project.update", &projectID)
if err != nil {
    return err
}

// result 包含:
// - HasPermission: bool
// - Source: "custom_override" | "project_specific" | "role_inherited"
// - Reason: 详细说明

// ✅ 批量检查 (性能优化)
permissions := []string{"project.read", "project.update", "project.delete"}
results, err := permRepo.CheckMultiplePermissions(ctx, companyUserID, permissions, &projectID)
```

### 2. 权限管理

```go
// ✅ 设置角色权限
role, err := permRepo.CreateRole(ctx, &models.CompanyRole{
    RoleCode: "developer",
    RoleName: "开发人员",
})

permissionIDs := []int{1, 2, 3} // 从 GetPermissions() 获取
err = permRepo.SetRolePermissions(ctx, role.ID, permissionIDs)

// ✅ 自定义权限覆盖 (临时授权)
err = permRepo.SetUserPermissionOverride(ctx, companyUserID, "finance.read", true, "季度审计需要")
```

### 3. 审计追踪

```go
// ✅ 记录权限变更
auditLog := &models.PermissionAuditLog{
    CompanyUserID:  &adminID,
    TargetUserID:   &targetUserID,
    ActionType:     "permission_override",
    PermissionCode: &permCode,
    OldValue:       map[string]interface{}{"granted": false},
    NewValue:       map[string]interface{}{"granted": true},
    Reason:         &reason,
    PerformedBy:    &adminID,
}
err := permRepo.LogPermissionChange(ctx, auditLog)

// ✅ 查询审计日志
logs, total, err := permRepo.GetPermissionAuditLogs(ctx, &targetUserID, 20, 0)
```

### 4. 权限分析

```go
// ✅ 追踪权限来源
trace, err := permRepo.GetPermissionInheritanceTrace(ctx, companyUserID, "project.delete", &projectID)
for _, step := range trace.Steps {
    fmt.Printf("层级: %s, 来源: %s, 是否授权: %v, 原因: %s\n",
        step.Level, step.Source, step.HasPermission, step.Reason)
}

// ✅ 检测冲突
analysis, err := permRepo.AnalyzePermissionConflicts(ctx, companyUserID)
if len(analysis.Conflicts) > 0 {
    for _, conflict := range analysis.Conflicts {
        fmt.Printf("冲突权限: %s, 角色授权: %v, 自定义覆盖: %v\n",
            conflict.PermissionCode, conflict.RoleGrants, *conflict.CustomOverride)
    }
}
```

---

## 性能建议

### 1. 使用批量方法

```go
// ❌ N+1 查询
for _, roleID := range roleIDs {
    permissions, _ := permRepo.GetRolePermissions(ctx, roleID)
}

// ✅ 单次查询
roles, permissionsMap, err := permRepo.GetRolesWithPermissions(ctx, nil)
for _, role := range roles {
    permissions := permissionsMap[role.ID]
}
```

### 2. 缓存常用数据

```go
// 缓存所有系统权限
allPermissions, err := permRepo.GetPermissions(ctx)
// 存储到 Redis 或内存缓存

// 缓存用户权限摘要
summary, err := permRepo.GetUserPermissions(ctx, companyUserID)
// 缓存 5-10 分钟
```

### 3. 使用 resourceID 优化

```go
// ✅ 提供 resourceID 进行项目级检查
result, err := permRepo.CheckUserPermission(ctx, companyUserID, "project.update", &projectID)

// ❌ 不提供 resourceID 会跳过项目级权限
result, err := permRepo.CheckUserPermission(ctx, companyUserID, "project.update", nil)
```

---

## 故障排查

### 权限检查失败

```go
// 1. 获取详细的权限追踪
trace, _ := permRepo.GetPermissionInheritanceTrace(ctx, companyUserID, permissionCode, resourceID)
for _, step := range trace.Steps {
    fmt.Printf("[%s] %s: %v - %s\n", step.Level, step.Source, step.HasPermission, step.Reason)
}

// 2. 检查用户权限摘要
summary, _ := permRepo.GetUserPermissions(ctx, companyUserID)
fmt.Printf("角色: %+v\n", summary.Role)
fmt.Printf("自定义权限: %+v\n", summary.CustomPermissions)
fmt.Printf("项目权限: %+v\n", summary.ProjectPermissions)

// 3. 分析权限冲突
analysis, _ := permRepo.AnalyzePermissionConflicts(ctx, companyUserID)
fmt.Printf("冲突: %d, 冗余: %d, 缺口: %d\n",
    len(analysis.Conflicts), len(analysis.Redundancies), len(analysis.Gaps))
```

---

## 常见问题 (FAQ)

### Q1: 何时使用 PermissionRepository vs PermissionServiceV2Repository?

**A**:
- **PermissionRepository**: 单层 RBAC,适用于大多数场景
- **PermissionServiceV2Repository**: 双层 RBAC (系统 + 企业),适用于多租户 SaaS

### Q2: PermissionServiceRepositoryAdapter 什么时候会被移除?

**A**: 计划在 1-2 个月内逐步迁移 `PermissionService` 直接使用 `PermissionRepository`,届时适配器将被废弃。

### Q3: 如何配置 Super Admin?

**方式 1**: 环境变量 (PermissionRepository)
```bash
FEATURE_SUPERADMIN_ENABLE=true
SUPER_ADMIN_IDS=1,2,3
SUPER_ADMIN_EMAILS=admin@example.com,superuser@example.com
```

**方式 2**: 数据库角色 (PermissionServiceV2Repository)
```sql
INSERT INTO system_roles (code, name) VALUES ('super_admin', 'Super Administrator');
```

### Q4: 自定义权限覆盖的优先级是什么?

**优先级** (从高到低):
1. 自定义权限覆盖 (`custom_permissions` JSONB)
2. 项目级权限 (`company_user_project_permissions`)
3. 角色继承权限 (`role_permissions`)

### Q5: 如何实现临时权限?

```go
// 1. 设置自定义权限覆盖
err := permRepo.SetUserPermissionOverride(ctx, companyUserID, "finance.read", true, "季度审计")

// 2. 手动在一段时间后移除
time.AfterFunc(24*time.Hour, func() {
    permRepo.RemoveUserPermissionOverride(ctx, companyUserID, "finance.read")
})

// 或者使用 permission_requests 表的 expires_at 字段 (需要定时任务清理)
```

---

## 总结

| 需求 | 推荐 Repository |
|------|----------------|
| 新功能开发 | ✅ PermissionRepository |
| 企业多租户 | ✅ PermissionServiceV2Repository |
| 遗留代码维护 | ⚠️ PermissionServiceRepositoryAdapter (自动使用) |
| 权限审计 | ✅ PermissionRepository.LogPermissionChange() |
| 性能优化 | ✅ PermissionRepository.GetRolesWithPermissions() |

**记住**: 永远优先使用 `PermissionRepository`,它是最全面、最稳定的实现!
