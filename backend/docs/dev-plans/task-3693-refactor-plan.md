# Task 3693: 重构 PermissionService 使用 PermissionRepository

## 任务信息

- **任务ID**: 3693
- **标题**: 中期：重构 PermissionService 直接使用 PermissionRepository
- **状态**: 🔄 进行中
- **优先级**: medium
- **预估工时**: 16小时
- **依赖**: Task 3691 ✅, Task 3692 ✅

## 当前架构分析

### PermissionService 当前实现

**文件**: `backend/services/permission_service.go` (约900行)

**依赖关系**:
```go
type PermissionService struct {
    repo database.PermissionServiceRepository  // 当前使用适配器
}
```

**核心方法 (20个)**:
1. `CheckPermission` - 核心权限检查逻辑
2. `CheckUserPermission` - 简化版权限检查
3. `CheckProjectPermission` - 项目权限检查
4. `CheckTaskPermission` - 任务权限检查
5. `CheckDocumentPermission` - 文档权限检查
6. `CheckMultiplePermissions` - 批量权限检查
7. `GetUserEffectivePermissions` - 获取有效权限列表
8. `isSystemAdmin` - 系统管理员检查
9. `FilterResourcesByPermission` - 资源过滤
10. `GetUserAccessibleProjects` - 获取可访问项目
11. `checkCustomPermissions` - 自定义权限检查
12. `checkProjectPermissions` - 项目级权限检查
13. `checkRolePermissions` - 角色权限检查
14. `checkDynamicPermissions` - 动态权限检查
15. `checkPolicyPermissions` - 策略权限检查
16. `InitializeSystemPermissions` - 初始化系统权限
17. `CreateRole` - 创建角色
18. `AssignRoleToUser` - 分配角色
19. `GrantProjectPermission` - 授予项目权限
20. 其他辅助方法...

### 当前调用的 Repo 方法

从适配器调用的方法:
1. ✅ `IsSystemAdmin(ctx, userID)` - 检查系统管理员
2. ✅ `GetCompanyUserID(ctx, userID)` - 获取公司用户ID
3. ✅ `CheckCustomPermission(ctx, userID, permissionCode)` - 自定义权限
4. ✅ `GetProjectPermissions(ctx, companyUserID, projectID)` - 项目权限
5. ✅ `GetUserRolePermissions(ctx, userID)` - 角色权限
6. ✅ `GetUserAccessibleProjects(ctx, userID)` - 可访问项目
7. ⏳ `CheckPermissionDelegationWithProject(...)` - 权限委托(带项目)
8. ⏳ `CheckPermissionDelegationWithoutProject(...)` - 权限委托(无项目)
9. ⏳ `CheckTemporaryPermission(...)` - 临时权限
10. ⏳ `UpsertPermission(...)` - 更新/插入权限
11. ⏳ `CreateRoleRecord(...)` - 创建角色记录
12. ⏳ `AssignPermissionToRole(...)` - 分配权限到角色
13. ⏳ `UpdateUserRole(...)` - 更新用户角色
14. ⏳ `UpsertProjectPermissions(...)` - 更新项目权限
15. ⏳ `GetPermissionIDByCode(...)` - 根据代码获取权限ID

## 重构目标

### 主要目标
1. ✅ 移除对 `PermissionServiceRepository` 接口的依赖
2. ✅ 直接使用 `PermissionRepository` 的方法
3. ✅ 简化权限检查逻辑，利用 `CheckUserPermission` 的层级继承
4. ✅ 减少数据库查询次数
5. ✅ 提高代码可维护性

### 预期收益
- 🎯 减少一层间接调用
- 🎯 更清晰的代码结构
- 🎯 更好的性能 (减少 GetCompanyUserID 查询)
- 🎯 更容易理解和维护

## 重构策略

### 方法映射表

| 当前方法 (适配器) | 新方法 (PermissionRepository) | 变化 |
|-------------------|------------------------------|------|
| `IsSystemAdmin(userID)` | 直接SQL查询 → 保留或使用 `CheckUserPermission` | 简化 |
| `GetCompanyUserID(userID)` | 移除 - 直接使用 userID | **重要变更** |
| `CheckCustomPermission(userID, code)` | `GetUserPermissionOverrides(companyUserID)` | 需要转换 |
| `GetProjectPermissions(companyUserID, projectID)` | `GetUserProjectPermissions(userID, projectID)` | 参数变更 |
| `GetUserRolePermissions(userID)` | `GetUserPermissions(userID, projectID?)` | 方法变更 |
| `GetUserAccessibleProjects(userID)` | 可能需要保留直接SQL | 待评估 |
| `CheckPermissionDelegationWith*` | 待评估 | 可能废弃 |
| `UpsertPermission` | `SetRolePermissions` | 方法变更 |
| `CreateRoleRecord` | `CreateRole` | 方法名变更 |
| `AssignPermissionToRole` | `SetRolePermissions` | 方法变更 |
| `UpdateUserRole` | 可能需要新增方法 | 待评估 |
| `UpsertProjectPermissions` | `SetUserProjectPermissions` | 方法变更 |

### 关键变更点

#### 1. user_id vs company_user_id

**当前**: 适配器会调用 `GetCompanyUserID` 转换
```go
companyUserID, err := s.repo.GetCompanyUserID(ctx, userID)
```

**重构后**: 直接使用 userID
```go
permissions, err := s.permRepo.GetUserPermissions(ctx, userID, projectID)
```

**影响**: `PermissionRepository` 的所有方法都已经使用 userID (或 companyUserID 参数名但实际是 userID)

#### 2. 权限检查逻辑优化

**当前**: 分5步检查
```go
1. checkCustomPermissions()
2. checkProjectPermissions()
3. checkRolePermissions()
4. checkDynamicPermissions()
5. checkPolicyPermissions()
```

**重构后**: 利用 `CheckUserPermission` 的层级检查
```go
// PermissionRepository.CheckUserPermission 已实现层级检查:
// 1. 自定义权限覆盖 (custom_permissions)
// 2. 项目级权限 (user_project_permissions)
// 3. 角色权限 (通过 role 查询 role_permissions)
hasPermission, err := s.permRepo.CheckUserPermission(ctx, userID, permissionCode, projectID)
```

**优势**:
- 一次调用完成所有检查
- 数据库端优化查询
- 减少网络往返

## 重构计划

### Phase 1: 依赖更新 (2小时)

**步骤**:
1. ✅ 更新 `PermissionService` 结构体
   ```go
   type PermissionService struct {
       permRepo database.PermissionRepository  // 新依赖
       db       *sql.DB                        // 用于直接SQL查询 (如需要)
   }
   ```

2. ✅ 更新构造函数
   ```go
   func NewPermissionService(permRepo database.PermissionRepository, db *sql.DB) *PermissionService {
       return &PermissionService{
           permRepo: permRepo,
           db:       db,
       }
   }
   ```

3. ✅ 更新 `application.go` 中的初始化
   ```go
   permissionService := services.NewPermissionService(permissionRepo, sqlDB)
   ```

### Phase 2: 核心方法重构 (6小时)

#### 2.1 重构 isSystemAdmin

**当前**:
```go
func (s *PermissionService) isSystemAdmin(ctx context.Context, userID int) bool {
    isAdmin, err := s.repo.IsSystemAdmin(ctx, userID)
    ...
}
```

**重构后**:
```go
func (s *PermissionService) isSystemAdmin(ctx context.Context, userID int) bool {
    // 直接SQL查询或使用 CheckUserPermission
    var role string
    query := `SELECT role FROM users WHERE id = $1 AND status = 'active'`
    err := s.db.QueryRowContext(ctx, query, userID).Scan(&role)
    if err != nil {
        return false
    }
    return role == "admin"
}
```

#### 2.2 重构 checkCustomPermissions

**当前**:
```go
func (s *PermissionService) checkCustomPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    isSet, isGranted, err := s.repo.CheckCustomPermission(ctx, permCtx.UserID, permissionCode)
    ...
}
```

**重构后**:
```go
func (s *PermissionService) checkCustomPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    // 使用 PermissionRepository 的方法
    overrides, err := s.permRepo.GetUserPermissionOverrides(ctx, permCtx.UserID)
    if err != nil {
        return false, "", ""
    }

    if isGranted, exists := overrides[permissionCode]; exists {
        if isGranted {
            return true, "custom_override", "granted by custom permission override"
        }
        return false, "custom_override", "denied by custom permission override"
    }

    return false, "", ""
}
```

#### 2.3 重构 checkProjectPermissions

**当前**:
```go
func (s *PermissionService) checkProjectPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    companyUserID, err := s.repo.GetCompanyUserID(ctx, permCtx.UserID)
    ...
    permissions, err := s.repo.GetProjectPermissions(ctx, companyUserID, *permCtx.ProjectID)
    ...
}
```

**重构后**:
```go
func (s *PermissionService) checkProjectPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    if permCtx.ProjectID == nil {
        return false, "", ""
    }

    // 直接使用 userID，不需要转换
    permissions, err := s.permRepo.GetUserProjectPermissions(ctx, permCtx.UserID, *permCtx.ProjectID)
    if err != nil || permissions == nil {
        return false, "", ""
    }

    // 检查权限映射 (保持原有业务逻辑)
    switch permissionCode {
    case "project.read":
        if permissions.CanView {
            return true, "project_permission", "granted by project-specific permission"
        }
    // ... 其他 case
    }

    return false, "", ""
}
```

#### 2.4 重构 checkRolePermissions

**当前**:
```go
func (s *PermissionService) checkRolePermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    permissions, err := s.repo.GetUserRolePermissions(ctx, permCtx.UserID)
    ...
}
```

**重构后**:
```go
func (s *PermissionService) checkRolePermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    // 使用 GetUserPermissions 获取综合权限
    permissions, err := s.permRepo.GetUserPermissions(ctx, permCtx.UserID, permCtx.ProjectID)
    if err != nil {
        return false, "", ""
    }

    // 检查权限列表
    for _, perm := range permissions.Permissions {
        if perm.Code == permissionCode && perm.Granted {
            return true, "role_permission", fmt.Sprintf("granted by role: %s", permissions.Role)
        }
    }

    return false, "", ""
}
```

#### 2.5 优化 CheckPermission (可选)

**当前**: 分5步顺序检查
```go
func (s *PermissionService) CheckPermission(ctx context.Context, permCtx *UserPermissionContext) (*PermissionCheckResult, error) {
    // 1. Admin override
    // 2. Custom permissions
    // 3. Project permissions
    // 4. Role permissions
    // 5. Dynamic permissions
    // 6. Policy permissions
}
```

**优化后**: 使用 PermissionRepository 的一次性检查
```go
func (s *PermissionService) CheckPermission(ctx context.Context, permCtx *UserPermissionContext) (*PermissionCheckResult, error) {
    result := &PermissionCheckResult{
        HasPermission: false,
        CheckedAt:     time.Now(),
        Context:       make(map[string]interface{}),
    }

    permissionCode := s.buildPermissionCode(permCtx.ResourceType, permCtx.Action)

    // 使用 PermissionRepository 的层级检查
    hasPermission, source, err := s.permRepo.CheckUserPermission(ctx, permCtx.UserID, permissionCode, permCtx.ProjectID)
    if err != nil {
        return nil, err
    }

    result.HasPermission = hasPermission
    result.Source = source
    result.Reason = fmt.Sprintf("permission check via %s", source)

    return result, nil
}
```

### Phase 3: 辅助方法重构 (4小时)

#### 3.1 GetUserAccessibleProjects

可能保持直接SQL查询，或评估是否能使用 PermissionRepository 的方法。

#### 3.2 CreateRole / AssignRoleToUser / GrantProjectPermission

使用 PermissionRepository 的对应方法:
- `CreateRole` → `CreateRole`
- `AssignRoleToUser` → 可能需要新增方法
- `GrantProjectPermission` → `SetUserProjectPermissions`

### Phase 4: 测试和验证 (4小时)

1. ✅ 更新单元测试
2. ✅ 运行集成测试
3. ✅ 性能对比测试
4. ✅ 回归测试

## 风险评估

### 高风险点

1. **user_id vs company_user_id 混淆**
   - 风险: 参数传递错误
   - 缓解: 仔细检查每个方法调用

2. **权限检查逻辑变更**
   - 风险: 权限判断结果不一致
   - 缓解: 详细的对比测试

3. **性能回退**
   - 风险: 新实现可能更慢
   - 缓解: 使用 Task 3692 的监控系统持续观察

### 低风险点

1. 方法签名变更 - 编译器会捕获
2. 导入路径变更 - IDE 会提示

## 成功标准

1. ✅ 所有单元测试通过
2. ✅ 集成测试通过
3. ✅ 性能无明显回退 (P99 < 100ms)
4. ✅ 代码覆盖率保持或提高
5. ✅ 无新增 bug

## 回滚计划

如果重构失败:
1. Git revert 到重构前的 commit
2. 恢复使用适配器
3. 分析失败原因
4. 重新规划

## 时间表

| 阶段 | 任务 | 时间 | 状态 |
|------|------|------|------|
| Phase 1 | 依赖更新 | 2h | ⏳ 待开始 |
| Phase 2 | 核心方法重构 | 6h | ⏳ 待开始 |
| Phase 3 | 辅助方法重构 | 4h | ⏳ 待开始 |
| Phase 4 | 测试验证 | 4h | ⏳ 待开始 |
| **总计** | | **16h** | |

## 下一步行动

1. ⏳ 开始 Phase 1: 更新依赖
2. ⏳ 编写重构前的基准测试
3. ⏳ 逐步重构核心方法
4. ⏳ 持续监控性能指标

---

**创建人**: Claude AI Assistant
**创建时间**: 2025-11-14
**状态**: 计划中
