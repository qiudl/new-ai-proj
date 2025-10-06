package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * AI子任务生成API接口
 */
interface AISubtaskApi {

    /**
     * 生成子任务
     * POST /api/v1/tasks/{id}/ai-generate-subtasks
     */
    @POST("tasks/{id}/ai-generate-subtasks")
    suspend fun generateSubtasks(
        @Path("id") taskId: Int,
        @Body request: SubtaskGenerateRequest
    ): Response<ApiResponse<SubtaskGenerateResponse>>

    /**
     * 批量创建子任务
     * POST /api/v1/tasks/batch-create-subtasks
     */
    @POST("tasks/batch-create-subtasks")
    suspend fun batchCreateSubtasks(
        @Body request: BatchCreateSubtasksRequest
    ): Response<BatchCreateSubtasksResponse>
}
