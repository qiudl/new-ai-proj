package com.aiproj.mobile.ui.screens.analytics

import androidx.compose.ui.graphics.Color

/**
 * Analytics页面UI状态
 */
data class AnalyticsUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val selectedTab: AnalyticsTab = AnalyticsTab.OVERVIEW,   // 当前选中的Tab
    val selectedTimeRange: TimeRange = TimeRange.THIS_WEEK,
    val customStartDate: java.time.LocalDate? = null,        // 自定义开始日期
    val customEndDate: java.time.LocalDate? = null,          // 自定义结束日期
    val showDatePicker: Boolean = false,                     // 是否显示日期选择器

    // 工作时长数据
    val workTimeTrend: List<DailyWorkTime> = emptyList(),
    val timeGranularity: TimeGranularity = TimeGranularity.DAY, // 当前时间粒度

    // 任务统计数据
    val completedTasksCount: Int = 0,
    val totalTasksCount: Int = 0,
    val taskCompletionRate: Float = 0f,
    val taskStatusDistribution: TaskStatusDistribution = TaskStatusDistribution(
        completed = 0,
        completedPercentage = 0f,
        inProgress = 0,
        inProgressPercentage = 0f,
        todo = 0,
        todoPercentage = 0f
    ),

    // 项目分布数据
    val projectTimeDistribution: List<ProjectTimeData> = emptyList(),

    // 成就数据
    val consecutiveWorkDays: Int = 0,
    val totalFocusHours: Float = 0f,

    // Task Stats Tab 数据
    val inProgressTasksCount: Int = 0,
    val todoTasksCount: Int = 0,
    val topTasks: List<TopTask> = emptyList(),
    val dailyCompletionTrend: List<DailyCompletion> = emptyList(),
    val priorityDistribution: PriorityStats = PriorityStats()
)

/**
 * 时间范围枚举
 */
enum class TimeRange(val displayName: String) {
    TODAY("今日"),
    YESTERDAY("昨日"),
    DAY_BEFORE_YESTERDAY("前日"),
    THIS_WEEK("本周"),
    THIS_MONTH("本月"),
    LAST_MONTH("上月"),
    CUSTOM_DATE("自定义日期")
}

/**
 * 每日工作时长数据
 */
data class DailyWorkTime(
    val date: String,       // "2025-10-05" 或 "2025-10-05 14:00"（小时粒度）
    val dayLabel: String,   // "周一" 或 "10/5" 或 "14:00"（小时粒度）
    val hours: Float,       // 工作小时数
    val taskCount: Int = 0, // 该时段完成的任务数
    val detailInfo: String? = null // 详细信息（用于点击显示）
)

/**
 * 时间粒度枚举
 */
enum class TimeGranularity {
    HOUR,    // 按小时显示（单日）
    DAY,     // 按天显示（2-30天）
    WEEK     // 按周显示（30天以上）
}

/**
 * 任务状态分布数据
 */
data class TaskStatusDistribution(
    val completed: Int,
    val completedPercentage: Float,
    val inProgress: Int,
    val inProgressPercentage: Float,
    val todo: Int,
    val todoPercentage: Float,
    val others: Int = 0,  // 其他状态(删除、取消、阻塞等)
    val othersPercentage: Float = 0f,
    val othersBreakdown: OtherStatusBreakdown = OtherStatusBreakdown()  // 其他状态的详细分类
)

/**
 * 其他状态详细分类
 */
data class OtherStatusBreakdown(
    val draft: Int = 0,          // 草稿
    val planning: Int = 0,       // 计划中
    val testing: Int = 0,        // 测试中
    val cancelled: Int = 0,      // 已取消
    val onHold: Int = 0,         // 暂停
    val blocked: Int = 0,        // 阻塞
    val archived: Int = 0        // 已归档
) {
    val total: Int
        get() = draft + planning + testing + cancelled + onHold + blocked + archived
}

/**
 * 项目时间数据
 */
data class ProjectTimeData(
    val projectId: Int,
    val projectName: String,
    val hours: Float,
    val percentage: Float,  // 0.0 ~ 1.0
    val color: Color
)
