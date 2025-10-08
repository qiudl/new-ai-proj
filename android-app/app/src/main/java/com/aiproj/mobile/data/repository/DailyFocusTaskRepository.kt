package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.DailyFocusTaskApi
import com.aiproj.mobile.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Daily Focus Task Repository
 * 负责今日主要任务的数据访问
 */
@Singleton
class DailyFocusTaskRepository @Inject constructor(
    private val api: DailyFocusTaskApi
) {

    /**
     * 获取今日主要任务列表
     */
    suspend fun getDailyFocusTasks(
        date: String? = null,
        status: String? = null,
        includeSuggestions: Boolean = false
    ): Result<DailyFocusTaskListResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getDailyFocusTasks(
                date = date,
                status = status,
                includeSuggestions = includeSuggestions
            )

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "获取任务失败"))
                }
            } else {
                Result.failure(Exception("网络请求失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取今日活跃任务 (快捷方法)
     */
    suspend fun getTodayActiveTasks(): Result<DailyFocusTaskListResponse> {
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        return getDailyFocusTasks(
            date = today,
            status = "active",
            includeSuggestions = false
        )
    }

    /**
     * 创建今日主要任务
     */
    suspend fun createDailyFocusTask(
        taskId: Int,
        priorityLevel: String? = "medium",
        estimatedDurationMinutes: Int? = null,
        userNotes: String? = null,
        focusDate: String? = null
    ): Result<DailyFocusTask> = withContext(Dispatchers.IO) {
        try {
            val request = CreateDailyFocusTaskRequest(
                taskId = taskId,
                priorityLevel = priorityLevel,
                estimatedDurationMinutes = estimatedDurationMinutes,
                userNotes = userNotes,
                focusDate = focusDate
            )

            val response = api.createDailyFocusTask(request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "创建任务失败"))
                }
            } else {
                Result.failure(Exception("网络请求失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 更新今日主要任务
     */
    suspend fun updateDailyFocusTask(
        id: Int,
        priorityLevel: String? = null,
        estimatedDurationMinutes: Int? = null,
        userNotes: String? = null
    ): Result<DailyFocusTask> = withContext(Dispatchers.IO) {
        try {
            val request = UpdateDailyFocusTaskRequest(
                priorityLevel = priorityLevel,
                estimatedDurationMinutes = estimatedDurationMinutes,
                userNotes = userNotes
            )

            val response = api.updateDailyFocusTask(id, request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "更新任务失败"))
                }
            } else {
                Result.failure(Exception("网络请求失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 删除今日主要任务
     */
    suspend fun deleteDailyFocusTask(id: Int): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteDailyFocusTask(id)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "删除任务失败"))
                }
            } else {
                Result.failure(Exception("网络请求失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 标记任务完成
     */
    suspend fun completeDailyFocusTask(id: Int): Result<DailyFocusTask> = withContext(Dispatchers.IO) {
        try {
            val response = api.completeDailyFocusTask(id)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "完成任务失败"))
                }
            } else {
                Result.failure(Exception("网络请求失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取智能推荐
     */
    suspend fun getTaskSuggestions(
        date: String? = null,
        limit: Int = 5
    ): Result<List<TaskSuggestion>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getTaskSuggestions(date, limit)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "获取推荐失败"))
                }
            } else {
                Result.failure(Exception("网络请求失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取统计信息
     */
    suspend fun getDailyFocusStats(
        date: String? = null,
        period: String = "daily"
    ): Result<Map<String, Any>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getDailyFocusStats(date, period)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "获取统计失败"))
                }
            } else {
                Result.failure(Exception("网络请求失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
