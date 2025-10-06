package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.AnalyticsApi
import com.aiproj.mobile.data.api.DashboardStatsData
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.api.TimeStatsData
import com.aiproj.mobile.data.api.WeeklyStatsResponse
import com.aiproj.mobile.data.models.DailyTasksWithTimersResponse
import com.aiproj.mobile.data.models.Task
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Analytics数据仓库
 */
@Singleton
class AnalyticsRepository @Inject constructor(
    private val analyticsApi: AnalyticsApi,
    private val taskApi: TaskApi
) {
    /**
     * 获取工作时长统计（用于趋势图表）
     * @param days 统计天数（1-30）
     */
    suspend fun getTimeStats(days: Int = 7): Result<TimeStatsData> {
        return try {
            val response = analyticsApi.getTimeStats(days)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.data != null) {
                    Result.success(body.data)
                } else {
                    Result.failure(Exception(body.error ?: "API returned success=false or null data"))
                }
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch time stats"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取每日Dashboard统计
     * @param date 日期（YYYY-MM-DD格式），null表示今天
     */
    suspend fun getDashboardStats(date: String? = null): Result<DashboardStatsData> {
        return try {
            val response = analyticsApi.getDashboardStats(date)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.data != null) {
                    Result.success(body.data)
                } else {
                    Result.failure(Exception(body.error ?: "API returned success=false or null data"))
                }
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch dashboard stats"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取周统计数据（完整的分析数据）
     * @param startDate 开始日期（YYYY-MM-DD）
     * @param endDate 结束日期（YYYY-MM-DD）
     * @param projectId 项目ID（可选）
     * @param userId 用户ID（可选，管理员使用）
     */
    suspend fun getWeeklyStats(
        startDate: String,
        endDate: String,
        projectId: Int? = null,
        userId: Int? = null
    ): Result<WeeklyStatsResponse> {
        return try {
            val response = analyticsApi.getWeeklyStats(startDate, endDate, projectId, userId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch weekly stats"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取指定日期的任务列表
     * @param workDate 工作日期（YYYY-MM-DD格式）
     * @param projectId 项目ID（可选）
     * @param limit 返回数量限制（默认100）
     */
    suspend fun getTasksByWorkDate(
        workDate: String,
        projectId: Int? = null,
        limit: Int = 100
    ): Result<List<Task>> {
        return try {
            val response = taskApi.getTasks(
                page = 1,
                limit = limit,
                workDate = workDate,
                projectId = projectId,
                sortBy = "work_hours",
                sortOrder = "desc"
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.data != null) {
                    val tasks = body.data.tasks
                    Result.success(tasks)
                } else {
                    Result.failure(Exception(body.error ?: "API returned success=false or null data"))
                }
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch tasks by work date"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取每日任务及其计时记录
     * @param date 日期（YYYY-MM-DD格式）
     */
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
}
