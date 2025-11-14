# Task 3716: 权限系统集成测试方案 (简化版)

## 📋 任务调整

由于发现Application层没有直接暴露PermissionService（重构后的版本），我们调整集成测试策略：

### 调整原因
1. PermissionService主要被RequirementPermissionService使用
2. Application只暴露了PermissionServiceV2
3. PermissionService的单元测试已经在Task 3715中完成（100%覆盖）
4. 集成测试的主要价值应该是验证端到端流程

### 新测试策略

#### 方案A: 通过现有API端点测试 (推荐)
利用现有的RBAC v2集成测试框架(`tests/rbac_v2_integration_test.go`)，重点测试权限检查端点。

**优势**:
- 真实的端到端测试
- 已有测试基础设施可复用
- 测试更接近实际使用场景

**测试范围**:
1. 权限检查API端点
2. 企业隔离验证
3. 跨项目权限验证

#### 方案B: 直接实例化PermissionService (补充)
创建独立的服务层集成测试，直接实例化PermissionService并测试与数据库的集成。

**优势**:
- 直接测试重构后的代码
- 不依赖HTTP层
- 更精细的控制

**测试范围**:
1. 与PermissionRepository的集成
2. 多层权限检查流程
3. 数据库事务正确性

---

## 🎯 简化测试目标

### 核心验证目标
1. ✅ **重构正确性**: 验证Task 3693的重构没有破坏功能
2. ✅ **数据库集成**: 验证与PermissionRepository的正确集成
3. ✅ **性能无回归**: 确保重构后性能没有下降

### 测试范围调整

| 测试类型 | 原计划 | 调整后 | 说明 |
|---------|--------|--------|------|
| 单元测试 | Out of scope | ✅ Task 3715已完成 | 48个测试用例,100%通过 |
| 服务层集成 | 48个测试用例 | 12个核心测试用例 | 重点测试关键路径 |
| API层集成 | 6个测试用例 | 利用现有RBAC v2测试 | 复用rbac_v2_integration_test.go |
| 性能基准 | 5个基准测试 | 3个核心基准测试 | CheckPermission, GetUserAccessibleProjects, CreateRole |

---

## 🧪 简化测试用例

### 1. 核心权限检查流程测试 (6个用例)

```go
TestPermissionServiceIntegration_CoreFlow
├── Test 1: System admin bypasses all checks
├── Test 2: Custom override grants access
├── Test 3: Custom override denies access
├── Test 4: Project-specific permission grants access
├── Test 5: Role permission grants access
└── Test 6: Multi-layer check with fallback
```

### 2. 权限管理操作测试 (3个用例)

```go
TestPermissionServiceIntegration_Management
├── Test 1: InitializeSystemPermissions creates all permissions
├── Test 2: CreateRole and assign to user
└── Test 3: GrantProjectPermission isolates by project
```

### 3. 用户可访问项目测试 (3个用例)

```go
TestPermissionServiceIntegration_UserProjects
├── Test 1: Get projects by role permissions
├── Test 2: Get projects by project-specific permissions
└── Test 3: Combine role and project permissions (UNION)
```

**总计**: 12个核心集成测试用例

---

## 🏗️ 简化实施方案

### Phase 1: 创建服务层集成测试 (2小时)

**文件**: `tests/permission_service_db_integration_test.go`

```go
type PermissionServiceDBIntegrationTestSuite struct {
    suite.Suite
    db                *sql.DB
    permRepo          database.PermissionRepository
    permService       *services.PermissionService
    testUsers         map[string]int  // username -> user_id
    testRoles         map[string]int  // role_name -> role_id
    testProjects      []int           // project_ids
}

func (s *PermissionServiceDBIntegrationTestSuite) SetupSuite() {
    // 1. Get DB connection from test app
    testApp := SetupTestApp(s.T())
    s.db = testApp.DB.GetDB()

    // 2. Create PermissionRepository
    s.permRepo = database.NewPermissionRepository(s.db)

    // 3. Create PermissionService
    s.permService = services.NewPermissionService(s.permRepo, s.db)

    // 4. Initialize system permissions
    ctx := context.Background()
    err := s.permService.InitializeSystemPermissions(ctx)
    assert.NoError(s.T(), err)

    // 5. Create test data
    s.setupTestData()
}

func (s *PermissionServiceDBIntegrationTestSuite) setupTestData() {
    // Create test users, roles, projects
    // Simplified setup focusing on core scenarios
}
```

### Phase 2: 实现12个核心测试 (1.5小时)

重点实现6个权限检查测试 + 3个管理测试 + 3个项目查询测试

### Phase 3: 性能基准测试 (0.5小时)

```go
func BenchmarkPermissionCheck_RolePermission(b *testing.B) {
    // Benchmark role permission check
}

func BenchmarkGetUserAccessibleProjects_100Projects(b *testing.B) {
    // Benchmark project list query
}

func BenchmarkCreateRole_WithPermissions(b *testing.B) {
    // Benchmark role creation
}
```

### Phase 4: 验证和文档 (0.5小时)

- 运行所有测试
- 对比重构前后性能
- 创建完成报告

**总计预估**: 4.5小时 (原计划6.5小时)

---

## ✅ 调整后验收标准

### 功能验收
- [ ] 12个核心集成测试100%通过
- [ ] 覆盖所有重构的核心方法
- [ ] 验证与数据库的正确集成

### 性能验收
- [ ] CheckPermission < 50ms (P95)
- [ ] GetUserAccessibleProjects < 100ms (P95)
- [ ] 无性能回归

### 质量验收
- [ ] 测试可重复运行
- [ ] 测试数据清理完整
- [ ] 简洁的测试文档

---

## 📝 与Task 3715的关系

### Task 3715 (已完成)
- 单元测试: 48个用例, 100%通过
- 测试类型: Mock-based unit tests
- 覆盖率: 94.2%核心方法覆盖

### Task 3716 (本任务)
- 集成测试: 12个核心用例
- 测试类型: Database integration tests
- 目标: 验证重构正确性和性能

### 互补性
- Task 3715: 验证逻辑正确性 (隔离测试)
- Task 3716: 验证集成正确性 (端到端测试)

---

**文档版本**: 2.0 (简化版)
**预计工时**: 4.5小时
**优先级**: P0 - 验证重构正确性
