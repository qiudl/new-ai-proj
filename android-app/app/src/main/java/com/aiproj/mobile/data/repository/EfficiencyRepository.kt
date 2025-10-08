package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.EfficiencyApi
import com.aiproj.mobile.data.models.DailyComparisonResponse
import com.aiproj.mobile.data.models.EfficiencyInsight
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 效率分析Repository
 */
@Singleton
class EfficiencyRepository @Inject constructor(
    private val api: EfficiencyApi
) {

    /**
     * 获取3日效率对比
     *
     * @param endDate 结束日期（可选，默认为今天），格式: YYYY-MM-DD
     * @return Result包装的DailyComparisonResponse
     */
    suspend fun get3DayComparison(
        endDate: String? = null
    ): Result<DailyComparisonResponse> {
        return try {
            val response = api.get3DayComparison(endDate)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()!!.data
                if (data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception("数据为空"))
                }
            } else {
                Result.failure(
                    Exception(response.body()?.message ?: "获取失败: HTTP ${response.code()}")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取效率洞察
     *
     * @param days 分析天数（默认7天）
     * @return Result包装的EfficiencyInsight列表
     */
    suspend fun getEfficiencyInsights(days: Int = 7): Result<List<EfficiencyInsight>> {
        return try {
            val response = api.getEfficiencyInsights(days)

            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data ?: emptyList())
            } else {
                Result.failure(
                    Exception(response.body()?.message ?: "获取失败: HTTP ${response.code()}")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
