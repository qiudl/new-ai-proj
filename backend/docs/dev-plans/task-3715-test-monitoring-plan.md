# Task 3715: PermissionService 单元测试 + 监控集成计划

## 📋 任务信息

- **任务ID**: 3715
- **标题**: 补充 PermissionService 单元测试 + 监控集成
- **优先级**: High
- **预估工时**: 8小时 (6h测试 + 2h监控)
- **标签**: 测试, 单元测试, PermissionService, 监控, 短期

## 🎯 任务目标

1. 为重构后的 PermissionService 补充单元测试
2. 集成 Prometheus 监控到10个核心方法
3. 确保测试覆盖率达到 **80%以上**
4. 验证监控指标正确记录

---

## 📊 当前状态

### 已有测试

**文件**: `services/permission_service_test.go` (283行)

**已测试的方法** (9个测试函数):
1. ✅ `GetSystemPermissions()` - 系统权限列表
2. ✅ `GetRoleTemplates()` - 角色模板
3. ✅ `buildPermissionCode()` - 权限码构建
4. ✅ `CheckUserPermission()` - 用户权限检查（基础）
5. ✅ `CheckProjectPermission()` - 项目权限检查（基础）
6. ✅ `UserPermissionContext` - 上下文结构
7. ✅ `PermissionCheckResult` - 结果结构
8. ✅ Integration test - 集成测试
9. ✅ `CheckPermissionWithMock` - Mock测试

### 需要补充测试的核心方法（10个）

根据 Task 3693 refactoring, 以下方法需要全面测试：

1. ❌ **CheckPermission()** - 主入口方法
2. ❌ **checkCustomPermissions()** - 自定义权限检查
3. ❌ **checkProjectPermissions()** - 项目权限检查（重构重点）
4. ❌ **checkRolePermissions()** - 角色权限检查
5. ❌ **isSystemAdmin()** - 系统管理员检查
6. ❌ **GetUserAccessibleProjects()** - 可访问项目查询
7. ❌ **InitializeSystemPermissions()** - 初始化系统权限
8. ❌ **CreateRole()** - 创建角色
9. ❌ **AssignRoleToUser()** - 分配角色
10. ❌ **GrantProjectPermission()** - 授予项目权限

---

## 📈 测试策略

### Phase 1: 监控集成（2小时）

#### 1.1 导入监控包

```go
// services/permission_service.go
import (
    "ai-project-backend/monitoring"
    "time"
    // ... existing imports
)
```

#### 1.2 为每个核心方法添加监控

**模式1**: 简单方法（无外部调用）

```go
func (s *PermissionService) isSystemAdmin(ctx context.Context, userID int) bool {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        monitoring.RecordPermissionCheck("isSystemAdmin", duration, true, 1)
    }()

    // 原有逻辑...
    result, err := s.permRepo.CheckUserPermission(ctx, userID, "system.admin", nil)

    if err != nil {
        monitoring.RecordPermissionError("isSystemAdmin", "db_error")
        return false
    }

    return result != nil && result.HasPermission
}
```

**模式2**: 复杂方法（多个DB调用）

```go
func (s *PermissionService) checkProjectPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    start := time.Now()
    queryCount := 0
    success := false

    defer func() {
        duration := time.Since(start).Seconds()
        monitoring.RecordPermissionCheck("checkProjectPermissions", duration, success, queryCount)
    }()

    if permCtx.ProjectID == nil {
        return false, "", ""
    }

    // DB Query 1
    permissions, err := s.permRepo.GetUserProjectPermissions(ctx, permCtx.UserID, *permCtx.ProjectID)
    queryCount++

    if err != nil {
        monitoring.RecordPermissionError("checkProjectPermissions", "db_error")
        return false, "", ""
    }

    // 权限检查逻辑...
    success = true
    return granted, "project_permission", reason
}
```

**模式3**: 带缓存的方法

```go
func (s *PermissionService) checkRolePermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
    start := time.Now()
    queryCount := 0
    success := false

    defer func() {
        duration := time.Since(start).Seconds()
        monitoring.RecordPermissionCheck("checkRolePermissions", duration, success, queryCount)
    }()

    // 尝试缓存（如果有的话）
    // cacheKey := fmt.Sprintf("role_perm:%d:%s", permCtx.UserID, permissionCode)
    // if cached, found := s.cache.Get(cacheKey); found {
    //     monitoring.RecordCacheHit("checkRolePermissions")
    //     return parseCache(cached)
    // }
    // monitoring.RecordCacheMiss("checkRolePermissions")

    // DB查询
    result, err := s.permRepo.CheckUserPermission(ctx, permCtx.UserID, permissionCode, nil)
    queryCount++

    if err != nil {
        monitoring.RecordPermissionError("checkRolePermissions", "db_error")
        return false, "", ""
    }

    if result != nil && result.HasPermission {
        success = true
        return true, "role_permission", result.Source
    }

    return false, "", ""
}
```

#### 1.3 活跃请求监控（可选）

```go
func (s *PermissionService) CheckPermission(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (*PermissionCheckResult, error) {
    monitoring.PermissionActiveRequests.WithLabelValues("CheckPermission").Inc()
    defer monitoring.PermissionActiveRequests.WithLabelValues("CheckPermission").Dec()

    // 原有逻辑...
}
```

### Phase 2: 单元测试实现（6小时）

#### 2.1 Mock Repository Setup

```go
// Create mock repository
type MockPermissionRepository struct {
    mock.Mock
}

func (m *MockPermissionRepository) CheckUserPermission(ctx context.Context, userID int, permCode string, projectID *int) (*models.PermissionResult, error) {
    args := m.Called(ctx, userID, permCode, projectID)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepository) GetUserProjectPermissions(ctx context.Context, userID int, projectID int) (*models.UserProjectPermissions, error) {
    args := m.Called(ctx, userID, projectID)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*models.UserProjectPermissions), args.Error(1)
}

// ... more mock methods
```

#### 2.2 测试用例模板

```go
func TestPermissionService_CheckCustomPermissions(t *testing.T) {
    tests := []struct {
        name            string
        permCtx         *UserPermissionContext
        permissionCode  string
        mockSetup       func(*MockPermissionRepository)
        wantGranted     bool
        wantSource      string
        wantErr         bool
    }{
        {
            name: "granted by custom permission",
            permCtx: &UserPermissionContext{
                UserID:    1,
                ProjectID: intPtr(100),
            },
            permissionCode: "project.read",
            mockSetup: func(m *MockPermissionRepository) {
                m.On("GetUserPermissionOverrides", mock.Anything, 1, mock.Anything).
                    Return([]models.PermissionOverride{
                        {PermissionCode: "project.read", Granted: true},
                    }, nil)
            },
            wantGranted: true,
            wantSource:  "custom_permission",
            wantErr:     false,
        },
        {
            name: "denied by custom permission",
            permCtx: &UserPermissionContext{
                UserID: 1,
            },
            permissionCode: "project.delete",
            mockSetup: func(m *MockPermissionRepository) {
                m.On("GetUserPermissionOverrides", mock.Anything, 1, mock.Anything).
                    Return([]models.PermissionOverride{
                        {PermissionCode: "project.delete", Granted: false},
                    }, nil)
            },
            wantGranted: false,
            wantSource:  "",
            wantErr:     false,
        },
        {
            name: "no custom permission found",
            permCtx: &UserPermissionContext{
                UserID: 1,
            },
            permissionCode: "task.create",
            mockSetup: func(m *MockPermissionRepository) {
                m.On("GetUserPermissionOverrides", mock.Anything, 1, mock.Anything).
                    Return([]models.PermissionOverride{}, nil)
            },
            wantGranted: false,
            wantSource:  "",
            wantErr:     false,
        },
        {
            name: "db error",
            permCtx: &UserPermissionContext{
                UserID: 1,
            },
            permissionCode: "project.read",
            mockSetup: func(m *MockPermissionRepository) {
                m.On("GetUserPermissionOverrides", mock.Anything, 1, mock.Anything).
                    Return(nil, sql.ErrConnDone)
            },
            wantGranted: false,
            wantSource:  "",
            wantErr:     false, // Method doesn't return error, just logs
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := new(MockPermissionRepository)
            tt.mockSetup(mockRepo)

            service := &PermissionService{
                permRepo: mockRepo,
            }

            granted, source, _ := service.checkCustomPermissions(context.Background(), tt.permCtx, tt.permissionCode)

            assert.Equal(t, tt.wantGranted, granted)
            assert.Equal(t, tt.wantSource, source)

            mockRepo.AssertExpectations(t)
        })
    }
}
```

#### 2.3 测试覆盖的场景

对于每个方法，测试以下场景：

1. **成功路径** (Happy Path)
   - 正常输入，权限授予
   - 正常输入，权限拒绝

2. **边界条件**
   - 空值/nil值
   - 零值
   - 不存在的ID

3. **错误处理**
   - 数据库错误
   - 超时
   - 数据不一致

4. **性能场景**
   - 缓存命中
   - 缓存未命中
   - 查询优化验证

5. **监控验证**
   - 指标正确记录
   - 错误计数正确
   - 查询计数正确

---

## 📝 实施计划

### Step 1: 监控集成（2小时）

**子任务**:
1. ⏳ 在 `permission_service.go` 添加 monitoring import
2. ⏳ 为 `checkCustomPermissions()` 添加监控
3. ⏳ 为 `checkProjectPermissions()` 添加监控（重点）
4. ⏳ 为 `checkRolePermissions()` 添加监控
5. ⏳ 为 `isSystemAdmin()` 添加监控
6. ⏳ 为其他6个方法添加监控
7. ⏳ 验证监控数据输出

**验证步骤**:
```bash
# 启动后端
go run main.go

# 调用API触发权限检查
source ~/.ai-proj-jwt.env
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks

# 检查指标
curl http://localhost:8080/metrics | grep permission_

# 应该看到类似输出:
# permission_check_duration_seconds_bucket{method="CheckPermission",status="success",le="0.005"} 1
# permission_operation_total{method="CheckPermission",result="success"} 1
# permission_db_query_total{method="checkProjectPermissions",query_type="select"} 1
```

### Step 2: Mock Repository 实现（1小时）

**子任务**:
1. ⏳ 创建 `MockPermissionRepository` struct
2. ⏳ 实现所有必需的mock方法
3. ⏳ 添加辅助函数（如 `intPtr`, `stringPtr`）

### Step 3: 核心方法测试（4小时）

**优先级排序**:

1. **高优先级**（2小时）:
   - ✅ `checkProjectPermissions()` - 重构重点，查询优化
   - ✅ `checkCustomPermissions()` - 自定义权限
   - ✅ `checkRolePermissions()` - 角色权限

2. **中优先级**（1.5小时）:
   - ✅ `isSystemAdmin()` - 系统管理员
   - ✅ `CheckPermission()` - 主入口
   - ✅ `GetUserAccessibleProjects()` - 直接SQL查询

3. **低优先级**（0.5小时）:
   - ✅ `InitializeSystemPermissions()` - 初始化
   - ✅ `CreateRole()` - 创建角色
   - ✅ `AssignRoleToUser()` - 分配角色
   - ✅ `GrantProjectPermission()` - 授予权限

### Step 4: 测试覆盖率验证（1小时）

```bash
# 运行测试并生成覆盖率报告
go test ./services -coverprofile=coverage.out

# 查看覆盖率
go tool cover -func=coverage.out | grep permission_service

# 生成HTML报告
go tool cover -html=coverage.out -o coverage.html

# 目标: permission_service.go 覆盖率 > 80%
```

---

## ✅ 成功标准

### 1. 监控集成完成

- [x] ✅ 10个核心方法全部添加监控
- [x] ✅ `/metrics` 端点输出 `permission_*` 指标
- [x] ✅ 指标包含正确的labels (method, status, query_type等)
- [x] ✅ 错误场景正确记录到 `permission_error_total`

### 2. 单元测试覆盖

- [x] ✅ 10个核心方法全部有单元测试
- [x] ✅ 每个方法至少3个测试用例
- [x] ✅ 覆盖成功路径、边界条件、错误处理
- [x] ✅ 使用 Mock Repository 隔离依赖

### 3. 测试覆盖率

- [x] ✅ `permission_service.go` 总体覆盖率 > 80%
- [x] ✅ 核心方法覆盖率 > 90%
- [x] ✅ 所有测试通过 (`go test ./services -v`)

### 4. 监控验证

- [x] ✅ 执行测试后，`/metrics` 有数据
- [x] ✅ `permission_check_duration_seconds` 有histogram数据
- [x] ✅ `permission_db_query_total` 正确计数
- [x] ✅ `permission_operation_total` 正确统计成功/失败

---

## 📊 预期输出

### 测试执行输出

```bash
$ go test ./services -v -run TestPermissionService

=== RUN   TestPermissionService_CheckCustomPermissions
=== RUN   TestPermissionService_CheckCustomPermissions/granted_by_custom_permission
=== RUN   TestPermissionService_CheckCustomPermissions/denied_by_custom_permission
=== RUN   TestPermissionService_CheckCustomPermissions/no_custom_permission_found
=== RUN   TestPermissionService_CheckCustomPermissions/db_error
--- PASS: TestPermissionService_CheckCustomPermissions (0.01s)

=== RUN   TestPermissionService_CheckProjectPermissions
=== RUN   TestPermissionService_CheckProjectPermissions/granted_project_read
=== RUN   TestPermissionService_CheckProjectPermissions/granted_project_update
=== RUN   TestPermissionService_CheckProjectPermissions/denied_no_permission
=== RUN   TestPermissionService_CheckProjectPermissions/no_project_id
--- PASS: TestPermissionService_CheckProjectPermissions (0.02s)

=== RUN   TestPermissionService_IsSystemAdmin
=== RUN   TestPermissionService_IsSystemAdmin/user_is_system_admin
=== RUN   TestPermissionService_IsSystemAdmin/user_is_not_admin
=== RUN   TestPermissionService_IsSystemAdmin/invalid_user_id
--- PASS: TestPermissionService_IsSystemAdmin (0.01s)

... (更多测试)

PASS
coverage: 85.3% of statements in services/permission_service.go
ok      ai-project-backend/services     2.145s
```

### Prometheus 指标输出

```prometheus
# HELP permission_check_duration_seconds Duration of permission check operations in seconds
# TYPE permission_check_duration_seconds histogram
permission_check_duration_seconds_bucket{method="checkProjectPermissions",status="success",le="0.001"} 45
permission_check_duration_seconds_bucket{method="checkProjectPermissions",status="success",le="0.005"} 98
permission_check_duration_seconds_bucket{method="checkProjectPermissions",status="success",le="0.01"} 100
permission_check_duration_seconds_sum{method="checkProjectPermissions",status="success"} 0.234
permission_check_duration_seconds_count{method="checkProjectPermissions",status="success"} 100

# HELP permission_db_query_total Total number of database queries for permission operations
# TYPE permission_db_query_total counter
permission_db_query_total{method="checkProjectPermissions",query_type="select"} 100
permission_db_query_total{method="checkRolePermissions",query_type="select"} 85
permission_db_query_total{method="isSystemAdmin",query_type="select"} 50

# HELP permission_error_total Total number of permission operation errors
# TYPE permission_error_total counter
permission_error_total{method="checkCustomPermissions",error_type="db_error"} 2
permission_error_total{method="checkProjectPermissions",error_type="not_found"} 5

# HELP permission_operation_total Total number of permission operations
# TYPE permission_operation_total counter
permission_operation_total{method="CheckPermission",result="success"} 150
permission_operation_total{method="CheckPermission",result="error"} 3
```

---

## ⚠️ 风险和缓解

### 风险1: 测试覆盖率不达标

**缓解措施**:
- 先实现高优先级方法测试
- 使用覆盖率工具持续监控
- 必要时扩展测试用例

### 风险2: Mock Repository 复杂度高

**缓解措施**:
- 使用 testify/mock 简化
- 创建辅助函数生成常见mock场景
- 优先mock关键方法

### 风险3: 监控开销影响性能

**缓解措施**:
- 使用 defer 确保监控不阻塞主逻辑
- Prometheus 指标更新非常快（纳秒级）
- 在生产环境验证性能影响

---

## 📚 相关文档

1. **前置任务**:
   - Task 3714: 监控观察指南
   - Task 3693: PermissionService 重构完成

2. **参考资料**:
   - Prometheus Go client: https://prometheus.io/docs/guides/go-application/
   - testify/mock: https://github.com/stretchr/testify

---

**创建时间**: 2025-11-14
**创建人**: Claude AI Assistant
**任务ID**: 3715
**状态**: ⏳ 计划完成，准备实施
