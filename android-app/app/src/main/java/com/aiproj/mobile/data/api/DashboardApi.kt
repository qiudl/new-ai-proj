package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.DashboardStats
import com.aiproj.mobile.data.models.NotificationListResponse
import com.aiproj.mobile.data.models.TimeStatsData
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Dashboard API 接口
 */
interface DashboardApi {

    /**
     * 获取仪表盘统计数据
     */
    @GET("dashboard/stats")
    suspend fun getDashboardStats(
        @Query("date") date: String? = null
    ): Response<ApiResponse<DashboardStats>>

    /**
     * 获取时间统计数据
     */
    @GET("dashboard/time-stats")
    suspend fun getTimeStats(
        @Query("days") days: Int = 7
    ): Response<ApiResponse<TimeStatsData>>

    /**
     * 获取通知列表
     */
    @GET("dashboard/notifications")
    suspend fun getNotifications(
        @Query("limit") limit: Int = 10,
        @Query("unread_only") unreadOnly: Boolean = false
    ): Response<ApiResponse<NotificationListResponse>>
}
