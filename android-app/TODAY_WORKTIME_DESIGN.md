# 今日工作时长详情页设计方案

## 📋 需求分析

设计并开发一个展示"今日工作时长"的详情页面，让用户清晰了解今天的工作情况。

## 🔌 后端API

### 1. Dashboard统计API
**端点**: `GET /api/v1/dashboard/stats?date=2025-10-06`

**响应**:
```json
{
  "success": true,
  "data": {
    "todayTasksTotal": 5,
    "todayTasksCompleted": 3,
    "todayWorkTime": 240,  // 分钟
    "pendingTasks": 10,
    "activeProjects": 3
  }
}
```

### 2. 每日任务带计时器API
**端点**: `GET /api/v1/dashboard/daily-tasks?date=2025-10-06`

**响应**: 返回今日任务列表，每个任务包含工作时间信息

### 3. 时间统计API
**端点**: `GET /api/v1/dashboard/time-stats?days=1`

**响应**:
```json
{
  "dailyStats": [
    {
      "date": "2025-10-06",
      "hours": 4.5,
      "taskCount": 3,
      "label": "今天"
    }
  ],
  "totalHours": 4.5,
  "averageHoursPerDay": 4.5,
  "mostProductiveDay": "2025-10-06"
}
```

## 📊 页面设计

### 布局结构

```
┌─────────────────────────────────────┐
│  ← 今日工作时长详情                    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │     今日总工作时长                 │ │
│ │      4小时 30分钟                 │ │
│ │   已完成 3/5 任务                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  时间分布图表                      │ │
│ │  ████████░░░░ 上午 2h            │ │
│ │  ████████████ 下午 2.5h          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  任务时长排行                      │ │
│ │  • 任务A ──── 1h 30min  [完成]   │ │
│ │  • 任务B ──── 1h 20min  [进行中] │ │
│ │  • 任务C ──── 1h 40min  [完成]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  对比昨日                          │ │
│ │  工作时长: +0.5h (↑ 12%)         │ │
│ │  完成任务: +1 (↑ 50%)            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### UI组件

1. **TodaySummaryCard** - 今日总览卡片
   - 总工作时长（大字体显示）
   - 完成任务数/总任务数
   - 进度条

2. **TimeDistributionChart** - 时间分布图表
   - 按小时段统计（可选：上午/下午/晚上）
   - 柱状图或饼图

3. **TaskTimeRankingList** - 任务时长排行
   - 任务列表，按工作时长降序
   - 显示任务名称、时长、状态
   - 点击跳转到任务详情

4. **ComparisonCard** - 对比昨日卡片
   - 工作时长对比
   - 完成任务数对比
   - 百分比和趋势图标

## 🔧 实现方案

### 方案选择

**推荐方案**: 创建独立的TodayWorkTimeDetailScreen

**理由**:
- 现有WorkTimeDetailScreen用于展示时间范围统计（7天/30天）
- 今日详情需要更细粒度的数据展示
- 避免混淆两种不同的使用场景

### 文件结构

```
ui/screens/details/todayworktime/
├── TodayWorkTimeDetailScreen.kt          # 主屏幕
├── TodayWorkTimeDetailViewModel.kt       # ViewModel
└── components/
    ├── TodaySummaryCard.kt              # 今日总览卡片
    ├── TimeDistributionChart.kt         # 时间分布图
    ├── TaskTimeRankingList.kt           # 任务排行列表
    └── ComparisonCard.kt                # 对比卡片
```

### 数据模型

```kotlin
// 今日工作时长详情
data class TodayWorkTimeDetail(
    val date: String,
    val totalMinutes: Int,
    val completedTasks: Int,
    val totalTasks: Int,
    val taskTimeDetails: List<TaskTimeDetail>,
    val comparisonYesterday: DayComparison?
)

// 任务时间详情
data class TaskTimeDetail(
    val taskId: Int,
    val taskTitle: String,
    val workMinutes: Int,
    val status: String,
    val projectName: String?
)

// 日期对比
data class DayComparison(
    val workTimeChange: Int,      // 分钟变化
    val workTimePercent: Float,    // 百分比
    val taskCountChange: Int,
    val taskCountPercent: Float
)
```

### API集成

```kotlin
// DetailApi.kt
@GET("dashboard/stats")
suspend fun getDashboardStats(
    @Query("date") date: String? = null
): Response<ApiResponse<DashboardStats>>

@GET("dashboard/daily-tasks")
suspend fun getDailyTasksWithTimers(
    @Query("date") date: String? = null
): Response<ApiResponse<List<TaskWithTimer>>>
```

### Repository层

```kotlin
// DetailRepository.kt
suspend fun getTodayWorkTimeDetail(
    date: String
): Result<TodayWorkTimeDetail> {
    try {
        // 1. 获取Dashboard统计
        val statsResponse = api.getDashboardStats(date)

        // 2. 获取任务详情
        val tasksResponse = api.getDailyTasksWithTimers(date)

        // 3. 组合数据
        val todayDetail = TodayWorkTimeDetail(...)

        return Result.success(todayDetail)
    } catch (e: Exception) {
        return Result.failure(e)
    }
}
```

## 📱 导航集成

### Screen.kt
```kotlin
object TodayWorkTimeDetail : Screen("today_work_time_detail?date={date}") {
    fun createRoute(date: String? = null): String {
        return date?.let { "today_work_time_detail?date=$it" }
            ?: "today_work_time_detail"
    }
}
```

### AppNavigation.kt
```kotlin
composable(
    route = Screen.TodayWorkTimeDetail.route,
    arguments = listOf(
        navArgument("date") {
            type = NavType.StringType
            nullable = true
            defaultValue = null
        }
    )
) {
    TodayWorkTimeDetailScreen(
        onBackClick = { navController.popBackStack() },
        onTaskClick = { taskId ->
            navController.navigate(Screen.TaskDetail.createRoute(taskId))
        }
    )
}
```

### Dashboard点击事件
```kotlin
// DashboardScreen.kt
StatCard(
    title = "今日工作",
    value = "${stats.todayWorkTime / 60}h ${stats.todayWorkTime % 60}min",
    onClick = {
        onTodayWorkTimeClick(LocalDate.now().toString())
    }
)
```

## ⏱️ 开发估时

| 任务 | 预估时间 |
|------|---------|
| API接口和数据模型 | 0.5h |
| ViewModel和Repository | 0.5h |
| UI组件开发 | 1.5h |
| 导航集成 | 0.5h |
| 测试和调试 | 1h |
| **总计** | **4h** |

## ✅ 验收标准

1. ✅ 正确展示今日工作总时长
2. ✅ 任务时长排行准确
3. ✅ 点击任务可跳转到详情
4. ✅ 昨日对比数据正确
5. ✅ 支持下拉刷新
6. ✅ 错误和空状态处理完善
7. ✅ 编译通过无错误

## 🚀 后续优化

1. **时间段统计**: 按小时分组统计工作时长
2. **工作效率分析**: 基于番茄钟算法分析工作专注度
3. **周/月对比**: 添加更多时间维度的对比
4. **导出功能**: 导出今日工作报告
5. **通知提醒**: 工作时长达到目标时提醒

## 📝 注意事项

1. 时间格式统一使用 `YYYY-MM-DD`
2. 工作时长后端以分钟为单位，前端显示需转换为小时和分钟
3. 任务状态枚举需与后端保持一致
4. 空数据时展示友好提示"今天还没有工作记录"
5. 网络错误时提供重试按钮
