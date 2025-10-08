package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.TimeLog
import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

/**
 * 时间日志API接口
 */
interface TimeLogApi {
    /**
     * 获取任务的时间日志列表
     * @param taskId 任务ID
     */
    @GET("tasks/{taskId}/time-logs")
    suspend fun getTaskTimeLogs(
        @Path("taskId") taskId: Int
    ): Response<TimeLogListResponse>

    /**
     * 获取当前用户正在运行的计时器
     */
    @GET("time-logs/current")
    suspend fun getCurrentTimer(): Response<TimeLog?>

    /**
     * 开始计时
     * @param request 开始计时请求
     */
    @POST("time-logs/start")
    suspend fun startTimer(
        @Body request: StartTimerRequest
    ): Response<TimeLog>

    /**
     * 停止计时
     * @param timeLogId 时间日志ID
     */
    @POST("time-logs/{timeLogId}/stop")
    suspend fun stopTimer(
        @Path("timeLogId") timeLogId: Long
    ): Response<TimeLog>

    /**
     * 停止当前计时器
     */
    @POST("time-logs/stop-current")
    suspend fun stopCurrentTimer(): Response<TimeLog>
}

/**
 * 时间日志列表响应
 */
data class TimeLogListResponse(
    @SerializedName("time_logs")
    val timeLogs: List<TimeLog>
)

/**
 * 开始计时请求
 */
data class StartTimerRequest(
    @SerializedName("task_id")
    val taskId: Long,

    @SerializedName("description")
    val description: String? = null
)
