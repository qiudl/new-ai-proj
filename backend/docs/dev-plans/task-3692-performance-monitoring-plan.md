# Task 3692: 生产环境性能监控方案

## 任务信息

- **任务ID**: 3692
- **标题**: 短期：监控生产环境性能
- **状态**: 🔄 进行中
- **优先级**: high
- **预估工时**: 4小时
- **开始时间**: 2025-11-14

## 监控目标

在 Permission Repository 迁移到适配器模式后，监控以下关键性能指标:

1. **响应时间**: 权限检查调用的耗时
2. **数据库查询**: CheckCustomPermission 的额外查询影响
3. **错误率**: 权限相关的错误和异常
4. **吞吐量**: 每秒处理的权限检查请求数

**期望结果**:
- ✅ 99% 请求响应时间 < 100ms
- ✅ 无性能回退 (与迁移前对比)
- ✅ 无新增错误

## 监控方案

### 方案 1: Prometheus Metrics (推荐)

#### 优点
- 行业标准监控方案
- 丰富的可视化工具 (Grafana)
- 支持告警和趋势分析
- 低开销

#### 实现步骤

**1. 添加 Prometheus 依赖**

```go
// go.mod
require (
    github.com/prometheus/client_golang v1.17.0
)
```

**2. 创建权限监控指标**

```go
// backend/monitoring/permission_metrics.go
package monitoring

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // 权限检查延迟 (直方图)
    PermissionCheckDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "permission_check_duration_seconds",
            Help:    "Duration of permission check operations",
            Buckets: prometheus.DefBuckets, // 默认: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
        },
        []string{"method", "status"},
    )

    // 数据库查询计数
    PermissionDBQueryCount = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "permission_db_query_total",
            Help: "Total number of database queries for permissions",
        },
        []string{"method", "query_type"},
    )

    // 错误计数
    PermissionErrorCount = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "permission_error_total",
            Help: "Total number of permission errors",
        },
        []string{"method", "error_type"},
    )

    // 缓存命中率
    PermissionCacheHits = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "permission_cache_hits_total",
            Help: "Total number of permission cache hits",
        },
        []string{"method"},
    )

    PermissionCacheMisses = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "permission_cache_misses_total",
            Help: "Total number of permission cache misses",
        },
        []string{"method"},
    )
)
```

**3. 在适配器中添加监控**

```go
// backend/database/permission_service_repository_adapter.go

import (
    "time"
    "ai-project-backend/monitoring"
)

func (a *PermissionServiceRepositoryAdapter) IsSystemAdmin(ctx context.Context, userID int) (bool, error) {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        monitoring.PermissionCheckDuration.WithLabelValues("IsSystemAdmin", "success").Observe(duration)
    }()

    monitoring.PermissionDBQueryCount.WithLabelValues("IsSystemAdmin", "users").Inc()

    var role, status string
    query := `SELECT role, status FROM users WHERE id = $1 LIMIT 1`
    err := a.db.QueryRowContext(ctx, query, userID).Scan(&role, &status)
    if err != nil {
        if err == sql.ErrNoRows {
            return false, nil
        }
        monitoring.PermissionErrorCount.WithLabelValues("IsSystemAdmin", "db_error").Inc()
        return false, fmt.Errorf("failed to check system admin: %w", err)
    }

    if status != "active" {
        return false, nil
    }

    return role == "admin", nil
}
```

**4. 添加 Metrics 端点**

```go
// backend/routes/metrics_routes.go
package routes

import (
    "github.com/gin-gonic/gin"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func RegisterMetricsRoutes(router *gin.Engine) {
    router.GET("/metrics", gin.WrapH(promhttp.Handler()))
}
```

**5. Prometheus 配置**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ai-project-backend'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

### 方案 2: 应用日志分析

#### 实现步骤

**1. 添加结构化日志**

```go
// backend/utils/logger.go
package utils

import (
    "time"
    "github.com/sirupsen/logrus"
)

type PermissionLogEntry struct {
    Method       string        `json:"method"`
    UserID       int           `json:"user_id"`
    Duration     time.Duration `json:"duration_ms"`
    QueryCount   int           `json:"query_count"`
    CacheHit     bool          `json:"cache_hit"`
    Error        string        `json:"error,omitempty"`
    Timestamp    time.Time     `json:"timestamp"`
}

func LogPermissionCheck(entry PermissionLogEntry) {
    logrus.WithFields(logrus.Fields{
        "component":   "permission",
        "method":      entry.Method,
        "user_id":     entry.UserID,
        "duration_ms": entry.Duration.Milliseconds(),
        "query_count": entry.QueryCount,
        "cache_hit":   entry.CacheHit,
        "error":       entry.Error,
    }).Info("Permission check")
}
```

**2. 在适配器中添加日志**

```go
func (a *PermissionServiceRepositoryAdapter) CheckCustomPermission(ctx context.Context, userID int, permissionCode string) (bool, bool, error) {
    start := time.Now()
    queryCount := 0

    defer func() {
        duration := time.Since(start)
        utils.LogPermissionCheck(utils.PermissionLogEntry{
            Method:     "CheckCustomPermission",
            UserID:     userID,
            Duration:   duration,
            QueryCount: queryCount,
            Timestamp:  time.Now(),
        })
    }()

    queryCount++
    // ... 实现代码
}
```

**3. 日志分析查询**

```bash
# 查看平均响应时间
cat application.log | jq -r 'select(.component=="permission") | .duration_ms' | awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# 查看慢查询 (>100ms)
cat application.log | jq 'select(.component=="permission" and .duration_ms > 100)'

# 按方法统计
cat application.log | jq -r 'select(.component=="permission") | .method' | sort | uniq -c
```

### 方案 3: APM 工具集成 (可选)

推荐工具:
- **New Relic**: 全链路追踪
- **DataDog**: 综合监控
- **OpenTelemetry**: 开源追踪标准

## 监控指标定义

### 1. 响应时间指标

| 指标 | 说明 | 阈值 |
|------|------|------|
| P50 | 中位数响应时间 | < 20ms |
| P95 | 95%的请求响应时间 | < 50ms |
| P99 | 99%的请求响应时间 | < 100ms |
| 最大值 | 最慢的请求 | < 500ms |

### 2. 数据库查询指标

| 方法 | 预期查询数 | 说明 |
|------|-----------|------|
| IsSystemAdmin | 1 | users表查询 |
| GetCompanyUserID | 1 | company_users表查询 |
| CheckCustomPermission | 1 | 权限表查询 |
| GetUserRolePermissions | 1 | JOIN查询 |
| GetProjectPermissions | 1 | 项目权限查询 |

**警告**: 如果单次调用查询数 > 预期值，可能存在N+1问题

### 3. 错误率指标

| 指标 | 阈值 |
|------|------|
| 总错误率 | < 0.1% |
| 数据库错误 | < 0.01% |
| 超时错误 | < 0.05% |

## 实施计划

### 第1步: 添加基础监控 (1小时)

- [x] 创建 monitoring 包
- [ ] 定义 Prometheus metrics
- [ ] 在3-5个关键方法添加监控
- [ ] 添加 /metrics 端点

### 第2步: 部署到开发环境测试 (30分钟)

- [ ] 启动 Prometheus
- [ ] 配置抓取目标
- [ ] 验证指标正确采集

### 第3步: 创建监控面板 (1小时)

- [ ] Grafana Dashboard
- [ ] 关键指标图表
- [ ] 告警规则配置

### 第4步: 生产环境部署观察 (1.5小时)

- [ ] 部署到生产环境
- [ ] 观察1-2天数据
- [ ] 分析性能瓶颈
- [ ] 记录基线指标

## Grafana Dashboard 示例

```json
{
  "dashboard": {
    "title": "Permission System Performance",
    "panels": [
      {
        "title": "Permission Check Duration (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(permission_check_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Database Queries per Second",
        "targets": [
          {
            "expr": "rate(permission_db_query_total[1m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(permission_error_total[5m])"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(permission_cache_hits_total[5m]) / (rate(permission_cache_hits_total[5m]) + rate(permission_cache_misses_total[5m]))"
          }
        ]
      }
    ]
  }
}
```

## 告警规则示例

```yaml
# prometheus/rules.yml
groups:
  - name: permission_alerts
    interval: 30s
    rules:
      - alert: HighPermissionLatency
        expr: histogram_quantile(0.99, rate(permission_check_duration_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Permission check latency is high"
          description: "P99 latency is {{ $value }}s"

      - alert: PermissionErrors
        expr: rate(permission_error_total[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High permission error rate"
          description: "Error rate is {{ $value }}/s"

      - alert: LowCacheHitRate
        expr: rate(permission_cache_hits_total[5m]) / (rate(permission_cache_hits_total[5m]) + rate(permission_cache_misses_total[5m])) < 0.8
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Permission cache hit rate is low"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

## 性能基线预期

基于适配器实现，预期性能基线:

| 方法 | P50 | P95 | P99 | 查询数 |
|------|-----|-----|-----|--------|
| IsSystemAdmin | 5ms | 15ms | 30ms | 1 |
| GetCompanyUserID | 5ms | 15ms | 30ms | 1 |
| CheckCustomPermission | 10ms | 25ms | 50ms | 1 |
| GetUserRolePermissions | 15ms | 40ms | 80ms | 1 |
| GetProjectPermissions | 10ms | 30ms | 60ms | 1 |

## 监控清单

### 必须监控 ✅
- [ ] 权限检查响应时间
- [ ] 数据库查询数量
- [ ] 错误率和异常
- [ ] 并发请求数

### 建议监控 💡
- [ ] 缓存命中率
- [ ] 慢查询日志 (>100ms)
- [ ] 方法调用次数
- [ ] 按用户/项目的权限检查分布

### 可选监控 ⚡
- [ ] 内存使用
- [ ] CPU使用率
- [ ] 数据库连接池状态
- [ ] 网络I/O

## 下一步行动

1. **立即**: 实现基础 Prometheus metrics
2. **本周**: 部署到开发环境测试
3. **下周**: 生产环境部署观察
4. **持续**: 分析数据，优化性能

## 相关文档

- [适配器实现](../../database/permission_service_repository_adapter.go)
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana Dashboard](https://grafana.com/docs/)

---

**创建人**: Claude AI Assistant
**创建时间**: 2025-11-14
**状态**: 进行中
