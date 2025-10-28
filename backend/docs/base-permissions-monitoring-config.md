# 基础权限系统监控配置指南

## 📋 监控概览

**配置目标**: 监控基础权限系统的性能、可用性和安全性
**监控工具**: 可根据项目实际使用的监控系统调整
**配置日期**: 2025-10-27

---

## 🎯 核心监控指标

### 1. 权限检查响应时间

**指标名称**: `permission_check_duration_ms`
**指标类型**: Histogram
**标签**:
- `permission_code`: 权限代码 (如 dashboard.read)
- `user_type`: 用户类型 (system, enterprise)
- `result`: 检查结果 (granted, denied)

**目标值**:
- P50: < 50ms
- P95: < 100ms
- P99: < 200ms

**告警规则**:
```yaml
# P95响应时间过高
- alert: BasePermissionCheckSlow
  expr: histogram_quantile(0.95, permission_check_duration_ms) > 200
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "权限检查响应时间过高"
    description: "P95响应时间 {{ $value }}ms 超过阈值200ms"

# P99响应时间过高
- alert: BasePermissionCheckCritical
  expr: histogram_quantile(0.99, permission_check_duration_ms) > 500
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "权限检查响应时间严重过高"
    description: "P99响应时间 {{ $value }}ms 超过阈值500ms"
```

**实施代码示例** (Go):
```go
// middleware/role_permission_middleware.go

import (
    "time"
    "github.com/prometheus/client_golang/prometheus"
)

var permissionCheckDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "permission_check_duration_ms",
        Help:    "Permission check duration in milliseconds",
        Buckets: []float64{10, 25, 50, 100, 200, 500, 1000},
    },
    []string{"permission_code", "user_type", "result"},
)

func init() {
    prometheus.MustRegister(permissionCheckDuration)
}

func (m *RolePermissionMiddleware) CheckPermission(permission string) bool {
    start := time.Now()
    defer func() {
        duration := float64(time.Since(start).Milliseconds())
        result := "denied"
        if hasPermission {
            result = "granted"
        }
        permissionCheckDuration.WithLabelValues(
            permission,
            userContext.UserType,
            result,
        ).Observe(duration)
    }()

    // ... existing permission check logic
}
```

---

### 2. API调用频率和成功率

#### 2.1 Dashboard API (dashboard.read)

**端点**: `GET /api/v1/daily-focus-tasks`
**指标名称**: `api_requests_total`, `api_request_duration_ms`

**监控维度**:
- 每秒请求数 (QPS)
- 成功率 (2xx/total)
- 响应时间分布

**目标值**:
- QPS: 预计10-50 QPS
- 成功率: > 99%
- P95响应时间: < 150ms

**告警规则**:
```yaml
- alert: DashboardAPIHighErrorRate
  expr: (sum(rate(api_requests_total{endpoint="/daily-focus-tasks",status!~"2.."}[5m])) / sum(rate(api_requests_total{endpoint="/daily-focus-tasks"}[5m]))) > 0.01
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Dashboard API错误率过高"
    description: "错误率 {{ $value | humanizePercentage }} 超过1%"

- alert: DashboardAPIDown
  expr: sum(rate(api_requests_total{endpoint="/daily-focus-tasks"}[1m])) == 0 AND time() - process_start_time_seconds > 120
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Dashboard API无请求流量"
    description: "可能服务宕机或路由问题"
```

#### 2.2 Work Notes API (work_note.*)

**端点**:
- `POST /api/v1/work-notes` (create)
- `GET /api/v1/work-notes` (list)
- `GET /api/v1/work-notes/:id` (read)
- `PUT /api/v1/work-notes/:id` (update)
- `DELETE /api/v1/work-notes/:id` (delete)

**指标**:
- `work_note_operations_total{operation="create|read|update|delete"}`
- `work_note_operation_duration_ms`

**目标值**:
- 创建成功率: > 95%
- 读取成功率: > 99%
- 更新成功率: > 95%
- 删除成功率: > 98%

**告警规则**:
```yaml
- alert: WorkNoteCreateFailureHigh
  expr: (sum(rate(work_note_operations_total{operation="create",result="error"}[5m])) / sum(rate(work_note_operations_total{operation="create"}[5m]))) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "工作笔记创建失败率过高"
    description: "失败率 {{ $value | humanizePercentage }} 超过5%"
```

#### 2.3 Timer API (timer.*)

**端点**:
- `POST /api/v1/user/timer/start` (timer.start)
- `POST /api/v1/user/timer/stop` (timer.stop)
- `GET /api/v1/user/timer/history` (timer.view)

**指标**:
- `timer_operations_total{operation="start|stop|view"}`
- `active_timers_count` (gauge)

**目标值**:
- 启动成功率: > 95%
- 停止成功率: > 99%
- 并发活跃计时器: < 1000

**告警规则**:
```yaml
- alert: TimerOperationFailureHigh
  expr: (sum(rate(timer_operations_total{result="error"}[5m])) / sum(rate(timer_operations_total[5m]))) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "计时器操作失败率过高"
    description: "失败率 {{ $value | humanizePercentage }} 超过5%"

- alert: ActiveTimersTooHigh
  expr: active_timers_count > 1000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "活跃计时器数量过高"
    description: "当前活跃计时器 {{ $value }}，可能存在未正确停止的计时器"
```

---

### 3. 错误率监控

#### 3.1 权限拒绝率 (403 Forbidden)

**指标名称**: `permission_denied_total`
**维度**:
- `endpoint`: API端点
- `permission_code`: 被拒绝的权限
- `user_type`: 用户类型

**正常值**:
- 基础权限403率: < 0.1% (应该极少发生)
- 非基础权限403率: 根据业务正常波动

**告警规则**:
```yaml
- alert: BasePermissionDeniedUnexpected
  expr: sum(rate(permission_denied_total{permission_code=~"dashboard.read|work_note.*|timer.*"}[5m])) > 0.001
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "基础权限被拒绝(异常)"
    description: "基础权限 {{ $labels.permission_code }} 被拒绝，这不应该发生"
```

#### 3.2 系统错误率 (5xx)

**指标名称**: `http_requests_total{status=~"5.."}`

**目标值**: < 0.1%

**告警规则**:
```yaml
- alert: HighServerErrorRate
  expr: (sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > 0.001
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "服务端错误率过高"
    description: "5xx错误率 {{ $value | humanizePercentage }} 超过0.1%"
```

---

### 4. 数据隔离验证监控

#### 4.1 跨用户访问尝试检测

**指标名称**: `data_isolation_violation_attempts_total`
**场景**:
- 用户A尝试访问用户B的工作笔记
- 用户A尝试查看用户B的计时记录

**实施方式**:
```go
// handlers/work_note_handler.go

func (h *WorkNoteHandler) GetWorkNote(c *gin.Context) {
    noteID := c.Param("id")
    userID := c.GetInt64("user_id")

    note, err := h.service.GetWorkNote(noteID)
    if err != nil {
        return
    }

    // 检测数据隔离违规尝试
    if note.OwnerID != userID {
        metrics.DataIsolationViolationAttempts.WithLabelValues(
            "work_note",
            "unauthorized_access",
        ).Inc()

        c.JSON(403, gin.H{"error": "Access denied"})
        return
    }

    // ... normal logic
}
```

**告警规则**:
```yaml
- alert: DataIsolationViolationDetected
  expr: sum(rate(data_isolation_violation_attempts_total[5m])) > 0.01
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "检测到数据隔离违规尝试"
    description: "过去5分钟检测到 {{ $value }} 次跨用户访问尝试"
```

#### 4.2 数据泄露检测

**检测方法**: 定期SQL审计

**审计脚本**:
```sql
-- 检查是否有跨用户的数据关联
SELECT
    wn.id,
    wn.owner_id,
    wn.title,
    u.id as creator_id
FROM work_notes wn
JOIN users u ON u.id != wn.owner_id
WHERE wn.deleted_at IS NULL
LIMIT 10;

-- 应该返回空结果
```

**自动化检查** (每日执行):
```bash
#!/bin/bash
# 每日数据隔离审计

result=$(ssh ubuntu@152.136.104.251 "docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -t -c \"
SELECT COUNT(*)
FROM work_notes wn
JOIN users u ON u.id != wn.owner_id
WHERE wn.deleted_at IS NULL;
\"" | xargs)

if [ "$result" != "0" ]; then
    echo "⚠️ 数据隔离异常: 发现 $result 条跨用户数据"
    # 发送告警
fi
```

---

## 📊 监控仪表板配置

### Dashboard布局建议

#### Panel 1: 基础权限系统概览
- 总请求量 (QPS)
- 平均响应时间
- 错误率
- 活跃用户数

#### Panel 2: 权限检查性能
- 权限检查P50/P95/P99响应时间 (折线图)
- 各权限代码的检查频率 (条形图)
- 权限拒绝率 (仪表盘)

#### Panel 3: API调用统计
- Dashboard API调用量和响应时间
- Work Notes操作分布 (饼图: create/read/update/delete)
- Timer操作统计

#### Panel 4: 错误和告警
- 5xx错误趋势
- 403权限拒绝趋势
- 活跃告警列表

#### Panel 5: 数据隔离安全
- 跨用户访问尝试次数
- 数据隔离违规检测
- 安全审计结果

---

## 🔧 Grafana配置示例

```json
{
  "dashboard": {
    "title": "Base Permissions System Monitor",
    "panels": [
      {
        "title": "Permission Check Duration (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(permission_check_duration_ms_bucket[5m])) by (le, permission_code))",
            "legendFormat": "{{permission_code}}"
          }
        ],
        "yAxis": {
          "label": "Duration (ms)",
          "min": 0,
          "max": 500
        },
        "alert": {
          "name": "Permission Check Slow",
          "conditions": [
            {
              "evaluator": {
                "params": [200],
                "type": "gt"
              },
              "query": {
                "datasourceId": 1,
                "model": {
                  "expr": "histogram_quantile(0.95, permission_check_duration_ms)",
                  "intervalMs": 1000,
                  "maxDataPoints": 43200
                }
              }
            }
          ]
        }
      },
      {
        "title": "Dashboard API Success Rate",
        "targets": [
          {
            "expr": "sum(rate(api_requests_total{endpoint=\"/daily-focus-tasks\",status=~\"2..\"}[5m])) / sum(rate(api_requests_total{endpoint=\"/daily-focus-tasks\"}[5m]))",
            "legendFormat": "Success Rate"
          }
        ],
        "yAxis": {
          "format": "percentunit",
          "min": 0.95,
          "max": 1
        }
      }
    ]
  }
}
```

---

## 📝 日志监控

### 关键日志模式

#### 1. 权限检查日志
```
[INFO] Permission check: user=123, permission=dashboard.read, result=granted, duration=15ms
[WARN] Permission denied: user=456, permission=admin.users.delete, reason=role_missing
```

**监控正则**:
```
/Permission denied.*permission=(dashboard.read|work_note.*|timer.*)/
```

#### 2. 数据隔离违规日志
```
[CRITICAL] Data isolation violation: user=123 attempted to access work_note=999 owned by user=456
```

**告警**: 任何匹配此模式的日志都应触发即时告警

#### 3. 性能日志
```
[WARN] Slow permission check: permission=work_note.read, duration=350ms, user=123
```

---

## 🎯 KPI目标

### 服务质量目标 (SLO)

| 指标 | 目标值 | 监控周期 |
|-----|-------|----------|
| Dashboard API可用性 | 99.9% | 30天 |
| 权限检查P95响应时间 | < 100ms | 7天 |
| Work Notes创建成功率 | > 95% | 7天 |
| 数据隔离违规次数 | 0 | 每日 |
| 系统5xx错误率 | < 0.1% | 7天 |

### 性能目标

| API端点 | P50 | P95 | P99 |
|---------|-----|-----|-----|
| /daily-focus-tasks | < 50ms | < 100ms | < 200ms |
| /work-notes (create) | < 80ms | < 150ms | < 300ms |
| /user/timer/start | < 60ms | < 120ms | < 250ms |

---

## 🚨 告警策略

### 告警级别

**P0 - Critical** (立即响应):
- 服务完全宕机
- 数据隔离违规检测
- P99响应时间 > 1000ms
- 5xx错误率 > 1%

**P1 - High** (1小时内响应):
- P95响应时间 > 200ms
- API成功率 < 95%
- 基础权限被拒绝

**P2 - Medium** (8小时内响应):
- P95响应时间 > 150ms
- API成功率 < 99%
- 活跃计时器数量异常

**P3 - Low** (24小时内响应):
- 性能轻微下降
- 非关键日志异常

### 告警通道

```yaml
alerting:
  routes:
    - match:
        severity: critical
      receiver: pagerduty
      continue: true

    - match:
        severity: warning
      receiver: slack

  receivers:
    - name: pagerduty
      pagerduty_configs:
        - service_key: '<YOUR_KEY>'

    - name: slack
      slack_configs:
        - api_url: '<WEBHOOK_URL>'
          channel: '#alerts'
```

---

## 📅 监控维护计划

### 每日任务
- [ ] 检查监控仪表板，确认无异常
- [ ] 审查告警日志
- [ ] 验证数据隔离审计脚本执行结果

### 每周任务
- [ ] 分析性能趋势，生成周报
- [ ] 审查告警规则，调整阈值
- [ ] 检查监控数据完整性

### 每月任务
- [ ] SLO达成情况评估
- [ ] 监控系统容量规划
- [ ] 告警疲劳度分析和优化

---

## 🔗 相关资源

1. **Prometheus文档**: https://prometheus.io/docs/
2. **Grafana文档**: https://grafana.com/docs/
3. **告警最佳实践**: https://prometheus.io/docs/practices/alerting/
4. **Go Prometheus客户端**: https://github.com/prometheus/client_golang

---

## 📞 联系方式

**监控负责人**: 待定
**告警接收**: 待配置

---

**文档版本**: v1.0
**生成日期**: 2025-10-27
**下次审查**: 2025-11-27
