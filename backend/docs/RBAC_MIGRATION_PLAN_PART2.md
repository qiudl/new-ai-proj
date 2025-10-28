# RBAC权限系统重构 - 回滚方案与灰度发布 (第2部分)

## 文档信息

- **文档版本**: v1.0
- **创建日期**: 2025-10-28
- **作者**: AI Backend Team
- **关联文档**:
  - RBAC_REFACTORING_PROPOSAL.md
  - RBAC_PROTOTYPE_DESIGN.md
  - RBAC_DEVELOPMENT_PLAN.md
  - RBAC_MIGRATION_PLAN_PART1.md (数据迁移方案)

---

## 7. 灰度发布方案

### 7.1 灰度发布架构

```
                            ┌─────────────────┐
                            │  Load Balancer  │
                            │  / API Gateway  │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            ┌───────▼────────┐  ┌───▼─────┐  ┌──────▼──────┐
            │ Routing Logic  │  │ Feature │  │  User Hash  │
            │  (Middleware)  │  │  Flag   │  │   Sharding  │
            └───────┬────────┘  └────┬────┘  └──────┬──────┘
                    │                │               │
            ┌───────▼────────────────▼───────────────▼───────┐
            │                                                 │
    ┌───────▼────────┐                        ┌──────────────▼──────┐
    │  Old RBAC v1   │                        │   New RBAC v2      │
    │  (Legacy)      │                        │   (Dual-Domain)    │
    │                │                        │                    │
    │ - roles        │                        │ - system_roles     │
    │ - permissions  │                        │ - enterprise_roles │
    │ - user_roles   │                        │ - system_perms     │
    │                │                        │ - enterprise_perms │
    └────────────────┘                        └────────────────────┘
```

### 7.2 流量路由策略

#### 7.2.1 路由中间件实现

```go
// 文件: middleware/rbac_routing_middleware.go
package middleware

import (
    "context"
    "crypto/md5"
    "encoding/binary"
    "fmt"
    "github.com/gin-gonic/gin"
    "github.com/redis/go-redis/v9"
    "log"
    "strconv"
    "time"
)

// GrayscaleConfig 灰度配置
type GrayscaleConfig struct {
    Enabled            bool          `json:"enabled"`
    Percentage         int           `json:"percentage"`          // 0-100
    RoutingMethod      string        `json:"routing_method"`      // "user_hash", "random", "whitelist"
    WhitelistUserIDs   []uint        `json:"whitelist_user_ids"`
    BlacklistUserIDs   []uint        `json:"blacklist_user_ids"`
    EnableAutoRollback bool          `json:"enable_auto_rollback"`
    ErrorThreshold     float64       `json:"error_threshold"`     // 错误率阈值,如0.05=5%
    MonitorWindow      time.Duration `json:"monitor_window"`      // 监控窗口,如5分钟
}

// RBACRoutingMiddleware RBAC灰度路由中间件
type RBACRoutingMiddleware struct {
    config      *GrayscaleConfig
    redisClient *redis.Client

    // 监控指标
    v1RequestCount  int64
    v2RequestCount  int64
    v1ErrorCount    int64
    v2ErrorCount    int64
    lastResetTime   time.Time
}

// NewRBACRoutingMiddleware 创建路由中间件
func NewRBACRoutingMiddleware(config *GrayscaleConfig, redisClient *redis.Client) *RBACRoutingMiddleware {
    return &RBACRoutingMiddleware{
        config:         config,
        redisClient:    redisClient,
        lastResetTime:  time.Now(),
    }
}

// Middleware Gin中间件函数
func (m *RBACRoutingMiddleware) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 检查是否启用灰度
        if !m.config.Enabled {
            c.Set("rbac_version", "v2")  // 默认使用v2
            c.Next()
            return
        }

        // 2. 获取用户ID
        userID, exists := c.Get("user_id")
        if !exists {
            c.Set("rbac_version", "v1")  // 未登录用户使用v1
            c.Next()
            return
        }

        uid := userID.(uint)

        // 3. 检查黑名单
        if m.isInBlacklist(uid) {
            c.Set("rbac_version", "v1")
            c.Next()
            return
        }

        // 4. 检查白名单
        if m.isInWhitelist(uid) {
            c.Set("rbac_version", "v2")
            m.v2RequestCount++
            c.Next()
            return
        }

        // 5. 根据路由策略决定版本
        version := m.routeUser(uid)
        c.Set("rbac_version", version)

        // 6. 记录指标
        if version == "v2" {
            m.v2RequestCount++
        } else {
            m.v1RequestCount++
        }

        // 7. 监控错误率
        defer m.monitorErrorRate(c, version)

        c.Next()
    }
}

// routeUser 路由用户到具体版本
func (m *RBACRoutingMiddleware) routeUser(userID uint) string {
    switch m.config.RoutingMethod {
    case "user_hash":
        return m.hashBasedRouting(userID)
    case "random":
        return m.randomRouting()
    case "whitelist":
        // 白名单已在上面处理
        return "v1"
    default:
        return m.hashBasedRouting(userID)
    }
}

// hashBasedRouting 基于用户ID哈希的路由
func (m *RBACRoutingMiddleware) hashBasedRouting(userID uint) string {
    // 使用MD5哈希确保分布均匀
    hash := md5.Sum([]byte(fmt.Sprintf("user_%d", userID)))
    hashValue := binary.BigEndian.Uint32(hash[:4])

    // 转换为0-100的百分比
    percentage := int(hashValue % 100)

    // 如果哈希值小于配置的百分比,路由到v2
    if percentage < m.config.Percentage {
        return "v2"
    }
    return "v1"
}

// randomRouting 随机路由
func (m *RBACRoutingMiddleware) randomRouting() string {
    // 使用时间戳的纳秒作为随机源
    nano := time.Now().UnixNano()
    if int(nano%100) < m.config.Percentage {
        return "v2"
    }
    return "v1"
}

// isInWhitelist 检查是否在白名单
func (m *RBACRoutingMiddleware) isInWhitelist(userID uint) bool {
    for _, id := range m.config.WhitelistUserIDs {
        if id == userID {
            return true
        }
    }
    return false
}

// isInBlacklist 检查是否在黑名单
func (m *RBACRoutingMiddleware) isInBlacklist(userID uint) bool {
    for _, id := range m.config.BlacklistUserIDs {
        if id == userID {
            return true
        }
    }
    return false
}

// monitorErrorRate 监控错误率
func (m *RBACRoutingMiddleware) monitorErrorRate(c *gin.Context, version string) {
    // 检查响应状态码
    statusCode := c.Writer.Status()

    // 5xx错误算作失败
    if statusCode >= 500 {
        if version == "v2" {
            m.v2ErrorCount++
        } else {
            m.v1ErrorCount++
        }
    }

    // 定期重置计数器
    if time.Since(m.lastResetTime) > m.config.MonitorWindow {
        m.checkAndRollback()
        m.resetCounters()
    }
}

// checkAndRollback 检查是否需要自动回滚
func (m *RBACRoutingMiddleware) checkAndRollback() {
    if !m.config.EnableAutoRollback {
        return
    }

    // 计算v2错误率
    if m.v2RequestCount == 0 {
        return
    }

    v2ErrorRate := float64(m.v2ErrorCount) / float64(m.v2RequestCount)

    // 计算v1错误率作为基线
    var v1ErrorRate float64
    if m.v1RequestCount > 0 {
        v1ErrorRate = float64(m.v1ErrorCount) / float64(m.v1RequestCount)
    }

    // 如果v2错误率显著高于v1,触发回滚
    if v2ErrorRate > m.config.ErrorThreshold && v2ErrorRate > v1ErrorRate*2 {
        log.Printf("[ALERT] V2错误率过高: %.2f%% (阈值: %.2f%%), 触发自动回滚!",
            v2ErrorRate*100, m.config.ErrorThreshold*100)

        // 禁用灰度
        m.config.Enabled = false

        // 发送告警
        m.sendAlert(fmt.Sprintf(
            "RBAC V2自动回滚触发\n"+
            "V2错误率: %.2f%%\n"+
            "V1错误率: %.2f%%\n"+
            "V2请求数: %d\n"+
            "V2错误数: %d",
            v2ErrorRate*100, v1ErrorRate*100, m.v2RequestCount, m.v2ErrorCount,
        ))
    }
}

// resetCounters 重置计数器
func (m *RBACRoutingMiddleware) resetCounters() {
    m.v1RequestCount = 0
    m.v2RequestCount = 0
    m.v1ErrorCount = 0
    m.v2ErrorCount = 0
    m.lastResetTime = time.Now()
}

// sendAlert 发送告警 (集成告警系统)
func (m *RBACRoutingMiddleware) sendAlert(message string) {
    // TODO: 集成钉钉/企业微信/邮件等告警渠道
    log.Printf("[ALERT] %s", message)
}

// GetMetrics 获取监控指标
func (m *RBACRoutingMiddleware) GetMetrics() map[string]interface{} {
    v1ErrorRate := 0.0
    if m.v1RequestCount > 0 {
        v1ErrorRate = float64(m.v1ErrorCount) / float64(m.v1RequestCount)
    }

    v2ErrorRate := 0.0
    if m.v2RequestCount > 0 {
        v2ErrorRate = float64(m.v2ErrorCount) / float64(m.v2RequestCount)
    }

    totalRequests := m.v1RequestCount + m.v2RequestCount
    v2Traffic := 0.0
    if totalRequests > 0 {
        v2Traffic = float64(m.v2RequestCount) / float64(totalRequests)
    }

    return map[string]interface{}{
        "grayscale_enabled":  m.config.Enabled,
        "target_percentage":  m.config.Percentage,
        "actual_v2_traffic":  v2Traffic * 100,
        "v1_request_count":   m.v1RequestCount,
        "v2_request_count":   m.v2RequestCount,
        "v1_error_count":     m.v1ErrorCount,
        "v2_error_count":     m.v2ErrorCount,
        "v1_error_rate":      v1ErrorRate * 100,
        "v2_error_rate":      v2ErrorRate * 100,
        "monitor_window_sec": m.config.MonitorWindow.Seconds(),
        "last_reset_time":    m.lastResetTime,
    }
}

// UpdateConfig 动态更新配置
func (m *RBACRoutingMiddleware) UpdateConfig(config *GrayscaleConfig) {
    m.config = config
    log.Printf("[INFO] 灰度配置已更新: percentage=%d%%, enabled=%v",
        config.Percentage, config.Enabled)
}
```

#### 7.2.2 权限服务适配器

```go
// 文件: services/permission_service_adapter.go
package services

import (
    "context"
    "fmt"
    "github.com/gin-gonic/gin"
)

// PermissionServiceAdapter 权限服务适配器
// 根据灰度配置路由到v1或v2
type PermissionServiceAdapter struct {
    v1Service UnifiedPermissionService  // 旧服务
    v2Service PermissionServiceV2       // 新服务
}

// NewPermissionServiceAdapter 创建适配器
func NewPermissionServiceAdapter(
    v1Service UnifiedPermissionService,
    v2Service PermissionServiceV2,
) *PermissionServiceAdapter {
    return &PermissionServiceAdapter{
        v1Service: v1Service,
        v2Service: v2Service,
    }
}

// CheckPermission 检查权限 (自动路由)
func (a *PermissionServiceAdapter) CheckPermission(
    c *gin.Context,
    userID uint,
    permissionCode string,
) (bool, error) {
    // 从context获取RBAC版本
    version, exists := c.Get("rbac_version")
    if !exists {
        version = "v2"  // 默认v2
    }

    ctx := c.Request.Context()

    if version == "v2" {
        // 使用新服务
        identity := a.getUserIdentity(c, userID)
        if identity == nil {
            return false, fmt.Errorf("无法获取用户身份")
        }

        result, err := a.v2Service.CheckPermission(ctx, identity, permissionCode)
        if err != nil {
            return false, err
        }
        return result.Allowed, nil
    } else {
        // 使用旧服务
        return a.v1Service.CheckUserPermission(ctx, userID, permissionCode)
    }
}

// CheckEnterpriseAccess 检查企业访问权限
func (a *PermissionServiceAdapter) CheckEnterpriseAccess(
    c *gin.Context,
    userID uint,
    enterpriseID uint,
) (bool, error) {
    version, _ := c.Get("rbac_version")
    ctx := c.Request.Context()

    if version == "v2" {
        // 使用新服务
        identity := a.getUserIdentity(c, userID)
        if identity == nil {
            return false, fmt.Errorf("无法获取用户身份")
        }

        return a.v2Service.CheckEnterpriseAccess(ctx, identity, enterpriseID)
    } else {
        // 使用旧服务
        resourceEnterpriseID := int(enterpriseID)
        allowed, _ := CheckEnterpriseAccess(c, &resourceEnterpriseID)
        return allowed, nil
    }
}

// getUserIdentity 从context构建UserIdentity
func (a *PermissionServiceAdapter) getUserIdentity(c *gin.Context, userID uint) UserIdentity {
    userType, _ := c.Get("user_type")
    role, _ := c.Get("role")
    enterpriseID, _ := c.Get("enterprise_id")

    if userType == "system" {
        return &SystemUserIdentity{
            UserID:   userID,
            RoleCode: role.(string),
            IsActive: true,
        }
    } else {
        var entID *uint
        if enterpriseID != nil {
            eid := enterpriseID.(uint)
            entID = &eid
        }

        return &EnterpriseUserIdentity{
            UserID:       userID,
            EnterpriseID: entID,
            RoleCodes:    []string{role.(string)},
            IsActive:     true,
        }
    }
}
```

### 7.3 灰度发布流程

#### 7.3.1 阶段1: Alpha测试 (10%流量)

```bash
#!/bin/bash
# 文件: scripts/grayscale/01_alpha_phase.sh
# 功能: 启动Alpha阶段灰度

echo "========================================="
echo "灰度发布 - Alpha阶段 (10%流量)"
echo "========================================="

# 1. 更新灰度配置
cat > /tmp/grayscale_config.json <<EOF
{
    "enabled": true,
    "percentage": 10,
    "routing_method": "user_hash",
    "whitelist_user_ids": [1, 2, 3],
    "blacklist_user_ids": [],
    "enable_auto_rollback": true,
    "error_threshold": 0.05,
    "monitor_window": "5m"
}
EOF

# 2. 通过API更新配置
curl -X POST "http://localhost:8080/api/v1/admin/grayscale/config" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d @/tmp/grayscale_config.json

echo "✅ Alpha阶段配置已更新"

# 3. 监控24小时
echo ""
echo "开始监控24小时..."
echo "监控面板: http://localhost:3000/grafana/d/rbac-grayscale"
echo ""
echo "⚠️  注意事项:"
echo "1. 密切关注错误率和响应时间"
echo "2. 如果V2错误率 > 5%,系统将自动回滚"
echo "3. 查看日志: tail -f /var/log/ai-project/backend.log | grep RBAC"
echo ""

# 4. 等待24小时后提示
sleep 86400  # 24小时

echo ""
echo "========================================="
echo "Alpha阶段24小时已结束"
echo "========================================="
echo "请检查以下指标:"
echo "1. V2错误率 < 5%"
echo "2. V2响应时间 < V1响应时间 * 1.2"
echo "3. 无用户投诉"
echo ""
echo "如果一切正常,执行: ./scripts/grayscale/02_beta_phase.sh"
echo "如果有问题,执行回滚: ./scripts/rollback/rollback.sh"
```

#### 7.3.2 阶段2: Beta测试 (50%流量)

```bash
#!/bin/bash
# 文件: scripts/grayscale/02_beta_phase.sh
# 功能: Beta阶段,流量提升到50%

echo "========================================="
echo "灰度发布 - Beta阶段 (50%流量)"
echo "========================================="

# 1. 检查Alpha阶段指标
echo "检查Alpha阶段指标..."
METRICS=$(curl -s "http://localhost:8080/api/v1/admin/grayscale/metrics" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

V2_ERROR_RATE=$(echo $METRICS | jq -r '.v2_error_rate')

if (( $(echo "$V2_ERROR_RATE > 5" | bc -l) )); then
    echo "❌ V2错误率过高: $V2_ERROR_RATE%, 不建议进入Beta阶段"
    exit 1
fi

echo "✅ Alpha阶段指标正常"

# 2. 更新配置到50%
cat > /tmp/grayscale_config.json <<EOF
{
    "enabled": true,
    "percentage": 50,
    "routing_method": "user_hash",
    "whitelist_user_ids": [1, 2, 3],
    "blacklist_user_ids": [],
    "enable_auto_rollback": true,
    "error_threshold": 0.03,
    "monitor_window": "5m"
}
EOF

curl -X POST "http://localhost:8080/api/v1/admin/grayscale/config" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d @/tmp/grayscale_config.json

echo "✅ Beta阶段配置已更新: 50%流量"

# 3. 监控48小时
echo ""
echo "开始监控48小时..."
sleep 172800  # 48小时

echo ""
echo "========================================="
echo "Beta阶段48小时已结束"
echo "========================================="
echo "如果一切正常,执行: ./scripts/grayscale/03_production_phase.sh"
```

#### 7.3.3 阶段3: 全量上线 (100%流量)

```bash
#!/bin/bash
# 文件: scripts/grayscale/03_production_phase.sh
# 功能: 全量上线

echo "========================================="
echo "灰度发布 - 全量上线 (100%流量)"
echo "========================================="

# 1. 最后一次指标检查
METRICS=$(curl -s "http://localhost:8080/api/v1/admin/grayscale/metrics" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

V2_ERROR_RATE=$(echo $METRICS | jq -r '.v2_error_rate')
V1_ERROR_RATE=$(echo $METRICS | jq -r '.v1_error_rate')

echo "V1错误率: $V1_ERROR_RATE%"
echo "V2错误率: $V2_ERROR_RATE%"

if (( $(echo "$V2_ERROR_RATE > $V1_ERROR_RATE * 1.5" | bc -l) )); then
    echo "❌ V2错误率显著高于V1,不建议全量上线"
    exit 1
fi

# 2. 更新配置到100%
cat > /tmp/grayscale_config.json <<EOF
{
    "enabled": false,
    "percentage": 100,
    "routing_method": "user_hash",
    "whitelist_user_ids": [],
    "blacklist_user_ids": [],
    "enable_auto_rollback": false,
    "error_threshold": 0.01,
    "monitor_window": "5m"
}
EOF

curl -X POST "http://localhost:8080/api/v1/admin/grayscale/config" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d @/tmp/grayscale_config.json

echo "✅ 已全量切换到RBAC V2"

# 3. 创建里程碑记录
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO rbac_migration_log (
    migration_batch,
    table_name,
    operation,
    status,
    completed_at
) VALUES (
    'rbac_v2_production',
    'ALL',
    'full_production',
    'completed',
    CURRENT_TIMESTAMP
);
EOF

echo ""
echo "========================================="
echo "🎉 RBAC V2已全量上线!"
echo "========================================="
echo ""
echo "后续步骤:"
echo "1. 继续监控1周,确保稳定"
echo "2. 1周后执行清理: ./scripts/cleanup/cleanup_old_tables.sh"
```

---

## 8. 回滚方案

### 8.1 回滚触发条件

自动或手动触发回滚的条件:

| 触发条件 | 严重程度 | 自动回滚 | 手动确认 |
|---------|---------|---------|---------|
| V2错误率 > 5% | 🔴 高 | ✅ 是 | ❌ 否 |
| V2错误率 > V1的2倍 | 🟡 中 | ✅ 是 | ❌ 否 |
| 数据一致性检查失败 | 🔴 高 | ✅ 是 | ❌ 否 |
| 关键业务功能异常 | 🔴 高 | ❌ 否 | ✅ 是 |
| 性能下降 > 50% | 🟡 中 | ❌ 否 | ✅ 是 |
| 用户投诉 > 10个/小时 | 🟡 中 | ❌ 否 | ✅ 是 |

### 8.2 回滚级别

#### Level 1: 流量回滚 (最快, 1分钟)

只需要关闭灰度开关,流量立即切回v1:

```bash
#!/bin/bash
# 文件: scripts/rollback/01_traffic_rollback.sh
# 功能: Level 1 - 流量回滚

echo "========================================="
echo "执行 Level 1 流量回滚"
echo "========================================="

# 禁用灰度
curl -X POST "http://localhost:8080/api/v1/admin/grayscale/config" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "enabled": false,
        "percentage": 0
    }'

echo "✅ 流量已全部切回V1"
echo "⏱️  耗时: ~1分钟"
echo ""
echo "说明: V2表和数据仍然存在,可以随时重新启用"
```

**优点**:
- 最快速,1分钟完成
- 无数据丢失
- 可随时恢复

**缺点**:
- V2表仍占用空间
- 如果V2有数据写入,需要同步回V1

#### Level 2: 数据回滚 (中等, 10-30分钟)

回滚V2写入的数据:

```bash
#!/bin/bash
# 文件: scripts/rollback/02_data_rollback.sh
# 功能: Level 2 - 数据回滚

echo "========================================="
echo "执行 Level 2 数据回滚"
echo "========================================="

# 1. 先执行流量回滚
./scripts/rollback/01_traffic_rollback.sh

# 2. 检查V2期间新增的数据
echo "检查V2新增数据..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
-- 统计V2期间的数据变更
SELECT
    'user_enterprise_roles' as table_name,
    COUNT(*) as new_records
FROM user_enterprise_roles
WHERE assigned_at > (
    SELECT completed_at FROM rbac_migration_log
    WHERE operation = 'migrate_enterprise_users'
    ORDER BY completed_at DESC LIMIT 1
)
UNION ALL
SELECT
    'user_permission_overrides',
    COUNT(*)
FROM user_permission_overrides
WHERE created_at > (
    SELECT completed_at FROM rbac_migration_log
    WHERE operation = 'migrate_custom_permissions'
    ORDER BY completed_at DESC LIMIT 1
);
EOF

# 3. 同步V2数据到V1
echo "同步V2数据回V1表..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
BEGIN;

-- 同步新增的角色分配
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT
    uer.user_id,
    r.id,
    uer.assigned_at
FROM user_enterprise_roles uer
INNER JOIN enterprise_roles er ON uer.role_id = er.id
INNER JOIN roles r ON r.role = er.role_code  -- 映射回旧角色
WHERE uer.assigned_at > (
    SELECT completed_at FROM rbac_migration_log
    WHERE operation = 'migrate_enterprise_users'
    ORDER BY completed_at DESC LIMIT 1
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 同步新增的权限覆盖
INSERT INTO user_permissions (user_id, permission_id, granted_at)
SELECT
    upo.user_id,
    p.id,
    upo.created_at
FROM user_permission_overrides upo
INNER JOIN permissions p ON p.code = (
    CASE upo.permission_type
        WHEN 'system' THEN (SELECT code FROM system_permissions WHERE id = upo.permission_id)
        WHEN 'enterprise' THEN (SELECT code FROM enterprise_permissions WHERE id = upo.permission_id)
    END
)
WHERE upo.created_at > (
    SELECT completed_at FROM rbac_migration_log
    WHERE operation = 'migrate_custom_permissions'
    ORDER BY completed_at DESC LIMIT 1
)
AND upo.grant_type = 'grant'
ON CONFLICT (user_id, permission_id) DO NOTHING;

COMMIT;
EOF

echo "✅ 数据回滚完成"
echo "⏱️  耗时: ~10-30分钟"
```

#### Level 3: 完全回滚 (最彻底, 1-2小时)

删除所有V2表和数据,完全恢复到迁移前:

```bash
#!/bin/bash
# 文件: scripts/rollback/03_full_rollback.sh
# 功能: Level 3 - 完全回滚

set -e

echo "========================================="
echo "执行 Level 3 完全回滚"
echo "========================================="
echo "⚠️  警告: 这将删除所有V2数据!"
echo ""

# 1. 二次确认
read -p "确认要完全回滚吗? 输入 'YES' 继续: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
    echo "❌ 回滚已取消"
    exit 1
fi

# 2. 执行Level 2回滚
./scripts/rollback/02_data_rollback.sh

# 3. 备份V2表数据 (以防万一)
echo "备份V2表数据..."
BACKUP_DIR="/var/backups/rbac-rollback-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
    --table=system_roles \
    --table=system_permissions \
    --table=system_role_permissions \
    --table=enterprise_roles \
    --table=enterprise_permissions \
    --table=enterprise_role_permissions \
    --table=user_enterprise_roles \
    --table=user_permission_overrides \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_DIR/v2_tables_backup.dump"

echo "✅ V2表已备份到: $BACKUP_DIR"

# 4. 删除V2表
echo "删除V2表..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
BEGIN;

-- 记录回滚操作
INSERT INTO rbac_migration_log (
    migration_batch,
    table_name,
    operation,
    status,
    started_at
) VALUES (
    'rbac_v2_rollback',
    'ALL',
    'full_rollback',
    'running',
    CURRENT_TIMESTAMP
);

-- 删除V2表 (级联删除所有数据和约束)
DROP TABLE IF EXISTS user_permission_overrides CASCADE;
DROP TABLE IF EXISTS user_enterprise_roles CASCADE;
DROP TABLE IF EXISTS enterprise_role_permissions CASCADE;
DROP TABLE IF EXISTS enterprise_permissions CASCADE;
DROP TABLE IF EXISTS enterprise_roles CASCADE;
DROP TABLE IF EXISTS system_role_permissions CASCADE;
DROP TABLE IF EXISTS system_permissions CASCADE;
DROP TABLE IF EXISTS system_roles CASCADE;

-- 记录完成
UPDATE rbac_migration_log
SET status = 'completed', completed_at = CURRENT_TIMESTAMP
WHERE migration_batch = 'rbac_v2_rollback'
AND operation = 'full_rollback';

COMMIT;
EOF

echo "✅ V2表已删除"

# 5. 清理Redis缓存
echo "清理Redis缓存..."
redis-cli -h $REDIS_HOST -p $REDIS_PORT --scan --pattern "rbac:v2:*" | xargs redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL

echo ""
echo "========================================="
echo "✅ 完全回滚完成!"
echo "========================================="
echo "⏱️  总耗时: ~1-2小时"
echo ""
echo "系统已完全恢复到迁移前状态"
echo "备份位置: $BACKUP_DIR"
```

### 8.3 紧急回滚流程

```bash
#!/bin/bash
# 文件: scripts/rollback/emergency_rollback.sh
# 功能: 紧急回滚 - 一键执行

echo "========================================="
echo "🚨 紧急回滚程序"
echo "========================================="
echo ""
echo "请选择回滚级别:"
echo "1) Level 1 - 流量回滚 (1分钟, 推荐)"
echo "2) Level 2 - 数据回滚 (10-30分钟)"
echo "3) Level 3 - 完全回滚 (1-2小时)"
echo ""
read -p "输入选项 [1-3]: " LEVEL

case $LEVEL in
    1)
        ./scripts/rollback/01_traffic_rollback.sh
        ;;
    2)
        ./scripts/rollback/02_data_rollback.sh
        ;;
    3)
        ./scripts/rollback/03_full_rollback.sh
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

# 发送告警通知
echo ""
echo "发送回滚通知..."
curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=$DINGTALK_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"msgtype\": \"text\",
        \"text\": {
            \"content\": \"🚨 RBAC系统已执行Level $LEVEL回滚\n时间: $(date)\n操作人: $USER\n原因: 待补充\"
        }
    }"

echo "✅ 回滚完成,通知已发送"
```

---

## 9. 故障场景处理

### 9.1 场景1: 迁移过程中断

**现象**: 迁移脚本执行到一半时失败或中断

**排查步骤**:

```bash
# 1. 查看迁移日志
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
SELECT
    migration_batch,
    table_name,
    operation,
    status,
    error_message,
    started_at,
    completed_at
FROM rbac_migration_log
WHERE status IN ('running', 'failed')
ORDER BY started_at DESC
LIMIT 20;
EOF

# 2. 检查未完成的事务
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
SELECT
    pid,
    usename,
    application_name,
    state,
    query,
    query_start
FROM pg_stat_activity
WHERE state != 'idle'
AND query LIKE '%rbac%';
EOF
```

**恢复方案**:

```bash
#!/bin/bash
# 文件: scripts/recovery/resume_migration.sh

echo "检查迁移状态..."
FAILED_OPS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "
    SELECT operation FROM rbac_migration_log
    WHERE status = 'failed'
    ORDER BY started_at DESC
")

if [ -z "$FAILED_OPS" ]; then
    echo "✅ 没有失败的操作"
    exit 0
fi

echo "发现失败的操作:"
echo "$FAILED_OPS"
echo ""

# 重置失败状态
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
UPDATE rbac_migration_log
SET status = 'pending'
WHERE status = 'failed';
EOF

# 从失败点继续
echo "从失败点继续迁移..."
# 根据具体失败的operation执行对应的SQL
```

### 9.2 场景2: 数据不一致

**现象**: 迁移后数据验证失败,V1和V2数据不一致

**排查步骤**:

```sql
-- 文件: scripts/troubleshooting/check_data_consistency.sql

-- 1. 比对用户角色数量
SELECT
    'user_roles_count_diff' as check_name,
    v1_count,
    v2_count,
    (v2_count - v1_count) as difference
FROM (
    SELECT
        (SELECT COUNT(*) FROM user_roles WHERE deleted_at IS NULL) as v1_count,
        (SELECT COUNT(*) FROM user_enterprise_roles) as v2_count
) t;

-- 2. 查找只在V1存在的用户角色
SELECT
    u.id as user_id,
    u.username,
    u.email,
    ur.role_id,
    r.role as role_name,
    'only_in_v1' as status
FROM user_roles ur
INNER JOIN users u ON ur.user_id = u.id
INNER JOIN roles r ON ur.role_id = r.id
WHERE ur.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM user_enterprise_roles uer
    WHERE uer.user_id = ur.user_id
);

-- 3. 查找只在V2存在的用户角色
SELECT
    u.id as user_id,
    u.username,
    u.email,
    uer.role_id,
    er.role_name,
    'only_in_v2' as status
FROM user_enterprise_roles uer
INNER JOIN users u ON uer.user_id = u.id
INNER JOIN enterprise_roles er ON uer.role_id = er.id
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = uer.user_id
    AND ur.deleted_at IS NULL
);
```

**修复方案**:

```sql
-- 文件: scripts/recovery/fix_data_inconsistency.sql

BEGIN;

-- 补充缺失的V2数据
INSERT INTO user_enterprise_roles (user_id, enterprise_id, role_id, is_primary, assigned_at)
SELECT
    ur.user_id,
    eu.enterprise_id,
    er.id as role_id,
    TRUE,
    ur.assigned_at
FROM user_roles ur
INNER JOIN users u ON ur.user_id = u.id
INNER JOIN enterprise_users eu ON eu.user_id = u.id
INNER JOIN roles r ON ur.role_id = r.id
INNER JOIN enterprise_roles er ON er.role_code = r.role
    AND er.enterprise_id = eu.enterprise_id
WHERE ur.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM user_enterprise_roles uer
    WHERE uer.user_id = ur.user_id
    AND uer.enterprise_id = eu.enterprise_id
)
ON CONFLICT (user_id, enterprise_id, role_id) DO NOTHING;

COMMIT;
```

### 9.3 场景3: 性能问题

**现象**: V2权限检查性能显著低于V1

**排查步骤**:

```sql
-- 1. 检查慢查询
SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%system_roles%'
   OR query LIKE '%enterprise_roles%'
   OR query LIKE '%user_enterprise_roles%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. 检查索引使用情况
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN (
    'system_roles',
    'enterprise_roles',
    'user_enterprise_roles',
    'system_permissions',
    'enterprise_permissions'
)
ORDER BY idx_scan ASC;

-- 3. 检查表大小和膨胀
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
WHERE tablename IN (
    'system_roles',
    'enterprise_roles',
    'user_enterprise_roles'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**优化方案**:

```sql
-- 文件: scripts/optimization/optimize_performance.sql

-- 1. 创建缺失的索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_ent_roles_lookup
ON user_enterprise_roles (user_id, enterprise_id, is_primary)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enterprise_roles_lookup
ON enterprise_roles (enterprise_id, role_code, is_active)
WHERE deleted_at IS NULL;

-- 2. 更新统计信息
ANALYZE system_roles;
ANALYZE system_permissions;
ANALYZE enterprise_roles;
ANALYZE enterprise_permissions;
ANALYZE user_enterprise_roles;

-- 3. 重建膨胀严重的索引
REINDEX TABLE CONCURRENTLY user_enterprise_roles;

-- 4. 清理死元组
VACUUM ANALYZE user_enterprise_roles;
```

---

## 10. 监控和告警

### 10.1 关键指标

| 指标 | 目标值 | 告警阈值 | 严重程度 |
|-----|--------|---------|---------|
| V2错误率 | < 1% | > 5% | 🔴 高 |
| V2响应时间 | < 10ms | > 50ms | 🟡 中 |
| V2缓存命中率 | > 90% | < 70% | 🟡 中 |
| 数据一致性 | 100% | < 99% | 🔴 高 |
| V2流量比例 | 按阶段 | 偏差>10% | 🟢 低 |
| 数据库连接数 | < 80% | > 90% | 🟡 中 |

### 10.2 Grafana Dashboard

```yaml
# 文件: monitoring/grafana/rbac_migration_dashboard.json
# RBAC迁移监控面板

apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090

dashboards:
  - title: "RBAC Migration Overview"
    panels:
      - title: "Traffic Distribution"
        type: "pie"
        targets:
          - expr: "sum(rbac_requests_total{version='v1'})"
            legendFormat: "V1"
          - expr: "sum(rbac_requests_total{version='v2'})"
            legendFormat: "V2"

      - title: "Error Rate"
        type: "graph"
        targets:
          - expr: "rate(rbac_errors_total{version='v1'}[5m])"
            legendFormat: "V1 Error Rate"
          - expr: "rate(rbac_errors_total{version='v2'}[5m])"
            legendFormat: "V2 Error Rate"

      - title: "Response Time"
        type: "graph"
        targets:
          - expr: "histogram_quantile(0.95, rate(rbac_request_duration_seconds_bucket{version='v1'}[5m]))"
            legendFormat: "V1 P95"
          - expr: "histogram_quantile(0.95, rate(rbac_request_duration_seconds_bucket{version='v2'}[5m]))"
            legendFormat: "V2 P95"

      - title: "Cache Hit Rate"
        type: "graph"
        targets:
          - expr: "rate(rbac_cache_hits_total[5m]) / rate(rbac_cache_requests_total[5m])"
            legendFormat: "Hit Rate"
```

### 10.3 告警规则

```yaml
# 文件: monitoring/prometheus/rbac_alerts.yml
# RBAC告警规则

groups:
  - name: rbac_migration
    interval: 30s
    rules:
      # 高错误率告警
      - alert: RBACHighErrorRate
        expr: rate(rbac_errors_total{version="v2"}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "RBAC V2错误率过高"
          description: "V2错误率: {{ $value | humanizePercentage }}"

      # 性能下降告警
      - alert: RBACSlowResponse
        expr: histogram_quantile(0.95, rate(rbac_request_duration_seconds_bucket{version="v2"}[5m])) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "RBAC V2响应时间过长"
          description: "P95响应时间: {{ $value }}s"

      # 缓存命中率低告警
      - alert: RBACLowCacheHitRate
        expr: rate(rbac_cache_hits_total[5m]) / rate(rbac_cache_requests_total[5m]) < 0.7
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "RBAC缓存命中率低"
          description: "命中率: {{ $value | humanizePercentage }}"

      # 数据不一致告警
      - alert: RBACDataInconsistency
        expr: rbac_data_consistency_check_failures_total > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "RBAC数据一致性检查失败"
          description: "失败次数: {{ $value }}"
```

---

## 11. 文档总结

本文档(第2部分)涵盖了RBAC权限系统迁移的以下内容:

1. **灰度发布方案**:
   - 流量路由架构
   - 路由中间件实现
   - 三阶段灰度流程 (10% → 50% → 100%)

2. **回滚方案**:
   - 三级回滚方案 (流量/数据/完全)
   - 紧急回滚流程
   - 回滚触发条件

3. **故障场景处理**:
   - 迁移中断恢复
   - 数据不一致修复
   - 性能问题优化

4. **监控和告警**:
   - 关键指标定义
   - Grafana监控面板
   - Prometheus告警规则

**完整迁移文档清单**:
- ✅ RBAC_REFACTORING_PROPOSAL.md - 重构提案
- ✅ RBAC_PROTOTYPE_DESIGN.md - 原型设计
- ✅ RBAC_DEVELOPMENT_PLAN.md - 开发计划
- ✅ RBAC_MIGRATION_PLAN_PART1.md - 数据迁移方案
- ✅ RBAC_MIGRATION_PLAN_PART2.md - 回滚方案与灰度发布

**项目准备度**:
- 设计文档: ✅ 完成
- 开发计划: ✅ 完成
- 迁移方案: ✅ 完成
- 回滚方案: ✅ 完成
- **状态**: 可以开始开发

---

**文档状态**: ✅ 完成
**审阅日期**: 待定
**批准状态**: 待批准
