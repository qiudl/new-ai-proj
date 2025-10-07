package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.StartTimerRequest
import com.aiproj.mobile.data.models.TimerHistoryResponse
import com.aiproj.mobile.data.models.TimerStatus
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * 统一计时器API接口
 */
interface TimerApi {

    /**
     * 启动计时器
     */
    @POST("user/timer/start")
    suspend fun startTimer(
        @Body request: StartTimerRequest
    ): Response<ApiResponse<TimerStatus>>

    /**
     * 暂停计时器
     */
    @POST("user/timer/pause")
    suspend fun pauseTimer(): Response<ApiResponse<TimerStatus>>

    /**
     * 恢复计时器
     */
    @POST("user/timer/resume")
    suspend fun resumeTimer(): Response<ApiResponse<TimerStatus>>

    /**
     * 停止计时器
     */
    @POST("user/timer/stop")
    suspend fun stopTimer(): Response<ApiResponse<Unit>>

    /**
     * 获取当前计时器状态
     */
    @GET("user/timer/current")
    suspend fun getCurrentTimer(): Response<ApiResponse<TimerStatus>>

    /**
     * 获取所有活跃的计时器
     */
    @GET("user/timer/active")
    suspend fun getActiveTimers(): Response<ApiResponse<List<TimerStatus>>>

    /**
     * 获取计时器历史记录（分页）
     * @param page 页码（从1开始）
     * @param pageSize 每页记录数
     * @param startDate 开始日期（可选，格式: YYYY-MM-DD）
     * @param endDate 结束日期（可选，格式: YYYY-MM-DD）
     * @param taskId 任务ID筛选（可选）
     * @param status 状态筛选（可选: completed, cancelled）
     */
    @GET("user/timer/history")
    suspend fun getTimerHistory(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null,
        @Query("task_id") taskId: Long? = null,
        @Query("status") status: String? = null
    ): Response<ApiResponse<TimerHistoryResponse>>
}
