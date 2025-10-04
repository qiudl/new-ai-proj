package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.DashboardStats
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
    ): Response<DashboardStats>
}
