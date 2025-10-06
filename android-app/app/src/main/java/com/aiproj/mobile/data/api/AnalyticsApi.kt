package com.aiproj.mobile.data.api

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Analytics API接口
 */
interface AnalyticsApi {
    /**
     * 获取时间统计数据（工作时长趋势）
     * GET /api/v1/dashboard/time-stats?days=7
     */
    @GET("dashboard/time-stats")
    suspend fun getTimeStats(
        @Query("days") days: Int = 7
    ): Response<TimeStatsResponse>

    /**
     * 获取每日Dashboard统计
     * GET /api/v1/dashboard/stats?date=2025-10-01
     */
    @GET("dashboard/stats")
    suspend fun getDashboardStats(
        @Query("date") date: String? = null
    ): Response<DashboardStatsResponse>

    /**
     * 获取周统计数据
     * GET /api/v1/dashboard/weekly-stats?start_date=2025-10-01&end_date=2025-10-07
     */
    @GET("dashboard/weekly-stats")
    suspend fun getWeeklyStats(
        @Query("start_date") startDate: String,
        @Query("end_date") endDate: String,
        @Query("project_id") projectId: Int? = null,
        @Query("user_id") userId: Int? = null
    ): Response<WeeklyStatsResponse>
}

/**
 * 时间统计响应
 */
data class TimeStatsResponse(
    val success: Boolean,
    val data: TimeStatsData? = null,
    val error: String? = null
)

data class TimeStatsData(
    val dailyStats: List<DailyTimeStat>? = null,  // Gson不会使用默认值，必须用可空类型
    val totalHours: Float = 0f,
    val averageHoursPerDay: Float = 0f,
    val mostProductiveDay: String? = null
)

data class DailyTimeStat(
    val date: String,
    val hours: Float = 0f,
    val taskCount: Int = 0,
    val label: String = ""
)

/**
 * Dashboard统计响应
 */
data class DashboardStatsResponse(
    val success: Boolean,
    val data: DashboardStatsData? = null,
    val error: String? = null
)

data class DashboardStatsData(
    val today_tasks_completed: Int = 0,
    val today_tasks_total: Int = 0,
    val today_work_time: Int = 0, // 分钟
    val active_projects: Int = 0,
    val pending_tasks: Int = 0
)

/**
 * 周统计响应
 */
data class WeeklyStatsResponse(
    val date_range: DateRange,
    val summary: WeeklySummary,
    val task_stats: TaskStatsByStatus,
    val project_stats: List<ProjectStatsItem>? = null,  // Gson不会使用默认值，必须用可空类型
    val daily_stats: List<DailyStatsItem>? = null,
    val top_tasks: List<TaskSummaryItem>? = null,
    val trends: WeeklyTrends,
    val priority_distribution: PriorityDistribution = PriorityDistribution()
)

data class DateRange(
    val start_date: String,
    val end_date: String,
    val week_number: Int,
    val year: Int
)

data class WeeklySummary(
    val total_tasks: Int,
    val completed_tasks: Int,
    val in_progress_tasks: Int,
    val pending_tasks: Int,
    val overdue_tasks: Int,
    val completion_rate: Float,
    val projects_involved: Int
)

data class TaskStatsByStatus(
    val draft: Int = 0,
    val planning: Int = 0,
    val todo: Int = 0,
    val in_progress: Int = 0,
    val testing: Int = 0,
    val completed: Int = 0,
    val cancelled: Int = 0,
    val on_hold: Int = 0,
    val blocked: Int = 0,
    val archived: Int = 0
)

data class ProjectStatsItem(
    val project_id: Int,
    val project_name: String = "",
    val task_count: Int = 0,
    val completed_count: Int = 0,
    val completion_rate: Float = 0f
)

data class DailyStatsItem(
    val date: String,
    val tasks_created: Int = 0,
    val tasks_completed: Int = 0,
    val tasks_updated: Int = 0
)

data class TaskSummaryItem(
    val id: Int,
    val project_id: Int,
    val project_name: String = "",
    val title: String,
    val status: String,
    val priority: String = "",
    val due_date: String? = null,
    val updated_at: String = "",
    val work_hours: Float = 0f  // Total work hours from unified_timer_logs
)

data class WeeklyTrends(
    val task_creation_trend: Float = 0f,
    val completion_rate_trend: Float = 0f,
    val productivity_trend: String = ""
)

data class PriorityDistribution(
    val urgent: Int = 0,
    val high: Int = 0,
    val medium: Int = 0,
    val low: Int = 0
)
