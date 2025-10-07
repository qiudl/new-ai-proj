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
 *
 * 包含子任务的数量统计和完成率计算
 *
 * @property total 总子任务数
 * @property completed 已完成数量
 * @property inProgress 进行中数量
 * @property todo 待办数量
 * @property completionRate 完成率 (0.0-1.0)
 * @property completedPercentage 完成百分比 (0-100)
 * @property inProgressPercentage 进行中百分比 (0-100)
 * @property todoPercentage 待办百分比 (0-100)
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
 *
 * 表示某一天的计划完成数和实际完成数
 *
 * @property date 日期 (ISO 8601 格式: YYYY-MM-DD)
 * @property planned 计划完成数量
 * @property actual 实际完成数量
 * @property completionRate 完成率 (actual/planned)，可能大于1.0表示超额完成
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
 *
 * 用于任务总览的时间筛选
 *
 * @property days 天数，特殊值：-1表示本月，-2表示自定义
 * @property label 显示标签
 */
enum class TimeRange(val days: Int, val label: String) {
    /** 今天 */
    TODAY(0, "今天"),

    /** 最近7天 */
    LAST_7_DAYS(7, "最近7天"),

    /** 最近30天 */
    LAST_30_DAYS(30, "最近30天"),

    /** 本月（从月初到今天） */
    THIS_MONTH(-1, "本月"),

    /** 自定义时间范围（需要用户选择起止日期） */
    CUSTOM(-2, "自定义")
}
