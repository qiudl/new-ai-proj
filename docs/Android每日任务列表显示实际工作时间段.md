# Android每日任务列表显示实际工作时间段

## 问题描述

当前Android统计页面的每日任务列表显示 "00:00-00:00" 的无效时间。用户期望看到的是任务从启动计时器到停止计时器的实际工作时间段，例如 "09:30-12:00"。

## 当前状态

### 已完成的工作
1. ✅ 后端创建了新的API处理函数 `GetDailyTasksWithTimers`
2. ✅ 添加了路由 `GET /api/v1/dashboard/daily-tasks?date=YYYY-MM-DD`
3. ✅ API返回任务及其关联的timer_logs数据，时间格式为 "HH:MM"

### 待完成的工作

## 实现方案

### 1. 后端改动（已部分完成）

#### 文件：`backend/handlers/dashboard_handler.go`

**已添加的数据结构：**
```go
type TaskWithTimerLogs struct {
    ID          int             `json:"id"`
    ProjectID   int             `json:"project_id"`
    ProjectName string          `json:"project_name"`
    Title       string          `json:"title"`
    Status      string          `json:"status"`
    Priority    string          `json:"priority"`
    WorkHours   float64         `json:"work_hours"`
    TimerLogs   []TimerLogEntry `json:"timer_logs"`
    CreatedAt   string          `json:"created_at"`
    UpdatedAt   string          `json:"updated_at"`
}

type TimerLogEntry struct {
    ID                int     `json:"id"`
    StartTime         string  `json:"start_time"`    // "09:30"
    EndTime           *string `json:"end_time"`      // "12:00"
    ActualWorkSeconds int     `json:"actual_work_seconds"`
    Status            string  `json:"status"`
}
```

**API端点：**
- URL: `GET /api/v1/dashboard/daily-tasks?date=2025-02-05`
- 响应格式：
```json
{
  "success": true,
  "data": {
    "date": "2025-02-05",
    "count": 3,
    "tasks": [
      {
        "id": 2905,
        "project_id": 1,
        "project_name": "ai-proj",
        "title": "任务标题",
        "status": "completed",
        "priority": "high",
        "work_hours": 1.23,
        "timer_logs": [
          {
            "id": 123,
            "start_time": "09:30",
            "end_time": "10:30",
            "actual_work_seconds": 3600,
            "status": "completed"
          },
          {
            "id": 124,
            "start_time": "14:00",
            "end_time": "15:00",
            "actual_work_seconds": 3600,
            "status": "completed"
          }
        ],
        "created_at": "2025-02-05T08:15:04Z",
        "updated_at": "2025-02-05T10:30:00Z"
      }
    ]
  }
}
```

**待完成：**
- [ ] 编译并测试后端API
- [ ] 验证timer_logs数据返回正确

### 2. Android端改动

#### 2.1 创建新的数据模型

**文件：** `android-app/app/src/main/java/com/aiproj/mobile/data/models/TaskWithTimerLogs.kt`

```kotlin
package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

data class TaskWithTimerLogs(
    @SerializedName("id")
    val id: Int,

    @SerializedName("project_id")
    val projectId: Int,

    @SerializedName("project_name")
    val projectName: String,

    @SerializedName("title")
    val title: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("priority")
    val priority: String,

    @SerializedName("work_hours")
    val workHours: Float,

    @SerializedName("timer_logs")
    val timerLogs: List<TimerLogEntry>,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String
)

data class TimerLogEntry(
    @SerializedName("id")
    val id: Int,

    @SerializedName("start_time")
    val startTime: String,      // "09:30"

    @SerializedName("end_time")
    val endTime: String?,       // "12:00"

    @SerializedName("actual_work_seconds")
    val actualWorkSeconds: Int,

    @SerializedName("status")
    val status: String
)

data class DailyTasksWithTimersResponse(
    @SerializedName("date")
    val date: String,

    @SerializedName("count")
    val count: Int,

    @SerializedName("tasks")
    val tasks: List<TaskWithTimerLogs>
)
```

#### 2.2 添加API接口

**文件：** `android-app/app/src/main/java/com/aiproj/mobile/data/api/AnalyticsApi.kt`

```kotlin
@GET("dashboard/daily-tasks")
suspend fun getDailyTasksWithTimers(
    @Query("date") date: String  // YYYY-MM-DD
): Response<ApiResponse<DailyTasksWithTimersResponse>>
```

#### 2.3 更新Repository

**文件：** `android-app/app/src/main/java/com/aiproj/mobile/data/repository/AnalyticsRepository.kt`

添加新方法：
```kotlin
suspend fun getDailyTasksWithTimers(
    date: String
): Result<DailyTasksWithTimersResponse> {
    return try {
        val response = analyticsApi.getDailyTasksWithTimers(date)
        if (response.isSuccessful && response.body() != null) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                Result.success(body.data)
            } else {
                Result.failure(Exception(body.message ?: "Failed to fetch daily tasks"))
            }
        } else {
            Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch daily tasks"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

#### 2.4 更新ViewModel

**文件：** `android-app/app/src/main/java/com/aiproj/mobile/ui/screens/analytics/AnalyticsViewModel.kt`

修改 `selectDate` 方法（第275-320行）：

```kotlin
fun selectDate(date: String) {
    _uiState.update { it.copy(selectedDate = date, selectedTimeRange = null) }

    viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }

        try {
            // 从workTimeTrend中找到对应日期的数据
            val dayWorkTime = _uiState.value.workTimeTrend.find { it.date == date }

            // 调用新的API获取任务及timer logs
            val tasksWithTimersResult = analyticsRepository.getDailyTasksWithTimers(date)

            val dayDetail = if (tasksWithTimersResult.isSuccess && dayWorkTime != null) {
                val tasksData = tasksWithTimersResult.getOrNull()!!

                // 将TaskWithTimerLogs转换为TaskTimeEntry
                val taskEntries = tasksData.tasks.map { task ->
                    // 从timer_logs中提取开始和结束时间
                    val (startTime, endTime) = extractTimeRange(task.timerLogs)

                    TaskTimeEntry(
                        taskId = task.id,
                        taskTitle = task.title,
                        projectName = task.projectName,
                        duration = task.workHours,
                        startTime = startTime,
                        endTime = endTime,
                        status = task.status,
                        isCompleted = task.status == "completed"
                    )
                }

                DayDetail(
                    date = date,
                    weekday = getWeekdayLabel(date),
                    hours = dayWorkTime.hours,
                    tasksCompleted = taskEntries.count { it.isCompleted },
                    efficiency = 0f,  // TODO: 计算效率
                    taskEntries = taskEntries
                )
            } else {
                null
            }

            _uiState.update {
                it.copy(
                    selectedDayDetail = dayDetail,
                    isLoading = false
                )
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    error = "加载每日详情失败: ${e.message}",
                    isLoading = false
                )
            }
        }
    }
}

/**
 * 从timer logs中提取时间范围
 * 返回最早的开始时间和最晚的结束时间
 */
private fun extractTimeRange(timerLogs: List<TimerLogEntry>): Pair<String, String> {
    if (timerLogs.isEmpty()) {
        return Pair("00:00", "00:00")
    }

    // 获取最早的开始时间
    val startTime = timerLogs.minByOrNull { it.startTime }?.startTime ?: "00:00"

    // 获取最晚的结束时间（过滤掉null值）
    val endTime = timerLogs
        .mapNotNull { it.endTime }
        .maxOrNull() ?: "00:00"

    return Pair(startTime, endTime)
}
```

#### 2.5 恢复TaskTimeEntryCard的时间显示

**文件：** `android-app/app/src/main/java/com/aiproj/mobile/ui/screens/analytics/components/TaskTimeEntryCard.kt`

将之前隐藏时间的代码改回显示：

```kotlin
// 修改前（当前代码）：
// 只在有有效时间时显示时间段
if (taskEntry.startTime != "00:00" || taskEntry.endTime != "00:00") {
    Spacer(modifier = Modifier.width(8.dp))
    Text(
        text = "${taskEntry.startTime} - ${taskEntry.endTime}",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

// 修改后：
Spacer(modifier = Modifier.width(8.dp))

// 时间段显示
Text(
    text = "${taskEntry.startTime} - ${taskEntry.endTime}",
    style = MaterialTheme.typography.bodySmall,
    color = MaterialTheme.colorScheme.onSurfaceVariant
)
```

## 测试计划

### 后端测试
1. [ ] 编译后端代码
2. [ ] 启动后端服务
3. [ ] 使用curl测试API：
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/dashboard/daily-tasks?date=2025-02-05"
```
4. [ ] 验证返回的timer_logs数据格式正确
5. [ ] 验证时间格式为 "HH:MM"

### Android端测试
1. [ ] 创建新的数据模型文件
2. [ ] 更新API接口
3. [ ] 更新Repository
4. [ ] 更新ViewModel
5. [ ] 恢复TaskTimeEntryCard的时间显示
6. [ ] 编译Android应用
7. [ ] 安装到手机测试
8. [ ] 验证每日任务列表显示正确的时间段

### 预期效果
- 点击某一天的日期
- 显示该天的任务列表
- 每个任务显示正确的工作时间段，例如：
  - "09:30 - 12:00" （单个计时段）
  - "09:00 - 18:00" （多个计时段，显示最早开始和最晚结束）

## 相关文件清单

### 后端文件
- [x] `backend/handlers/dashboard_handler.go` - 添加GetDailyTasksWithTimers函数
- [x] `backend/routes/api_routes.go` - 注册新路由

### Android文件
- [ ] `android-app/app/src/main/java/com/aiproj/mobile/data/models/TaskWithTimerLogs.kt` - 新建
- [ ] `android-app/app/src/main/java/com/aiproj/mobile/data/api/AnalyticsApi.kt` - 添加方法
- [ ] `android-app/app/src/main/java/com/aiproj/mobile/data/repository/AnalyticsRepository.kt` - 添加方法
- [ ] `android-app/app/src/main/java/com/aiproj/mobile/ui/screens/analytics/AnalyticsViewModel.kt` - 修改selectDate方法
- [ ] `android-app/app/src/main/java/com/aiproj/mobile/ui/screens/analytics/components/TaskTimeEntryCard.kt` - 恢复时间显示

## 注意事项

1. **时间格式统一**：后端返回 "HH:MM" 格式，前端直接显示
2. **空数据处理**：如果某任务没有timer_logs，显示 "00:00 - 00:00"
3. **多计时段处理**：一个任务可能有多个计时段，显示最早开始和最晚结束时间
4. **时区处理**：确保后端和前端使用相同的时区
5. **性能优化**：考虑缓存已加载的日期数据

## 预估工时

- 后端测试和调试：0.5小时
- Android端实现：1.5小时
- 测试和bug修复：0.5小时
- 总计：2.5小时

## 依赖

- 依赖后端 `unified_timer_logs` 表有正确的数据
- 依赖用户已经使用计时器功能记录了工作时间
