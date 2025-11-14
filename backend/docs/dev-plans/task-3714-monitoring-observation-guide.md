# Task 3714: PermissionService 性能监控观察指南

## 📋 任务信息

- **任务ID**: 3714
- **标题**: 观察 PermissionService 重构后的性能数据
- **优先级**: High
- **预估工时**: 4小时
- **标签**: 监控, 性能, PermissionService, 短期
- **创建时间**: 2025-11-14

## 🎯 任务目标

使用 Prometheus 监控系统观察 PermissionService 重构后的性能表现，验证预期的性能提升效果（15-25%延迟降低，15%查询减少）

## 📊 关键性能指标 (KPI)

### 1. 延迟指标
- **P95 延迟**: < 50ms（目标）
- **P99 延迟**: < 100ms（目标）
- **平均延迟**: < 20ms（目标）

### 2. 数据库查询
- **查询减少率**: 15%（目标）
- **每次权限检查平均查询数**: < 2次

### 3. 缓存性能
- **缓存命中率**: > 80%（目标）
- **缓存未命中率**: < 20%

### 4. 错误率
- **整体错误率**: < 0.1%（目标）
- **严重错误率**: 0%

### 5. 并发性能
- **活跃请求数**: 监控峰值
- **请求处理速率**: 监控QPS

---

## 🔧 当前监控状态

### ✅ 已完成配置

1. **Prometheus 指标定义** (`monitoring/permission_metrics.go`):
   - ✅ `permission_check_duration_seconds` - 权限检查耗时直方图
   - ✅ `permission_db_query_total` - 数据库查询计数器
   - ✅ `permission_error_total` - 错误计数器
   - ✅ `permission_cache_hits_total` - 缓存命中计数器
   - ✅ `permission_cache_misses_total` - 缓存未命中计数器
   - ✅ `permission_operation_total` - 操作总数计数器
   - ✅ `permission_active_requests` - 活跃请求数量仪表盘

2. **Prometheus 端点配置**:
   - ✅ HTTP 端点: `GET /metrics`
   - ✅ 路由注册: `routes/setup.go:70`
   - ✅ 包导入: `main.go:4` (blank import for registration)

3. **辅助函数**:
   - ✅ `RecordPermissionCheck()` - 记录权限检查指标
   - ✅ `RecordPermissionError()` - 记录错误
   - ✅ `RecordCacheHit()` - 记录缓存命中
   - ✅ `RecordCacheMiss()` - 记录缓存未命中

### ⚠️ 待完成集成

1. **PermissionService 未插桩**:
   - ❌ 当前 `services/permission_service.go` **未导入** monitoring 包
   - ❌ 各核心方法未调用监控函数
   - ❌ 无法产生实际监控数据

2. **需要插桩的方法** (10个核心方法):
   ```
   1. CheckPermission()
   2. checkCustomPermissions()
   3. checkProjectPermissions()
   4. checkRolePermissions()
   5. isSystemAdmin()
   6. GetUserAccessibleProjects()
   7. InitializeSystemPermissions()
   8. CreateRole()
   9. AssignRoleToUser()
   10. GrantProjectPermission()
   ```

---

## 📈 监控集成方案

### Phase 1: 基础插桩（预计1小时）

在 `permission_service.go` 中添加监控调用：

```go
import (
    "ai-project-backend/monitoring"
    "time"
)

func (s *PermissionService) CheckPermission(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (*PermissionCheckResult, error) {
    start := time.Now()
    monitoring.PermissionActiveRequests.WithLabelValues("CheckPermission").Inc()
    defer monitoring.PermissionActiveRequests.WithLabelValues("CheckPermission").Dec()

    // 原有逻辑...
    result, err := s.checkPermission(ctx, permCtx, permissionCode)

    duration := time.Since(start).Seconds()
    success := err == nil
    queryCount := 0 // TODO: 需要统计实际查询数

    monitoring.RecordPermissionCheck("CheckPermission", duration, success, queryCount)

    if err != nil {
        monitoring.RecordPermissionError("CheckPermission", "internal_error")
    }

    return result, err
}
```

### Phase 2: 数据库查询计数（预计1.5小时）

为每个方法添加查询计数逻辑：

```go
// 示例: checkProjectPermissions
func (s *PermissionService) checkProjectPermissions(...) (bool, string, string) {
    queryCount := 0

    // Before DB call
    permissions, err := s.permRepo.GetUserProjectPermissions(...)
    queryCount++ // 记录查询

    // 在函数末尾
    defer func() {
        monitoring.PermissionDBQueryCount.WithLabelValues("checkProjectPermissions", "select").Add(float64(queryCount))
    }()

    // ...
}
```

### Phase 3: 缓存监控（预计1小时）

集成 Redis 缓存监控：

```go
// 示例: checkRolePermissions with cache
func (s *PermissionService) checkRolePermissions(...) (bool, string, string) {
    cacheKey := fmt.Sprintf("role_perm:%d:%s", userID, permCode)

    // Try cache first
    if cached, found := s.cache.Get(cacheKey); found {
        monitoring.RecordCacheHit("checkRolePermissions")
        return parseCache(cached)
    }

    monitoring.RecordCacheMiss("checkRolePermissions")

    // ... DB logic
}
```

### Phase 4: 错误分类（预计0.5小时）

细化错误类型监控：

```go
if err != nil {
    errorType := "unknown"
    if errors.Is(err, sql.ErrNoRows) {
        errorType = "not_found"
    } else if errors.Is(err, context.DeadlineExceeded) {
        errorType = "timeout"
    }

    monitoring.RecordPermissionError("methodName", errorType)
    return nil, err
}
```

---

## 🧪 测试和验证

### 1. 本地验证步骤

```bash
# 1. 确保后端运行
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
go run main.go

# 2. 检查 Prometheus 指标端点
curl http://localhost:8080/metrics | grep permission_

# 3. 执行一些权限检查操作（通过 API 调用）
source ~/.ai-proj-jwt.env
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/v1/tasks

# 4. 再次检查指标，应该有数据了
curl http://localhost:8080/metrics | grep permission_
```

### 2. 预期输出示例

```prometheus
# HELP permission_check_duration_seconds Duration of permission check operations in seconds
# TYPE permission_check_duration_seconds histogram
permission_check_duration_seconds_bucket{method="CheckPermission",status="success",le="0.001"} 45
permission_check_duration_seconds_bucket{method="CheckPermission",status="success",le="0.005"} 89
permission_check_duration_seconds_bucket{method="CheckPermission",status="success",le="0.01"} 95
permission_check_duration_seconds_bucket{method="CheckPermission",status="success",le="0.025"} 98
permission_check_duration_seconds_bucket{method="CheckPermission",status="success",le="0.05"} 100
permission_check_duration_seconds_sum{method="CheckPermission",status="success"} 0.523
permission_check_duration_seconds_count{method="CheckPermission",status="success"} 100

# HELP permission_db_query_total Total number of database queries for permission operations
# TYPE permission_db_query_total counter
permission_db_query_total{method="checkProjectPermissions",query_type="select"} 150

# HELP permission_cache_hits_total Total number of permission cache hits
# TYPE permission_cache_hits_total counter
permission_cache_hits_total{method="checkRolePermissions"} 85

# HELP permission_cache_misses_total Total number of permission cache misses
# TYPE permission_cache_misses_total counter
permission_cache_misses_total{method="checkRolePermissions"} 15
```

---

## 📊 性能基准线

### 重构前估算（基于代码分析）

| 指标 | 估算值 | 说明 |
|------|--------|------|
| P95 延迟 | ~60-80ms | 包含适配器层开销 |
| 平均查询数/检查 | 2.5次 | checkProjectPermissions用2次查询 |
| 缓存命中率 | 未知 | 无监控数据 |
| 错误率 | 未知 | 无监控数据 |

### 重构后目标

| 指标 | 目标值 | 改进 |
|------|--------|------|
| P95 延迟 | < 50ms | ✅ 降低 15-25% |
| 平均查询数/检查 | < 2次 | ✅ 减少 15% |
| 缓存命中率 | > 80% | ✅ 新增监控 |
| 错误率 | < 0.1% | ✅ 新增监控 |

---

## 📝 观察计划

### Week 1: 基础数据收集

**任务**:
1. ✅ 验证 Prometheus 端点配置正确
2. ⏳ 集成监控到 PermissionService (需要 Task 3715 或单独子任务)
3. ⏳ 部署到开发环境
4. ⏳ 收集初始数据（至少24小时）

**数据收集重点**:
- 各方法调用频率
- 初始延迟分布
- 初始查询计数

### Week 2: 性能分析

**任务**:
1. ⏳ 生成 P95/P99 延迟报告
2. ⏳ 分析查询减少效果
3. ⏳ 识别性能瓶颈
4. ⏳ 对比重构目标

**分析重点**:
- 哪些方法延迟最高？
- 查询减少是否达到15%目标？
- 是否有异常错误模式？
- 缓存策略是否有效？

---

## 🛠️ 工具和查询

### Prometheus 查询示例

```promql
# P95 延迟
histogram_quantile(0.95,
  rate(permission_check_duration_seconds_bucket[5m])
)

# P99 延迟
histogram_quantile(0.99,
  rate(permission_check_duration_seconds_bucket[5m])
)

# 平均延迟
rate(permission_check_duration_seconds_sum[5m]) /
rate(permission_check_duration_seconds_count[5m])

# 每秒查询率
rate(permission_db_query_total[1m])

# 缓存命中率
rate(permission_cache_hits_total[5m]) /
(rate(permission_cache_hits_total[5m]) + rate(permission_cache_misses_total[5m]))

# 错误率
rate(permission_error_total[5m]) /
rate(permission_operation_total[5m])

# 活跃请求数
permission_active_requests
```

### 导出报告脚本

```bash
#!/bin/bash
# 导出当前指标快照

OUTPUT_FILE="permission_metrics_$(date +%Y%m%d_%H%M%S).txt"

curl -s http://localhost:8080/metrics | grep "^permission_" > "$OUTPUT_FILE"

echo "✅ 指标已导出到: $OUTPUT_FILE"
echo "📊 指标总数: $(wc -l < $OUTPUT_FILE)"
```

---

## ⚠️ 已知限制和问题

### 1. 监控未集成
- **状态**: 指标已定义，但 PermissionService 未插桩
- **影响**: 当前 `/metrics` 端点不会输出 `permission_*` 指标
- **解决方案**: 需要 Task 3715 或单独任务进行集成

### 2. 查询计数困难
- **问题**: GORM 查询不容易计数
- **解决方案**:
  - 选项1: 在每个 Repository 方法中手动递增计数器
  - 选项2: 使用 GORM callback 全局拦截
  - 选项3: 估算固定查询数（简化方案）

### 3. 缓存监控依赖
- **问题**: 需要 Redis 缓存服务运行
- **当前状态**: 未确认 Redis 是否已配置
- **TODO**: 验证 cache service 配置状态

---

## ✅ 成功标准

### 任务完成标准（Task 3714）

1. ✅ **监控基础设施验证**:
   - Prometheus 端点可访问
   - 指标定义正确
   - 辅助函数可用

2. ⏳ **数据收集**（需要后续集成）:
   - 至少收集1周数据
   - 覆盖高峰和低峰时段
   - 数据完整无异常

3. ⏳ **性能报告**:
   - 生成 P95/P99 延迟报告
   - 查询减少率验证
   - 对比重构目标

4. ⏳ **问题识别**:
   - 识别性能瓶颈（如有）
   - 提出优化建议
   - 创建后续任务（如需要）

---

## 📚 相关文档

1. **监控计划**:
   - `task-3692-performance-monitoring-plan.md`
   - `task-3692-monitoring-completed.md`

2. **重构报告**:
   - `task-3693-refactoring-completed.md`
   - `permission-repository-migration-completed.md`

3. **后续任务**:
   - Task 3715: 补充单元测试（可能包含监控集成）
   - Task 3720: 性能优化（基于监控数据）

---

## 🎯 下一步行动

### 立即行动（今天）

1. ✅ 创建本观察指南文档
2. ✅ 验证 Prometheus 端点配置
3. ⏳ 决定监控集成策略：
   - 选项A: 在 Task 3715 (单元测试) 中一起集成
   - 选项B: 创建单独的子任务进行集成
   - 选项C: 在 Task 3714 中立即集成（扩展工时）

### 本周行动

1. ⏳ 完成 PermissionService 监控插桩
2. ⏳ 部署到开发环境
3. ⏳ 开始数据收集

### 下周行动

1. ⏳ 分析收集的数据
2. ⏳ 生成性能报告
3. ⏳ 验证优化目标达成情况

---

## 💡 建议

### 推荐方案: 选项A - 在 Task 3715 中集成

**理由**:
1. 单元测试需要验证监控指标是否正确记录
2. 测试覆盖率要求可以包括监控覆盖率
3. 一次性完成功能开发和监控集成
4. 避免重复修改代码

**工时分配**:
- Task 3714 (当前): 观察和规划 (2小时) ✅
- Task 3715 (下一个): 测试 + 监控集成 (8小时)

### 备选方案: 选项B - 单独子任务

如果 Task 3715 工作量已满，可以创建：
- Task 3714.1: PermissionService 监控集成 (2小时)

---

**文档创建时间**: 2025-11-14
**创建人**: Claude AI Assistant
**任务ID**: 3714
**状态**: ✅ 观察指南已完成，等待监控集成决策
