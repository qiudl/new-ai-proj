package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.TimerStatus
import com.aiproj.mobile.data.models.TimerSuggestion
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * 智能建议API接口
 */
interface SuggestionApi {

    /**
     * 获取计时器建议列表
     * GET /api/v1/user/timer/suggestions
     *
     * @return 建议列表
     */
    @GET("user/timer/suggestions")
    suspend fun getTimerSuggestions(): Response<ApiResponse<List<TimerSuggestion>>>

    /**
     * 应用建议(快速启动计时器)
     * POST /api/v1/user/timer/suggestions/{suggestion_id}/apply
     *
     * @param suggestionId 建议ID
     * @return 启动后的计时器状态
     */
    @POST("user/timer/suggestions/{suggestion_id}/apply")
    suspend fun applySuggestion(
        @Path("suggestion_id") suggestionId: String
    ): Response<ApiResponse<TimerStatus>>
}
