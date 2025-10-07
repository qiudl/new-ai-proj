package com.aiproj.mobile.data.models

/**
 * 任务总览统计数据
 */
data class TaskOverviewStats(
    val subtaskStats: SubtaskStats,
    val workTimeStats: WorkTimeStats,
    val topTasks: List<TopTaskItem>,
    val completionTrend: List<TrendDataPoint>,
    val priorityDistribution: PriorityDistribution
)

/**
 * 子任务统计
 */
data class SubtaskStats(
    val total: Int,
    val completed: Int,
    val inProgress: Int,
    val todo: Int
) {
    val completionRate: Float get() = if (total > 0) completed.toFloat() / total else 0f
    val completedPercentage: Int get() = (completionRate * 100).toInt()
    val inProgressPercentage: Int get() = if (total > 0) (inProgress.toFloat() / total * 100).toInt() else 0
    val todoPercentage: Int get() = if (total > 0) (todo.toFloat() / total * 100).toInt() else 0
}

/**
 * 工作时长统计（简化版，用于任务总览）
 */
data class WorkTimeStats(
    val totalHours: Float,
    val averageHours: Float,
    val maxHours: Float,
    val minHours: Float,
    val taskCount: Int
)

/**
 * Top任务项
 */
data class TopTaskItem(
    val taskId: Int,
    val title: String,
    val status: TaskStatus,
    val priority: TaskPriority?,
    val workHours: Float,
    val percentage: Float // 占总时长的百分比
)

/**
 * 趋势数据点
 */
data class TrendDataPoint(
    val date: String, // ISO 8601 format
    val planned: Int,
    val actual: Int
) {
    val completionRate: Float get() = if (planned > 0) actual.toFloat() / planned else 0f
}

// Note: PriorityDistribution is defined in DetailModels.kt

/**
 * 时间范围枚举
 */
enum class TimeRange(val days: Int, val label: String) {
    TODAY(0, "今天"),
    LAST_7_DAYS(7, "最近7天"),
    LAST_30_DAYS(30, "最近30天"),
    THIS_MONTH(-1, "本月"),
    CUSTOM(-2, "自定义")
}
