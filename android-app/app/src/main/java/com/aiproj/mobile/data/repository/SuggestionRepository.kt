package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.SuggestionApi
import com.aiproj.mobile.data.models.TimerStatus
import com.aiproj.mobile.data.models.TimerSuggestion
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 智能建议Repository
 * 处理计时器建议相关的数据操作
 */
@Singleton
class SuggestionRepository @Inject constructor(
    private val api: SuggestionApi
) {

    /**
     * 获取计时器建议列表
     *
     * @return Result包装的建议列表
     */
    suspend fun getTimerSuggestions(): Result<List<TimerSuggestion>> {
        return try {
            val response = api.getTimerSuggestions()

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()!!.data
                if (data != null) {
                    Result.success(data)
                } else {
                    Result.success(emptyList())
                }
            } else {
                Result.failure(
                    Exception(response.body()?.message ?: "获取建议失败: HTTP ${response.code()}")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 应用建议(快速启动计时器)
     *
     * @param suggestionId 建议ID
     * @return Result包装的计时器状态
     */
    suspend fun applySuggestion(suggestionId: String): Result<TimerStatus> {
        return try {
            val response = api.applySuggestion(suggestionId)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()!!.data
                if (data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception("应用建议失败: 未返回计时器状态"))
                }
            } else {
                Result.failure(
                    Exception(response.body()?.message ?: "应用建议失败: HTTP ${response.code()}")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
