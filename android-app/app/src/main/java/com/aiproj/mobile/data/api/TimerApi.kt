package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.StartTimerRequest
import com.aiproj.mobile.data.models.TimerStatus
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

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
}
