package com.aiproj.mobile.data.models

/**
 * Dashboard 统计数据
 */
data class DashboardStats(
    val todayTasksCompleted: Int,
    val todayTasksTotal: Int,
    val todayWorkTime: Long, // 分钟
    val activeProjects: Int,
    val pendingTasks: Int
)

/**
 * Dashboard 数据（聚合所有信息）
 */
data class DashboardData(
    val stats: DashboardStats,
    val priorityTasks: List<Task>,
    val recentProjects: List<Project>,
    val currentTimer: TimeLog?,
    val timeStats: TimeStatsData? = null,
    val recentNotifications: List<Notification> = emptyList(),
    val dailyFocusTasks: List<DailyFocusTask> = emptyList(),
    val focusTaskSuggestions: List<TaskSuggestion> = emptyList()
)

/**
 * 时间统计数据
 * 用于Dashboard图表展示
 */
data class TimeStatsData(
    val dailyStats: List<DailyTimeStat>,
    val totalHours: Float,
    val averageHoursPerDay: Float,
    val mostProductiveDay: String? = null
)

/**
 * 每日时间统计
 */
data class DailyTimeStat(
    val date: String,          // 日期，格式: "2025-10-01"
    val hours: Float,          // 工作小时数
    val taskCount: Int = 0,    // 完成任务数
    val label: String = ""     // 日期标签，如 "周一"、"10/1"
)
