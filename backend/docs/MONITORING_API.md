# Worktree Monitoring API Documentation

**Phase 6: System Monitoring, Resource Management, Health Checks**

## Overview

The Worktree Monitoring system provides comprehensive monitoring, health checking, and resource analysis capabilities for the Git Worktree infrastructure. This system enables proactive management of worktrees through metrics collection, alert generation, and health status reporting.

## Architecture

### Components

1. **WorktreeMonitoringService** - Core monitoring logic with caching
2. **WorktreeMonitoringHandler** - HTTP API endpoints
3. **Monitoring Routes** - RESTful API registration

### Key Features

- Real-time system metrics collection
- Configurable alert thresholds
- Health status assessment with scoring
- Resource usage analysis per worktree
- Intelligent caching (5-minute expiration)
- Automatic recommendations generation

---

## API Endpoints

### Base URL
```
/api/v1/monitoring
```

All endpoints require authentication via Bearer token.

---

## 1. System Metrics

### Get System Metrics

Collect comprehensive system-wide metrics about all worktrees.

**Endpoint:** `GET /api/v1/monitoring/metrics`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_worktrees": 15,
    "active_worktrees": 8,
    "idle_worktrees": 5,
    "error_worktrees": 1,
    "locked_worktrees": 1,
    "worktrees_by_status": {
      "active": 8,
      "idle": 5,
      "error": 1,
      "locked": 1
    },
    "worktrees_by_project": {
      "1": 10,
      "2": 5
    },
    "total_disk_usage_mb": 2048.5,
    "average_disk_usage_mb": 136.6,
    "max_disk_usage_mb": 512.0,
    "total_bindings": 15,
    "active_bindings": 8,
    "bindings_per_worktree": 1.0,
    "worktrees_with_conflicts": 2,
    "total_conflicts": 3,
    "collected_at": "2025-01-14T10:30:00Z",
    "collection_duration": "1.2s"
  }
}
```

**Metrics Explanation:**

- `total_worktrees` - Total number of worktrees in the system
- `active_worktrees` - Worktrees currently in use
- `idle_worktrees` - Worktrees not actively being used
- `error_worktrees` - Worktrees in error state
- `locked_worktrees` - Worktrees that are locked
- `worktrees_by_status` - Breakdown by status
- `worktrees_by_project` - Distribution across projects
- `total_disk_usage_mb` - Total disk space used (MB)
- `average_disk_usage_mb` - Average per worktree
- `max_disk_usage_mb` - Largest worktree size
- `total_bindings` - Total task-worktree bindings
- `active_bindings` - Active bindings
- `bindings_per_worktree` - Average bindings per worktree
- `worktrees_with_conflicts` - Count with detected conflicts
- `total_conflicts` - Total conflict count
- `collected_at` - Collection timestamp
- `collection_duration` - Time taken to collect metrics

**Caching:**
- Metrics are cached for 5 minutes
- Use `POST /api/v1/monitoring/cache/invalidate` to force refresh

---

## 2. Health Check

### System Health Check

Comprehensive health assessment with scoring and recommendations.

**Endpoint:** `GET /api/v1/monitoring/health`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "score": 0.85,
    "metrics": { /* Same as /metrics endpoint */ },
    "alerts": [
      {
        "level": "warning",
        "type": "performance",
        "message": "Too many idle worktrees",
        "details": "Consider reclaiming idle worktrees to free resources",
        "threshold": "10",
        "current_value": "12",
        "timestamp": "2025-01-14T10:30:00Z"
      }
    ],
    "recommendations": [
      "运行工作空间回收程序释放闲置资源",
      "考虑删除不再需要的worktrees或增加资源限制"
    ],
    "checked_at": "2025-01-14T10:30:00Z",
    "components": {
      "database": "healthy",
      "storage": "healthy"
    }
  }
}
```

**Health Status Values:**

- `healthy` - Score >= 0.8, all systems operational
- `degraded` - Score 0.5-0.8, some issues detected
- `unhealthy` - Score < 0.5, critical issues

**Health Score Calculation:**

Starting from 1.0, deductions:
- Critical alert: -0.25
- Error alert: -0.15
- Warning alert: -0.05
- Database unavailable: -0.3
- Storage unavailable: -0.3

**Alert Levels:**

- `info` - Informational, no action needed
- `warning` - Should be addressed soon
- `error` - Requires attention
- `critical` - Requires immediate action

**Alert Types:**

- `resource` - Resource usage issues
- `conflict` - Conflict-related issues
- `performance` - Performance problems
- `health` - System health issues

**HTTP Status Codes:**

- `200 OK` - Healthy or degraded
- `503 Service Unavailable` - Unhealthy

---

## 3. Simple Health Check

### Quick Ping

Fast health check for load balancers and monitoring systems.

**Endpoint:** `GET /api/v1/monitoring/ping`

**Response:**
```json
{
  "status": "ok",
  "timestamp": {
    "server_time": "now"
  }
}
```

**Use Case:**
- Load balancer health checks
- Uptime monitoring
- Quick availability verification

---

## 4. Resource Analysis

### Analyze Worktree Resources

Detailed resource usage analysis for individual worktrees.

**Endpoint:** `GET /api/v1/monitoring/resources`

**Query Parameters:**
- `project_id` (optional) - Filter by project ID

**Request:**
```
GET /api/v1/monitoring/resources?project_id=1
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "worktree_id": 1,
      "name": "feature-auth",
      "path": "/var/ai-proj-worktrees/wt-1",
      "disk_usage_mb": 256.5,
      "file_count": 1543,
      "last_access_time": "2025-01-14T09:00:00Z",
      "status": "active",
      "idle_duration": "1h30m"
    },
    {
      "worktree_id": 2,
      "name": "bugfix-login",
      "path": "/var/ai-proj-worktrees/wt-2",
      "disk_usage_mb": 128.3,
      "file_count": 892,
      "last_access_time": "2025-01-13T15:00:00Z",
      "status": "idle",
      "idle_duration": "19h30m"
    }
  ]
}
```

**Resource Info Fields:**

- `worktree_id` - Unique identifier
- `name` - Worktree name
- `path` - File system path
- `disk_usage_mb` - Disk space used (MB)
- `file_count` - Total number of files
- `last_access_time` - Last activity timestamp
- `status` - Current status
- `idle_duration` - Time since last activity

**Use Cases:**
- Identify large worktrees for cleanup
- Find idle worktrees for reclamation
- Analyze resource distribution
- Capacity planning

---

## 5. Alert Configuration

### Get Alert Thresholds

Retrieve current alert threshold configuration.

**Endpoint:** `GET /api/v1/monitoring/thresholds`

**Response:**
```json
{
  "success": true,
  "data": {
    "max_worktrees": 50,
    "max_disk_usage_gb": 100.0,
    "max_idle_worktrees": 10,
    "max_conflict_rate": 0.3,
    "max_error_worktrees": 3
  }
}
```

### Update Alert Thresholds

Modify alert threshold configuration.

**Endpoint:** `PUT /api/v1/monitoring/thresholds`

**Request Body:**
```json
{
  "max_worktrees": 75,
  "max_disk_usage_gb": 150.0,
  "max_idle_worktrees": 15,
  "max_conflict_rate": 0.4,
  "max_error_worktrees": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert thresholds updated successfully",
  "data": {
    "max_worktrees": 75,
    "max_disk_usage_gb": 150.0,
    "max_idle_worktrees": 15,
    "max_conflict_rate": 0.4,
    "max_error_worktrees": 5
  }
}
```

**Threshold Parameters:**

- `max_worktrees` - Maximum allowed worktrees (default: 50)
- `max_disk_usage_gb` - Maximum total disk usage in GB (default: 100.0)
- `max_idle_worktrees` - Maximum idle worktrees (default: 10)
- `max_conflict_rate` - Maximum conflict rate 0.0-1.0 (default: 0.3)
- `max_error_worktrees` - Maximum error worktrees (default: 3)

---

## 6. Cache Management

### Invalidate Metrics Cache

Force refresh of cached metrics.

**Endpoint:** `POST /api/v1/monitoring/cache/invalidate`

**Response:**
```json
{
  "success": true,
  "message": "Metrics cache invalidated successfully"
}
```

**When to Use:**
- After bulk worktree operations
- When real-time data is critical
- For debugging purposes

---

## Integration Examples

### 1. Dashboard Monitoring

```javascript
// Fetch health status every 30 seconds
async function monitorHealth() {
  try {
    const response = await fetch('/api/v1/monitoring/health', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const { data } = await response.json();

    // Update UI
    updateHealthIndicator(data.status, data.score);
    displayAlerts(data.alerts);
    showRecommendations(data.recommendations);

  } catch (error) {
    console.error('Health check failed:', error);
  }
}

setInterval(monitorHealth, 30000);
```

### 2. Resource Cleanup Automation

```javascript
// Find and cleanup idle worktrees
async function cleanupIdleWorktrees() {
  const response = await fetch('/api/v1/monitoring/resources', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data: resources } = await response.json();

  // Find worktrees idle > 24 hours
  const idleThreshold = 24 * 60 * 60 * 1000; // 24 hours in ms
  const idleWorktrees = resources.filter(wt =>
    wt.status === 'idle' &&
    parseDuration(wt.idle_duration) > idleThreshold
  );

  // Reclaim idle worktrees
  for (const wt of idleWorktrees) {
    await reclaimWorktree(wt.worktree_id);
  }
}
```

### 3. Alert Monitoring

```javascript
// Check for critical alerts
async function checkCriticalAlerts() {
  const response = await fetch('/api/v1/monitoring/health', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data } = await response.json();

  const criticalAlerts = data.alerts.filter(a => a.level === 'critical');

  if (criticalAlerts.length > 0) {
    // Send notifications
    await sendSlackAlert({
      text: `🚨 ${criticalAlerts.length} critical worktree alerts`,
      alerts: criticalAlerts
    });
  }
}
```

### 4. Capacity Planning

```javascript
// Analyze disk usage trends
async function analyzeDiskUsage() {
  const response = await fetch('/api/v1/monitoring/metrics', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data: metrics } = await response.json();

  const usagePercentage =
    (metrics.total_disk_usage_mb / 1024) / metrics.max_disk_usage_gb * 100;

  if (usagePercentage > 80) {
    console.warn(`Disk usage at ${usagePercentage.toFixed(1)}%`);
    // Trigger cleanup or alert
  }
}
```

---

## Best Practices

### 1. Monitoring Frequency

- **Health checks**: Every 30-60 seconds for critical systems
- **Metrics collection**: Every 5-10 minutes (respects cache)
- **Resource analysis**: On-demand or daily for reports

### 2. Alert Response

**Critical Alerts** - Respond immediately:
- Database connection failures
- Storage unavailable
- High error worktree count

**Warning Alerts** - Address within 1-2 hours:
- Too many idle worktrees
- High conflict rate
- Approaching disk limits

### 3. Threshold Tuning

Start with defaults, then adjust based on:
- Project size and team size
- Available resources
- Historical usage patterns

### 4. Cache Management

- Let cache expire naturally (5 min) for most operations
- Invalidate after batch operations
- Invalidate before critical capacity decisions

### 5. Integration Tips

```javascript
// Good: Respect cache and rate limits
const healthData = await fetchWithCache('/api/v1/monitoring/health', {
  cacheTime: 30000 // 30 seconds
});

// Bad: Hammering the API
setInterval(() => {
  fetch('/api/v1/monitoring/health'); // Every second - too frequent!
}, 1000);
```

---

## Error Handling

### Common Errors

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "failed to collect metrics: database connection lost"
}
```

**400 Bad Request**
```json
{
  "success": false,
  "error": "invalid request body: max_worktrees must be positive"
}
```

**401 Unauthorized**
```json
{
  "error": "unauthorized"
}
```

### Error Recovery

```javascript
async function robustHealthCheck() {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch('/api/v1/monitoring/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      retries++;
      if (retries === maxRetries) {
        // Fallback to degraded mode
        return { status: 'degraded', error: error.message };
      }
      await sleep(1000 * retries); // Exponential backoff
    }
  }
}
```

---

## Performance Considerations

### Caching Strategy

The monitoring service uses a 5-minute cache for metrics:
- First request: Collects from database (~1-2 seconds)
- Subsequent requests: Returns cached data (~10ms)
- Cache invalidation: Manual or automatic after 5 minutes

### Resource Usage

**CollectSystemMetrics:**
- Database queries: 2-3
- File system scans: One per worktree
- Time complexity: O(n) where n = worktree count
- Memory: ~10KB per worktree

**CheckSystemHealth:**
- Includes metric collection
- Additional: Health calculations, alert generation
- Recommended frequency: Every 30-60 seconds

**AnalyzeWorktreeResources:**
- Expensive operation (file system walks)
- Use sparingly for large worktree counts
- Consider pagination or filtering

---

## Monitoring Metrics Reference

### Key Performance Indicators (KPIs)

1. **System Health Score** - Overall health (0.0-1.0)
   - Target: > 0.8
   - Warning: 0.5-0.8
   - Critical: < 0.5

2. **Active Worktree Ratio** - active_worktrees / total_worktrees
   - Target: > 0.5
   - Indicates resource utilization

3. **Idle Worktree Count**
   - Target: < max_idle_worktrees
   - Reclaim candidates

4. **Disk Usage Rate** - total_disk_usage_mb / max_disk_usage_gb
   - Target: < 80%
   - Plan expansion > 90%

5. **Conflict Rate** - worktrees_with_conflicts / total_worktrees
   - Target: < max_conflict_rate
   - Indicates code quality issues

6. **Error Rate** - error_worktrees / total_worktrees
   - Target: < 5%
   - Indicates system stability

---

## Troubleshooting

### Problem: Metrics show 0 worktrees

**Solution:**
```bash
# Check database connection
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/monitoring/health

# Verify worktrees exist
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/worktrees
```

### Problem: High disk usage alert

**Solution:**
```bash
# Analyze resource usage
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/monitoring/resources | jq '.data | sort_by(.disk_usage_mb) | reverse'

# Reclaim large idle worktrees
```

### Problem: Stale metrics

**Solution:**
```bash
# Invalidate cache
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/monitoring/cache/invalidate

# Verify fresh data
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/monitoring/metrics
```

---

## Security Considerations

1. **Authentication Required** - All endpoints require JWT token
2. **Rate Limiting** - Consider implementing rate limits for monitoring endpoints
3. **Sensitive Data** - Metrics don't expose sensitive file contents
4. **Cache Security** - Cache is per-service instance, not shared
5. **Audit Logging** - Configuration changes should be logged

---

## Future Enhancements

- Historical metrics storage
- Trend analysis and predictions
- Automated cleanup based on rules
- Webhook notifications for alerts
- Grafana/Prometheus integration
- Per-project monitoring
- Custom alert rules engine

---

## Support

For issues or questions:
- Backend issues: Check `backend/services/worktree_monitoring_service.go`
- API issues: Check `backend/handlers/worktree_monitoring_handler.go`
- Route configuration: Check `backend/routes/monitoring_routes.go`
