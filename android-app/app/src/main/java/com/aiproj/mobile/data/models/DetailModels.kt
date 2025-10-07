package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

// ========================================
// 今日任务详情相关模型
// ========================================

/**
 * 今日任务详情数据（组合后的完整数据）
 */
data class TodayTasksDetail(
    val date: String,
    val total: Int,
    val completed: Int,
    val pending: Int,
    val completionRate: Float,
    val priorityDistribution: PriorityDistribution,
    val tasks: List<Task>
)

/**
 * 今日任务统计数据（从API获取）
 */
data class TodayTasksStats(
    @SerializedName("total_count")
    val totalCount: Int = 0,

    @SerializedName("completed_count")
    val completedCount: Int = 0,

    @SerializedName("in_progress_count")
    val inProgressCount: Int = 0,

    @SerializedName("pending_count")
    val pendingCount: Int = 0,

    @SerializedName("overdue_count")
    val overdueCount: Int = 0,

    @SerializedName("due_today_count")
    val dueTodayCount: Int = 0,

    @SerializedName("created_today_count")
    val createdTodayCount: Int = 0,

    @SerializedName("updated_today_count")
    val updatedTodayCount: Int = 0,

    @SerializedName("high_priority_count")
    val highPriorityCount: Int = 0,

    @SerializedName("priority_stats")
    val priorityStats: Map<String, Int>? = null,

    @SerializedName("totalPlannedTime")
    val totalPlannedTime: Float = 0f,

    @SerializedName("totalActualTime")
    val totalActualTime: Float = 0f,

    @SerializedName("totalRemainingTime")
    val totalRemainingTime: Float = 0f,

    @SerializedName("timeEfficiency")
    val timeEfficiency: Float = 0f,

    @SerializedName("totalPlannedTimeFormatted")
    val totalPlannedTimeFormatted: String? = null,

    @SerializedName("totalActualTimeFormatted")
    val totalActualTimeFormatted: String? = null,

    @SerializedName("totalRemainingTimeFormatted")
    val totalRemainingTimeFormatted: String? = null,

    @SerializedName("timeDistribution")
    val timeDistribution: Map<String, Float>? = null
)

/**
 * 优先级分布
 */
data class PriorityDistribution(
    @SerializedName("high")
    val high: Int = 0,

    @SerializedName("medium")
    val medium: Int = 0,

    @SerializedName("low")
    val low: Int = 0
) {
    val total: Int get() = high + medium + low
    val highPercentage: Float get() = if (total > 0) high.toFloat() / total else 0f
    val mediumPercentage: Float get() = if (total > 0) medium.toFloat() / total else 0f
    val lowPercentage: Float get() = if (total > 0) low.toFloat() / total else 0f
}

// ========================================
// 工作时长统计相关模型
// ========================================

/**
 * 详细工作时长统计数据
 */
data class DetailedWorkTimeStats(
    @SerializedName("start_date")
    val startDate: String,

    @SerializedName("end_date")
    val endDate: String,

    @SerializedName("total_hours")
    val totalHours: Float,

    @SerializedName("avg_hours_per_day")
    val avgHoursPerDay: Float,

    @SerializedName("daily_stats")
    val dailyStats: List<DailyWorkStat>,

    @SerializedName("task_time_distribution")
    val taskTimeDistribution: List<TaskTimeStat>,

    @SerializedName("efficiency_metrics")
    val efficiencyMetrics: EfficiencyMetrics
)

/**
 * 每日工作统计
 */
data class DailyWorkStat(
    @SerializedName("date")
    val date: String,

    @SerializedName("hours")
    val hours: Float,

    @SerializedName("minutes")
    val minutes: Int,

    @SerializedName("task_count")
    val taskCount: Int,

    @SerializedName("completed_tasks")
    val completedTasks: Int,

    @SerializedName("day_of_week")
    val dayOfWeek: String,

    @SerializedName("is_weekend")
    val isWeekend: Boolean
)

/**
 * 任务时间统计
 */
data class TaskTimeStat(
    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("task_title")
    val taskTitle: String,

    @SerializedName("project_name")
    val projectName: String?,

    @SerializedName("total_minutes")
    val totalMinutes: Int,

    @SerializedName("total_hours")
    val totalHours: Float,

    @SerializedName("percentage")
    val percentage: Float,

    @SerializedName("sessions_count")
    val sessionsCount: Int
)

/**
 * 高效工作日
 */
data class ProductiveDay(
    @SerializedName("date")
    val date: String,

    @SerializedName("hours")
    val hours: Float,

    @SerializedName("completed_tasks")
    val completedTasks: Int
)

/**
 * 效率指标（用于工作时长统计）
 */
data class EfficiencyMetrics(
    @SerializedName("most_productive_day")
    val mostProductiveDay: ProductiveDay?,

    @SerializedName("least_productive_day")
    val leastProductiveDay: ProductiveDay?,

    @SerializedName("avg_task_duration")
    val avgTaskDuration: Float,

    @SerializedName("total_sessions")
    val totalSessions: Int
)

// ========================================
// 活跃项目列表相关模型
// ========================================

/**
 * 活跃项目列表数据
 */
data class ActiveProjectsData(
    @SerializedName("total")
    val total: Int,

    @SerializedName("page")
    val page: Int,

    @SerializedName("limit")
    val limit: Int,

    @SerializedName("projects")
    val projects: List<Project>,

    @SerializedName("summary")
    val summary: ProjectSummary
)

/**
 * 项目汇总
 */
data class ProjectSummary(
    @SerializedName("total_projects")
    val totalProjects: Int,

    @SerializedName("total_tasks")
    val totalTasks: Int,

    @SerializedName("avg_completion_rate")
    val avgCompletionRate: Float
)

// ========================================
// 待办任务列表相关模型
// ========================================

/**
 * 待办任务列表数据
 */
data class PendingTasksData(
    @SerializedName("total")
    val total: Int,

    @SerializedName("page")
    val page: Int,

    @SerializedName("limit")
    val limit: Int,

    @SerializedName("grouped_by_priority")
    val groupedByPriority: Map<String, List<Task>>,

    @SerializedName("summary")
    val summary: PendingTasksSummary
)

/**
 * 待办任务汇总
 */
data class PendingTasksSummary(
    @SerializedName("total_pending")
    val totalPending: Int,

    @SerializedName("by_status")
    val byStatus: Map<String, Int>,

    @SerializedName("by_priority")
    val byPriority: Map<String, Int>,

    @SerializedName("overdue_count")
    val overdueCount: Int
)

// ========================================
// 批量操作相关模型
// ========================================

/**
 * 批量任务操作请求
 */
data class BatchTaskRequest(
    @SerializedName("task_ids")
    val taskIds: List<Int>,

    @SerializedName("action")
    val action: String,  // complete, update_priority, add_to_focus, delete

    @SerializedName("params")
    val params: Map<String, Any>? = null
)

/**
 * 批量任务操作结果
 */
data class BatchTaskResult(
    @SerializedName("processed")
    val processed: Int,

    @SerializedName("failed")
    val failed: Int,

    @SerializedName("results")
    val results: List<BatchTaskItemResult>
)

/**
 * 批量任务操作单项结果
 */
data class BatchTaskItemResult(
    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String
)

// ========================================
// 今日工作时长相关模型
// ========================================
// 注意：DashboardStats 和 DailyTimeStat 已在 Dashboard.kt 中定义

/**
 * 每日任务响应包装类（匹配后端格式）
 */
data class DailyTasksResponse(
    @SerializedName("date")
    val date: String,

    @SerializedName("tasks")
    val tasks: List<TaskWithTimer>,

    @SerializedName("count")
    val count: Int
)

/**
 * 任务带计时器信息（匹配后端格式）
 */
data class TaskWithTimer(
    @SerializedName("id")
    val id: Int,

    @SerializedName("project_id")
    val projectId: Int,

    @SerializedName("project_name")
    val projectName: String?,

    @SerializedName("title")
    val title: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("priority")
    val priority: String,

    @SerializedName("work_hours")
    val workHours: Float,

    @SerializedName("timer_logs")
    val timerLogs: List<TimerLogEntry>?,

    @SerializedName("created_at")
    val createdAt: String?,

    @SerializedName("updated_at")
    val updatedAt: String?
)

// TimerLogEntry is now defined in TaskWithTimerLogs.kt to avoid duplication

// 以下类已废弃，不再使用，保留作为参考
/*
/**
 * 计时器信息（已废弃）
 */
data class TimerInfo(
    @SerializedName("id")
    val id: Int,

    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("start_time")
    val startTime: String,

    @SerializedName("end_time")
    val endTime: String?,

    @SerializedName("duration")
    val duration: Int,  // 分钟

    @SerializedName("status")
    val status: String  // running, paused, stopped
)

/**
 * 工作会话（已废弃）
 */
data class WorkSession(
    @SerializedName("id")
    val id: Int,

    @SerializedName("start_time")
    val startTime: String,

    @SerializedName("end_time")
    val endTime: String?,

    @SerializedName("duration_minutes")
    val durationMinutes: Int
)
*/

/**
 * 时间统计响应
 */
data class TimeStatsResponse(
    @SerializedName("dailyStats")
    val dailyStats: List<DailyTimeStat>,

    @SerializedName("totalHours")
    val totalHours: Float,

    @SerializedName("averageHoursPerDay")
    val averageHoursPerDay: Float,

    @SerializedName("mostProductiveDay")
    val mostProductiveDay: String?
)

/**
 * 今日工作时长详情（组合数据）
 */
data class TodayWorkTimeDetail(
    val date: String,
    val totalMinutes: Int,
    val completedTasks: Int,
    val totalTasks: Int,
    val taskTimeDetails: List<TaskTimeDetail>,
    val timeDistribution: TimeDistribution?,
    val comparisonYesterday: DayComparison?
)

/**
 * 任务时间详情
 */
data class TaskTimeDetail(
    val taskId: Int,
    val taskTitle: String,
    val workMinutes: Int,
    val status: String,
    val projectName: String?
)

/**
 * 时间分布（上午/下午/晚上）
 */
data class TimeDistribution(
    val morning: Int = 0,      // 6:00-12:00，分钟
    val afternoon: Int = 0,    // 12:00-18:00，分钟
    val evening: Int = 0       // 18:00-24:00 + 0:00-6:00，分钟
)

/**
 * 日期对比（与昨日对比）
 */
data class DayComparison(
    val workTimeChange: Int,        // 工作时长变化（分钟）
    val workTimePercent: Float,     // 工作时长变化百分比
    val taskCountChange: Int,       // 完成任务数变化
    val taskCountPercent: Float     // 完成任务数变化百分比
)
