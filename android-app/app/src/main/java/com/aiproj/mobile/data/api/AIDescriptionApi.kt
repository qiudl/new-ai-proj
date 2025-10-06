package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * AI描述生成API接口
 */
interface AIDescriptionApi {

    /**
     * 生成任务描述
     * POST /api/v1/tasks/{id}/ai/generate-description
     */
    @POST("tasks/{id}/ai/generate-description")
    suspend fun generateDescription(
        @Path("id") taskId: Int,
        @Body request: DescriptionGenerateRequest
    ): Response<ApiResponse<DescriptionGenerateResponse>>

    /**
     * 更新任务描述
     * POST /api/v1/tasks/{id}/ai/update-description
     */
    @POST("tasks/{id}/ai/update-description")
    suspend fun updateTaskDescription(
        @Path("id") taskId: Int,
        @Body request: UpdateDescriptionRequest
    ): Response<ApiResponse<Task>>

    /**
     * 获取描述建议
     * GET /api/v1/tasks/{id}/ai/description-suggestions
     */
    @GET("tasks/{id}/ai/description-suggestions")
    suspend fun getDescriptionSuggestions(
        @Path("id") taskId: Int
    ): Response<ApiResponse<DescriptionSuggestionsResponse>>

    /**
     * 批量生成描述
     * POST /api/v1/tasks/ai/batch-generate-descriptions
     */
    @POST("tasks/ai/batch-generate-descriptions")
    suspend fun batchGenerateDescriptions(
        @Body request: BatchGenerateDescriptionsRequest
    ): Response<ApiResponse<BatchGenerateDescriptionsResponse>>
}
