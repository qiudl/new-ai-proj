package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.ProjectListResponse
import retrofit2.Response
import retrofit2.http.*

/**
 * 项目相关 API 接口
 */
interface ProjectApi {

    /**
     * 获取项目列表
     */
    @GET("projects")
    suspend fun getProjects(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<ProjectListResponse>

    /**
     * 获取项目详情
     */
    @GET("projects/{id}")
    suspend fun getProject(
        @Path("id") projectId: Int
    ): Response<Project>

    /**
     * 获取活跃项目（用于仪表盘）
     */
    @GET("projects/active")
    suspend fun getActiveProjects(
        @Query("limit") limit: Int = 5
    ): Response<ProjectListResponse>

    /**
     * 创建项目
     */
    @POST("projects")
    suspend fun createProject(
        @Body name: String,
        @Body description: String?
    ): Response<Project>

    /**
     * 更新项目
     */
    @PUT("projects/{id}")
    suspend fun updateProject(
        @Path("id") id: Int,
        @Body name: String,
        @Body description: String?
    ): Response<Project>

    /**
     * 删除项目
     */
    @DELETE("projects/{id}")
    suspend fun deleteProject(
        @Path("id") id: Int
    ): Response<Unit>
}
