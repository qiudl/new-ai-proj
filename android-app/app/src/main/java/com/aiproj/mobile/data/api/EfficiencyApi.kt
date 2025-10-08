package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.DailyComparisonResponse
import com.aiproj.mobile.data.models.EfficiencyInsight
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * 效率分析API
 */
interface EfficiencyApi {

    /**
     * 获取3日效率对比
     * GET /api/v1/user/timer/efficiency/3-day-comparison
     *
     * @param endDate 结束日期（可选，默认为今天），格式: YYYY-MM-DD
     * @return 3日对比数据
     */
    @GET("user/timer/efficiency/3-day-comparison")
    suspend fun get3DayComparison(
        @Query("end_date") endDate: String? = null
    ): Response<ApiResponse<DailyComparisonResponse>>

    /**
     * 获取效率洞察
     * GET /api/v1/user/timer/efficiency/insights
     *
     * @param days 分析天数（默认7天）
     * @return 效率洞察列表
     */
    @GET("user/timer/efficiency/insights")
    suspend fun getEfficiencyInsights(
        @Query("days") days: Int = 7
    ): Response<ApiResponse<List<EfficiencyInsight>>>
}
