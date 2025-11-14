# Task 3716: 权限系统集成测试方案

## 📋 任务信息

**任务ID**: 3716
**标题**: 编写权限系统集成测试
**目标**: 验证重构后的PermissionService端到端功能
**预估工时**: 4-6小时
**优先级**: 高

---

## 🎯 测试目标

### 主要目标

1. **验证重构正确性**: 确保Task 3693的重构没有破坏现有功能
2. **端到端测试**: 验证从HTTP请求到数据库的完整权限检查流程
3. **集成点测试**: 验证PermissionService与其他组件的集成
4. **性能基准**: 建立权限检查的性能基准线
5. **回归预防**: 防止未来修改破坏权限系统

### 测试范围

#### In Scope ✅
- PermissionService核心权限检查逻辑
- 多层权限检查流程（admin → custom → project → role）
- 角色和权限管理功能
- 项目权限授予和检查
- 用户可访问项目列表
- 权限初始化
- 与数据库的集成
- 与JWT认证的集成

#### Out of Scope ❌
- 单元测试（已在Task 3715完成）
- 前端集成
- 性能压测（留给Task 3720）
- 安全渗透测试

---

## 📐 测试架构

### 测试层级

```
Integration Tests (本任务)
├── Database Integration Tests
│   ├── PermissionRepository集成测试
│   └── PermissionService与数据库集成
├── Service Integration Tests
│   ├── 权限检查流程集成测试
│   └── 角色管理流程集成测试
└── API Integration Tests
    ├── 权限检查端点测试
    └── 权限管理端点测试
```

### 测试文件结构

```
backend/tests/
├── test_helpers.go                          # 已存在：测试辅助函数
├── rbac_v2_integration_test.go              # 已存在：RBAC v2集成测试
├── permission_service_integration_test.go   # 新建：PermissionService集成测试
└── permission_flow_integration_test.go      # 新建：完整权限流程测试
```

---

## 🧪 测试用例设计

### 1. 核心权限检查集成测试

#### Test Suite: PermissionServiceIntegrationTest

**测试场景**:

##### 1.1 系统管理员权限检查
```go
TestPermissionCheck_SystemAdmin
├── Test: 系统管理员可以访问所有资源
├── Test: 系统管理员绕过所有权限检查
└── Test: 非管理员不能绕过权限检查
```

**预期结果**:
- System admin返回 `granted=true, source="system_admin"`
- 非admin用户继续后续权限检查

##### 1.2 自定义权限覆盖检查
```go
TestPermissionCheck_CustomOverride
├── Test: 自定义授予权限优先级高于角色权限
├── Test: 自定义拒绝权限阻止访问
├── Test: 无自定义权限时继续检查下一层
└── Test: 数据库错误时的降级处理
```

**预期结果**:
- Custom override=true → `granted=true, source="custom_override"`
- Custom override=false → `granted=false, source="custom_override"`
- No custom → 继续到project permission

##### 1.3 项目特定权限检查
```go
TestPermissionCheck_ProjectPermission
├── Test: 项目特定权限授予访问
├── Test: 没有项目权限时检查角色权限
├── Test: 项目ID为nil时跳过项目权限检查
└── Test: 多个项目权限码的映射正确性
```

**测试数据**:
- `project.read` → 检查 `project.read`, `project.write`, `project.admin`
- `task.update` → 检查 `project.write`, `task.write`, `project.admin`

**预期结果**:
- 有项目权限 → `granted=true, source="project_permission"`
- 无项目权限 → 继续到role permission

##### 1.4 角色权限检查
```go
TestPermissionCheck_RolePermission
├── Test: 角色权限授予访问
├── Test: 角色权限必须是active状态
├── Test: 多个角色权限的正确聚合
└── Test: 无角色权限时拒绝访问
```

**测试角色**:
- Developer: `project.read`, `project.write`, `task.create`, `task.update`
- Viewer: `project.read`, `task.read`
- Admin: All permissions

**预期结果**:
- 角色包含权限 → `granted=true, source="role_permission"`
- 角色不包含权限 → `granted=false`

##### 1.5 多层权限检查流程
```go
TestPermissionCheck_MultiLayerFlow
├── Test: Admin绕过 → Project授予 → Role授予
├── Test: Custom拒绝优先级高于后续授予
├── Test: 权限检查顺序正确性
└── Test: 每层权限检查的原因记录
```

**场景**:
```
User A (非admin):
  - Custom: 无
  - Project 100: project.read (授予)
  - Role: Developer (包含project.write)

检查 project.read for Project 100:
  1. isSystemAdmin() → false
  2. checkCustomPermissions() → 无自定义
  3. checkProjectPermissions() → 授予 ✓
  结果: granted=true, source="project_permission"
```

---

### 2. 角色和权限管理集成测试

#### Test Suite: PermissionManagementIntegrationTest

##### 2.1 系统权限初始化
```go
TestPermissionManagement_InitializeSystemPermissions
├── Test: 首次初始化创建所有系统权限
├── Test: 重复初始化不重复创建（upsert）
├── Test: 初始化后权限可查询
└── Test: 初始化失败时的事务回滚
```

**验证点**:
- 检查 `permissions` 表记录数
- 验证权限码完整性
- 验证upsert行为

##### 2.2 角色创建和管理
```go
TestPermissionManagement_RoleManagement
├── Test: 创建角色并分配权限
├── Test: 更新角色权限
├── Test: 删除角色
├── Test: 查询角色及其权限
└── Test: 角色名称唯一性约束
```

**测试数据**:
```go
role := CreateRole("Test Developer", []string{
    "project.read", "project.write", "task.create"
})
```

##### 2.3 用户角色分配
```go
TestPermissionManagement_UserRoleAssignment
├── Test: 为用户分配角色
├── Test: 更换用户角色
├── Test: 角色变更后权限立即生效
└── Test: 分配不存在的角色失败
```

##### 2.4 项目权限授予
```go
TestPermissionManagement_ProjectPermissions
├── Test: 为用户授予项目特定权限
├── Test: 撤销项目权限
├── Test: 项目权限与角色权限的叠加
└── Test: 跨项目权限隔离
```

**场景**:
```
User A:
  - Role: Viewer (只有read权限)
  - Project 100: project.write (特别授予)

检查:
  - Project 100: project.write → 授予 ✓
  - Project 101: project.write → 拒绝 ✗
  - Project 100: project.read → 授予 ✓ (来自角色)
```

---

### 3. 用户可访问项目集成测试

#### Test Suite: UserAccessibleProjectsIntegrationTest

##### 3.1 基于角色的项目访问
```go
TestUserAccessibleProjects_RoleBased
├── Test: Developer角色可访问分配的项目
├── Test: Admin可访问所有项目
├── Test: Viewer可访问只读项目
└── Test: 无角色用户返回空列表
```

##### 3.2 基于项目特定权限的访问
```go
TestUserAccessibleProjects_ProjectSpecific
├── Test: 项目特定权限授予访问
├── Test: 多个项目权限的聚合
└── Test: 项目权限与角色权限的合并去重
```

##### 3.3 SQL查询正确性
```go
TestUserAccessibleProjects_QueryCorrectness
├── Test: UNION查询去重正确
├── Test: 企业隔离正确
├── Test: 大量项目时的性能
└── Test: 空结果处理
```

---

### 4. 权限检查端点集成测试

#### Test Suite: PermissionAPIIntegrationTest

##### 4.1 CheckPermission端点
```go
TestPermissionAPI_CheckPermission
├── Test: POST /api/v1/permissions/check
├── Test: 请求参数验证
├── Test: 权限检查结果正确性
└── Test: 性能基准（<100ms）
```

**请求示例**:
```json
POST /api/v1/permissions/check
{
  "user_id": 1,
  "permission_code": "project.read",
  "project_id": 100
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "granted": true,
    "source": "project_permission",
    "reason": "granted by project-specific permission"
  }
}
```

##### 4.2 批量权限检查
```go
TestPermissionAPI_CheckMultiplePermissions
├── Test: POST /api/v1/permissions/check-multiple
├── Test: 批量检查正确性
└── Test: 性能优化验证
```

##### 4.3 用户权限查询
```go
TestPermissionAPI_GetUserPermissions
├── Test: GET /api/v1/users/:user_id/permissions
├── Test: 返回用户所有生效权限
└── Test: 包含角色、项目、自定义权限
```

---

## 🏗️ 测试基础设施

### 测试数据准备

#### TestApp Setup
```go
func SetupPermissionTestApp(t *testing.T) *PermissionTestApp {
    // 1. 初始化测试应用
    testApp := SetupTestApp(t)

    // 2. 初始化系统权限
    err := testApp.App.GetPermissionService().InitializeSystemPermissions()
    assert.NoError(t, err)

    // 3. 创建测试企业
    enterprise := CreateTestEnterprise(t, testApp, "Permission Test Enterprise")

    // 4. 创建测试角色
    developerRole := CreateTestRole(t, testApp, "Developer", []string{
        "project.read", "project.write", "task.create", "task.update",
    })
    viewerRole := CreateTestRole(t, testApp, "Viewer", []string{
        "project.read", "task.read",
    })

    // 5. 创建测试用户
    systemAdmin := CreateTestSystemUser(t, testApp, "test_admin")
    developer := CreateTestEnterpriseUser(t, testApp, "test_developer", enterprise.ID)
    viewer := CreateTestEnterpriseUser(t, testApp, "test_viewer", enterprise.ID)

    // 6. 分配角色
    AssignRoleToUser(t, testApp, developer.ID, developerRole.ID)
    AssignRoleToUser(t, testApp, viewer.ID, viewerRole.ID)

    // 7. 创建测试项目
    project1 := CreateTestProject(t, testApp, enterprise.ID, "Test Project 1")
    project2 := CreateTestProject(t, testApp, enterprise.ID, "Test Project 2")

    return &PermissionTestApp{
        TestApp:       testApp,
        Enterprise:    enterprise,
        Roles:         map[string]*Role{"developer": developerRole, "viewer": viewerRole},
        Users:         map[string]*TestUser{"admin": systemAdmin, "developer": developer, "viewer": viewer},
        Projects:      []*Project{project1, project2},
    }
}
```

### 测试辅助函数

#### 权限检查辅助
```go
// CheckPermissionHelper 辅助函数用于权限检查
func CheckPermissionHelper(
    t *testing.T,
    testApp *PermissionTestApp,
    userID int,
    permissionCode string,
    projectID *int,
    expectedGranted bool,
    expectedSource string,
) {
    service := testApp.App.GetPermissionService()
    ctx := context.Background()

    permCtx := &services.UserPermissionContext{
        UserID:    userID,
        ProjectID: projectID,
    }

    granted, source, reason := service.CheckPermission(ctx, permCtx, permissionCode)

    assert.Equal(t, expectedGranted, granted, "Permission granted mismatch")
    if expectedGranted {
        assert.Equal(t, expectedSource, source, "Permission source mismatch")
        assert.NotEmpty(t, reason, "Permission reason should not be empty")
    }
}
```

#### 角色管理辅助
```go
// CreateTestRole 创建测试角色
func CreateTestRole(t *testing.T, testApp *TestApp, name string, permissions []string) *Role {
    service := testApp.App.GetPermissionService()
    ctx := context.Background()

    role, err := service.CreateRole(ctx, &models.CreateRoleRequest{
        RoleName:    name,
        Description: fmt.Sprintf("Test role: %s", name),
        Permissions: permissions,
    })

    assert.NoError(t, err)
    assert.NotNil(t, role)

    return role
}

// AssignRoleToUser 为用户分配角色
func AssignRoleToUser(t *testing.T, testApp *TestApp, userID int, roleID int) {
    service := testApp.App.GetPermissionService()
    ctx := context.Background()

    err := service.AssignRoleToUser(ctx, userID, roleID)
    assert.NoError(t, err)
}

// GrantProjectPermission 授予项目权限
func GrantProjectPermission(t *testing.T, testApp *TestApp, userID int, projectID int, permissions []string) {
    service := testApp.App.GetPermissionService()
    ctx := context.Background()

    err := service.GrantProjectPermission(ctx, userID, projectID, permissions)
    assert.NoError(t, err)
}
```

---

## 📊 测试覆盖目标

### 功能覆盖

| 功能模块 | 测试用例数 | 优先级 |
|---------|-----------|--------|
| 系统管理员检查 | 3 | P0 |
| 自定义权限覆盖 | 4 | P0 |
| 项目特定权限 | 4 | P0 |
| 角色权限检查 | 4 | P0 |
| 多层权限流程 | 4 | P0 |
| 权限初始化 | 4 | P1 |
| 角色管理 | 5 | P1 |
| 用户角色分配 | 4 | P1 |
| 项目权限授予 | 4 | P1 |
| 可访问项目列表 | 6 | P1 |
| 权限API端点 | 6 | P2 |
| **总计** | **48** | |

### 代码覆盖目标

- **PermissionService核心方法**: 100% (已在单元测试覆盖)
- **PermissionRepository集成**: 80%+
- **端到端流程**: 90%+

---

## ⏱️ 性能基准

### 性能目标

| 操作 | 目标延迟 | 说明 |
|------|---------|------|
| CheckPermission (单次) | < 50ms | 包含数据库查询 |
| CheckMultiplePermissions (10个) | < 200ms | 批量检查 |
| GetUserAccessibleProjects | < 100ms | 100个项目以内 |
| CreateRole | < 100ms | 包含权限关联 |
| AssignRoleToUser | < 50ms | 简单更新 |

### 性能测试用例
```go
func BenchmarkPermissionCheck(b *testing.B) {
    testApp := SetupPermissionTestApp(b)
    defer TeardownPermissionTestApp(b, testApp)

    service := testApp.App.GetPermissionService()
    ctx := context.Background()

    permCtx := &services.UserPermissionContext{
        UserID:    testApp.Users["developer"].ID,
        ProjectID: &testApp.Projects[0].ID,
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        service.CheckPermission(ctx, permCtx, "project.read")
    }
}
```

---

## 🔧 实施计划

### Phase 1: 测试基础设施 (1小时)
- [x] 创建测试计划文档
- [ ] 创建 `permission_service_integration_test.go`
- [ ] 实现测试辅助函数
- [ ] 实现测试数据准备函数

### Phase 2: 核心权限检查测试 (2小时)
- [ ] 实现系统管理员检查测试
- [ ] 实现自定义权限覆盖测试
- [ ] 实现项目权限检查测试
- [ ] 实现角色权限检查测试
- [ ] 实现多层权限流程测试

### Phase 3: 权限管理测试 (1.5小时)
- [ ] 实现权限初始化测试
- [ ] 实现角色管理测试
- [ ] 实现用户角色分配测试
- [ ] 实现项目权限授予测试

### Phase 4: 数据查询测试 (1小时)
- [ ] 实现可访问项目列表测试
- [ ] 实现批量权限检查测试
- [ ] 实现用户权限查询测试

### Phase 5: 运行和修复 (0.5小时)
- [ ] 运行所有集成测试
- [ ] 修复失败的测试
- [ ] 验证测试覆盖率

### Phase 6: 文档和总结 (0.5小时)
- [ ] 创建测试完成报告
- [ ] 更新测试文档
- [ ] 标记Task 3716完成

**总计预估**: 6.5小时

---

## ✅ 验收标准

### 功能验收
- [ ] 所有48个测试用例100%通过
- [ ] 覆盖所有核心权限检查场景
- [ ] 覆盖所有权限管理操作
- [ ] 端到端流程验证通过

### 性能验收
- [ ] CheckPermission < 50ms (P95)
- [ ] GetUserAccessibleProjects < 100ms (P95)
- [ ] 无性能回归（对比重构前）

### 质量验收
- [ ] 测试代码遵循现有测试模式
- [ ] 测试数据清理完整
- [ ] 测试可重复运行
- [ ] 测试文档完整

---

## 📝 参考资料

### 现有测试
- `tests/test_helpers.go` - 测试辅助函数
- `tests/rbac_v2_integration_test.go` - RBAC v2集成测试示例
- `handlers/work_note_permission_integration_test.go` - 权限集成测试示例

### 相关文档
- Task 3693: PermissionService重构完成报告
- Task 3715: PermissionService单元测试完成报告
- `design/enterprise_role_permission_system.md` - 权限系统设计文档

### Go Testing资源
- [testify/suite](https://pkg.go.dev/github.com/stretchr/testify/suite) - 测试套件
- [testify/assert](https://pkg.go.dev/github.com/stretchr/testify/assert) - 断言库
- [Go Testing Best Practices](https://go.dev/doc/tutorial/add-a-test)

---

**文档创建时间**: 2025-11-14
**文档版本**: 1.0
**预计开始时间**: 2025-11-14 22:40
**预计完成时间**: 2025-11-15 05:10
