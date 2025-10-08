package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * AI文档生成API接口
 */
interface AIDocumentApi {

    /**
     * 获取文档类型列表
     * GET /api/v1/ai/document-types
     */
    @GET("ai/document-types")
    suspend fun getDocumentTypes(): Response<ApiResponse<DocumentTypesData>>

    /**
     * 获取文档模板列表
     * GET /api/v1/ai/document-templates
     */
    @GET("ai/document-templates")
    suspend fun getDocumentTemplates(): Response<ApiResponse<DocumentTemplatesData>>

    /**
     * 生成文档
     * POST /api/v1/ai/generate-document
     */
    @POST("ai/generate-document")
    suspend fun generateDocument(
        @Body request: AIDocumentGenerateRequest
    ): Response<ApiResponse<AIDocumentGenerateResponse>>

    /**
     * 保存文档到任务
     * POST /api/v1/ai/save-document
     */
    @POST("ai/save-document")
    suspend fun saveDocument(
        @Body request: SaveDocumentRequest
    ): Response<SaveDocumentResponse>
}
