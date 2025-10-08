package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Daily Focus Task API Interface
 */
interface DailyFocusTaskApi {

    /**
     * 获取今日主要任务列表
     */
    @GET("daily-focus-tasks")
    suspend fun getDailyFocusTasks(
        @Query("date") date: String? = null,
        @Query("status") status: String? = null,
        @Query("include_suggestions") includeSuggestions: Boolean? = null
    ): Response<ApiResponse<DailyFocusTaskListResponse>>

    /**
     * 创建今日主要任务
     */
    @POST("daily-focus-tasks")
    suspend fun createDailyFocusTask(
        @Body request: CreateDailyFocusTaskRequest
    ): Response<ApiResponse<DailyFocusTask>>

    /**
     * 更新今日主要任务
     */
    @PUT("daily-focus-tasks/{id}")
    suspend fun updateDailyFocusTask(
        @Path("id") id: Int,
        @Body request: UpdateDailyFocusTaskRequest
    ): Response<ApiResponse<DailyFocusTask>>

    /**
     * 删除今日主要任务
     */
    @DELETE("daily-focus-tasks/{id}")
    suspend fun deleteDailyFocusTask(
        @Path("id") id: Int
    ): Response<ApiResponse<Unit>>

    /**
     * 标记任务完成
     */
    @PATCH("daily-focus-tasks/{id}/complete")
    suspend fun completeDailyFocusTask(
        @Path("id") id: Int
    ): Response<ApiResponse<DailyFocusTask>>

    /**
     * 获取智能推荐
     */
    @GET("daily-focus-tasks/recommendations")
    suspend fun getTaskSuggestions(
        @Query("date") date: String? = null,
        @Query("limit") limit: Int? = 5
    ): Response<ApiResponse<List<TaskSuggestion>>>

    /**
     * 获取统计信息
     */
    @GET("daily-focus-tasks/stats")
    suspend fun getDailyFocusStats(
        @Query("date") date: String? = null,
        @Query("period") period: String? = "daily"
    ): Response<ApiResponse<Map<String, Any>>>
}
