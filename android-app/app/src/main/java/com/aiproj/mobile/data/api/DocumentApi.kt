package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.Document
import com.aiproj.mobile.data.models.DocumentListResponse
import com.aiproj.mobile.data.models.DocumentRequest
import retrofit2.Response
import retrofit2.http.*

/**
 * 文档相关 API 接口
 */
interface DocumentApi {

    /**
     * 获取任务的文档列表
     */
    @GET("tasks/{taskId}/documents")
    suspend fun getDocuments(
        @Path("taskId") taskId: Int
    ): Response<ApiResponse<List<Document>>>

    /**
     * 获取文档详情
     */
    @GET("tasks/{taskId}/documents/{documentId}")
    suspend fun getDocument(
        @Path("taskId") taskId: Int,
        @Path("documentId") documentId: Int
    ): Response<ApiResponse<Document>>

    /**
     * 创建文档
     */
    @POST("tasks/{taskId}/documents")
    suspend fun createDocument(
        @Path("taskId") taskId: Int,
        @Body request: DocumentRequest
    ): Response<ApiResponse<Document>>

    /**
     * 更新文档
     */
    @PUT("tasks/{taskId}/documents/{documentId}")
    suspend fun updateDocument(
        @Path("taskId") taskId: Int,
        @Path("documentId") documentId: Int,
        @Body request: DocumentRequest
    ): Response<ApiResponse<Document>>

    /**
     * 删除文档
     */
    @DELETE("tasks/{taskId}/documents/{documentId}")
    suspend fun deleteDocument(
        @Path("taskId") taskId: Int,
        @Path("documentId") documentId: Int
    ): Response<Unit>
}
