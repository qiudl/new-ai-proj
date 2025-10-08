package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.*

/**
 * 详情页API接口
 * 用于获取仪表盘统计详情数据
 */
interface DetailApi {

    /**
     * 获取今日任务列表
     *
     * @param date 日期，格式: YYYY-MM-DD
     * @param projectId 可选，按项目筛选
     * @return 今日任务列表
     */
    @GET("tasks/today")
    suspend fun getTodayTasksList(
        @Query("date") date: String? = null,
        @Query("project_id") projectId: Int? = null
    ): Response<ApiResponse<List<Task>>>

    /**
     * 获取今日任务统计
     *
     * @param date 日期，格式: YYYY-MM-DD
     * @param projectId 可选，按项目筛选
     * @return 今日任务统计数据
     */
    @GET("tasks/today/stats")
    suspend fun getTodayTasksStats(
        @Query("date") date: String? = null,
        @Query("project_id") projectId: Int? = null
    ): Response<ApiResponse<TodayTasksStats>>

    /**
     * 获取工作时长统计
     *
     * @param startDate 开始日期，格式: YYYY-MM-DD
     * @param endDate 结束日期，格式: YYYY-MM-DD
     * @param granularity 粒度: day | week | month
     * @return 工作时长统计数据
     */
    @GET("analytics/work-time")
    suspend fun getWorkTimeStats(
        @Query("start_date") startDate: String,
        @Query("end_date") endDate: String,
        @Query("granularity") granularity: String = "day"
    ): Response<ApiResponse<DetailedWorkTimeStats>>

    /**
     * 获取活跃项目列表
     *
     * @param sortBy 排序字段: completion_rate | task_count | updated_at
     * @param order 排序方向: asc | desc
     * @param page 页码
     * @param limit 每页数量
     * @return 活跃项目列表数据
     */
    @GET("projects/active")
    suspend fun getActiveProjects(
        @Query("sort_by") sortBy: String = "completion_rate",
        @Query("order") order: String = "desc",
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<ActiveProjectsData>>

    /**
     * 获取待办任务列表
     *
     * @param status 状态筛选，多个用逗号分隔
     * @param priority 优先级筛选
     * @param projectId 项目ID筛选
     * @param sortBy 排序字段: priority | due_date | created_at
     * @param order 排序方向: asc | desc
     * @param search 搜索关键词
     * @param page 页码
     * @param limit 每页数量
     * @return 待办任务列表数据
     */
    @GET("tasks/pending")
    suspend fun getPendingTasks(
        @Query("status") status: String? = null,
        @Query("priority") priority: String? = null,
        @Query("project_id") projectId: Int? = null,
        @Query("sort_by") sortBy: String = "priority",
        @Query("order") order: String = "desc",
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<ApiResponse<PendingTasksData>>

    /**
     * 批量操作任务
     *
     * @param request 批量操作请求
     * @return 批量操作结果
     */
    @POST("tasks/batch")
    suspend fun batchOperateTasks(
        @Body request: BatchTaskRequest
    ): Response<ApiResponse<BatchTaskResult>>

    // ========================================
    // 今日工作时长相关API
    // ========================================

    /**
     * 获取Dashboard统计数据
     *
     * @param date 日期，格式: YYYY-MM-DD，默认为今天
     * @return Dashboard统计数据（包含todayWorkTime等）
     */
    @GET("dashboard/stats")
    suspend fun getDashboardStats(
        @Query("date") date: String? = null
    ): Response<ApiResponse<DashboardStats>>

    /**
     * 获取今日任务带计时器信息
     *
     * @param date 日期，格式: YYYY-MM-DD，默认为今天
     * @return 今日任务列表（包含计时器信息）
     */
    @GET("dashboard/daily-tasks")
    suspend fun getDailyTasksWithTimers(
        @Query("date") date: String
    ): Response<ApiResponse<DailyTasksResponse>>

    /**
     * 获取时间统计数据
     *
     * @param days 统计天数，默认1天（今天）
     * @return 时间统计数据
     */
    @GET("dashboard/time-stats")
    suspend fun getTimeStats(
        @Query("days") days: Int = 1
    ): Response<ApiResponse<TimeStatsResponse>>
}
