# Daily Focus Tasks API 规范

## 概述

今日主要任务API提供用户管理每日重点任务的功能，支持标记、排序、智能推荐等特性。

## Base URL
```
/api/v1/daily-focus-tasks
```

## 认证

所有接口都需要JWT认证，通过Authorization header传递：
```
Authorization: Bearer <jwt_token>
```

## 数据模型

### DailyFocusTask

```json
{
  "id": 123,
  "task_id": 456,
  "user_id": 789,
  "project_id": 1,
  "focus_date": "2025-09-13",
  "sort_order": 1,
  "priority_level": "high",
  "is_auto_suggested": false,
  "suggestion_reason": "manual",
  "suggestion_score": 0.0,
  "status": "active",
  "completed_at": null,
  "carried_from_date": null,
  "user_notes": "重要功能开发",
  "estimated_duration_minutes": 120,
  "created_at": "2025-09-13T08:00:00Z",
  "updated_at": "2025-09-13T08:00:00Z",
  "created_by": 789,
  
  // 关联的任务信息
  "task": {
    "id": 456,
    "title": "实现用户认证功能",
    "description": "完成JWT认证和权限控制",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2025-09-15",
    "assignee_id": 789
  },
  
  // 关联的项目信息
  "project": {
    "id": 1,
    "name": "AI项目后端",
    "code": "ai-backend"
  }
}
```

### 枚举值

**priority_level**:
- `low` - 低优先级
- `medium` - 中优先级  
- `high` - 高优先级

**status**:
- `active` - 激活状态
- `completed` - 已完成
- `removed` - 已移除
- `carried_over` - 延续任务

**suggestion_reason**:
- `manual` - 手动添加
- `deadline_today` - 今日截止
- `deadline_approaching` - 截止日期临近
- `high_priority` - 高优先级
- `overdue` - 已逾期
- `suggested` - 系统推荐

## API接口

### 1. 获取今日主要任务列表

**GET** `/api/v1/daily-focus-tasks`

**查询参数**:
- `date` (可选): 指定日期，格式 YYYY-MM-DD，默认为今天
- `status` (可选): 过滤状态 (`active`, `completed`, `removed`)
- `include_suggestions` (可选): 是否包含智能推荐，默认 `false`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "focus_date": "2025-09-13",
    "total_count": 5,
    "active_count": 3,
    "completed_count": 2,
    "estimated_total_minutes": 450,
    "tasks": [
      {
        "id": 123,
        "task_id": 456,
        "sort_order": 1,
        "priority_level": "high",
        "status": "active",
        "estimated_duration_minutes": 120,
        "task": {
          "title": "实现用户认证功能",
          "status": "in_progress"
        }
      }
    ],
    "suggestions": [
      {
        "task_id": 789,
        "suggestion_reason": "deadline_today",
        "suggestion_score": 0.95,
        "task": {
          "title": "修复支付模块Bug",
          "due_date": "2025-09-13"
        }
      }
    ]
  }
}
```

### 2. 添加今日主要任务

**POST** `/api/v1/daily-focus-tasks`

**请求体**:
```json
{
  "task_id": 456,
  "priority_level": "high",
  "estimated_duration_minutes": 120,
  "user_notes": "今天必须完成",
  "focus_date": "2025-09-13"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "task_id": 456,
    "sort_order": 3,
    "status": "active",
    "message": "任务已添加到今日主要任务"
  }
}
```

### 3. 更新今日主要任务

**PUT** `/api/v1/daily-focus-tasks/:id`

**请求体**:
```json
{
  "priority_level": "medium",
  "estimated_duration_minutes": 90,
  "user_notes": "更新预估时间"
}
```

### 4. 删除今日主要任务

**DELETE** `/api/v1/daily-focus-tasks/:id`

**响应示例**:
```json
{
  "success": true,
  "message": "已从今日主要任务中移除"
}
```

### 5. 批量更新排序

**PATCH** `/api/v1/daily-focus-tasks/reorder`

**请求体**:
```json
{
  "reorder_items": [
    {"id": 123, "sort_order": 1},
    {"id": 124, "sort_order": 2},
    {"id": 125, "sort_order": 3}
  ]
}
```

### 6. 获取智能推荐

**GET** `/api/v1/daily-focus-tasks/suggestions`

**查询参数**:
- `limit` (可选): 推荐数量限制，默认5
- `date` (可选): 指定日期，默认今天

**响应示例**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "task_id": 789,
        "suggestion_reason": "deadline_today",
        "suggestion_score": 0.95,
        "estimated_duration_minutes": 60,
        "task": {
          "id": 789,
          "title": "修复支付模块Bug",
          "priority": "high",
          "due_date": "2025-09-13"
        }
      }
    ]
  }
}
```

### 7. 批量采用推荐

**POST** `/api/v1/daily-focus-tasks/accept-suggestions`

**请求体**:
```json
{
  "task_ids": [789, 790, 791],
  "focus_date": "2025-09-13"
}
```

### 8. 延续未完成任务

**POST** `/api/v1/daily-focus-tasks/carry-over`

**请求体**:
```json
{
  "from_date": "2025-09-12",
  "to_date": "2025-09-13",
  "task_ids": [123, 124]
}
```

### 9. 标记任务完成

**PATCH** `/api/v1/daily-focus-tasks/:id/complete`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "completed",
    "completed_at": "2025-09-13T15:30:00Z"
  }
}
```

### 10. 获取历史统计

**GET** `/api/v1/daily-focus-tasks/statistics`

**查询参数**:
- `start_date`: 开始日期
- `end_date`: 结束日期
- `period` (可选): 统计周期 (`daily`, `weekly`, `monthly`)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "weekly",
    "total_focus_tasks": 35,
    "completed_tasks": 28,
    "completion_rate": 0.8,
    "avg_daily_tasks": 5,
    "avg_completion_time_minutes": 95,
    "daily_stats": [
      {
        "date": "2025-09-13",
        "total": 5,
        "completed": 4,
        "completion_rate": 0.8
      }
    ]
  }
}
```

## 错误处理

### 标准错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "指定的任务不存在",
    "details": {
      "task_id": 456
    }
  }
}
```

### 错误代码

- `TASK_NOT_FOUND` - 任务不存在
- `TASK_ALREADY_FOCUSED` - 任务已在今日主要任务中
- `INVALID_DATE_FORMAT` - 日期格式错误
- `PERMISSION_DENIED` - 权限不足
- `DAILY_LIMIT_EXCEEDED` - 超过每日推荐任务数量限制
- `INVALID_PRIORITY_LEVEL` - 无效的优先级
- `TASK_NOT_ASSIGNED` - 任务未分配给当前用户

## 业务规则

1. **权限控制**: 用户只能管理分配给自己的任务
2. **企业隔离**: 不同企业的数据完全隔离
3. **日期限制**: 只能管理当天和未来7天内的主要任务
4. **数量限制**: 建议每日主要任务不超过10个（软限制）
5. **自动同步**: 任务状态变更时自动同步今日主要任务状态
6. **历史清理**: 30天前的已完成/已移除记录自动清理

## 性能考虑

- 今日主要任务数据使用Redis缓存
- 智能推荐结果缓存30分钟
- 分页查询支持，默认每页20条
- 数据库查询优化，使用合适的索引

## WebSocket 事件

支持实时推送今日主要任务状态变化：

```javascript
// 监听事件
socket.on('daily_focus_task_updated', (data) => {
  console.log('任务状态更新:', data);
});

// 事件数据格式
{
  "event": "daily_focus_task_updated",
  "data": {
    "action": "completed", // created, updated, completed, removed
    "task_id": 123,
    "user_id": 789,
    "focus_date": "2025-09-13"
  }
}
```