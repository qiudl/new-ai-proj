package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.DocumentVersionDto
import com.aiproj.mobile.data.models.VersionComparisonResponse
import com.aiproj.mobile.data.models.VersionHistoryResponse
import retrofit2.Response
import retrofit2.http.*

/**
 * 文档版本历史 API 接口
 *
 * 负责文档版本相关的网络请求：
 * - 获取版本历史列表
 * - 获取版本详情
 * - 版本回滚
 * - 版本对比
 * - 版本下载
 */
interface DocumentVersionApi {

    /**
     * 获取文档版本历史列表
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param limit 每页数量，默认20
     * @param offset 偏移量，默认0
     * @param includeContent 是否包含内容，默认false（列表不包含内容以提高性能）
     * @return 版本历史响应，包含版本列表和分页信息
     */
    @GET("projects/{projectId}/tasks/{taskId}/documents/{documentId}/versions")
    suspend fun getVersionHistory(
        @Path("projectId") projectId: Long,
        @Path("taskId") taskId: Long,
        @Path("documentId") documentId: Long,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("include_content") includeContent: Boolean = false
    ): Response<VersionHistoryResponse>

    /**
     * 获取指定版本的详细信息
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @return 版本详情，包含完整内容
     */
    @GET("projects/{projectId}/tasks/{taskId}/documents/{documentId}/versions/{versionNumber}")
    suspend fun getVersionDetail(
        @Path("projectId") projectId: Long,
        @Path("taskId") taskId: Long,
        @Path("documentId") documentId: Long,
        @Path("versionNumber") versionNumber: Int
    ): Response<DocumentVersionDto>

    /**
     * 恢复文档到指定版本
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 要恢复到的版本号
     * @return 新创建的版本信息
     */
    @POST("projects/{projectId}/tasks/{taskId}/documents/{documentId}/versions/{versionNumber}/restore")
    suspend fun restoreVersion(
        @Path("projectId") projectId: Long,
        @Path("taskId") taskId: Long,
        @Path("documentId") documentId: Long,
        @Path("versionNumber") versionNumber: Int
    ): Response<DocumentVersionDto>

    /**
     * 对比两个版本的差异
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param version1 版本1的版本号
     * @param version2 版本2的版本号
     * @return 版本对比结果，包含diff信息
     */
    @GET("projects/{projectId}/tasks/{taskId}/documents/{documentId}/versions/compare")
    suspend fun compareVersions(
        @Path("projectId") projectId: Long,
        @Path("taskId") taskId: Long,
        @Path("documentId") documentId: Long,
        @Query("version1") version1: Int,
        @Query("version2") version2: Int
    ): Response<VersionComparisonResponse>

    /**
     * 下载指定版本的文档
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @return 文档内容的字节流
     */
    @GET("projects/{projectId}/tasks/{taskId}/documents/{documentId}/versions/{versionNumber}/download")
    @Streaming
    suspend fun downloadVersion(
        @Path("projectId") projectId: Long,
        @Path("taskId") taskId: Long,
        @Path("documentId") documentId: Long,
        @Path("versionNumber") versionNumber: Int
    ): Response<okhttp3.ResponseBody>

    /**
     * 为版本添加标签
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @param tag 标签名称（如: "release", "milestone", "backup"）
     * @return 更新后的版本信息
     */
    @POST("projects/{projectId}/tasks/{taskId}/documents/{documentId}/versions/{versionNumber}/tag")
    suspend fun addVersionTag(
        @Path("projectId") projectId: Long,
        @Path("taskId") taskId: Long,
        @Path("documentId") documentId: Long,
        @Path("versionNumber") versionNumber: Int,
        @Body tag: Map<String, String>
    ): Response<DocumentVersionDto>

    /**
     * 移除版本标签
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @return 更新后的版本信息
     */
    @DELETE("projects/{projectId}/tasks/{taskId}/documents/{documentId}/versions/{versionNumber}/tag")
    suspend fun removeVersionTag(
        @Path("projectId") projectId: Long,
        @Path("taskId") taskId: Long,
        @Path("documentId") documentId: Long,
        @Path("versionNumber") versionNumber: Int
    ): Response<DocumentVersionDto>
}
