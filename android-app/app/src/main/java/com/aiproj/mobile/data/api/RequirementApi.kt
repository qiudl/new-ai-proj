package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.*

/**
 * 需求管理 API 接口
 */
interface RequirementApi {
    /**
     * 获取需求列表（分页）
     */
    @GET("requirements")
    suspend fun getRequirements(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
        @Query("status") status: String? = null,
        @Query("priority") priority: String? = null,
        @Query("search") search: String? = null,
        @Query("project_id") projectId: Int? = null
    ): Response<RequirementListResponse>

    /**
     * 获取需求详情
     */
    @GET("requirements/{id}")
    suspend fun getRequirement(
        @Path("id") id: Int
    ): Response<Requirement>

    /**
     * 创建需求
     */
    @POST("requirements")
    suspend fun createRequirement(
        @Body dto: CreateRequirementDTO
    ): Response<Requirement>

    /**
     * 更新需求
     */
    @PUT("requirements/{id}")
    suspend fun updateRequirement(
        @Path("id") id: Int,
        @Body dto: UpdateRequirementDTO
    ): Response<Requirement>

    /**
     * 删除需求
     */
    @DELETE("requirements/{id}")
    suspend fun deleteRequirement(
        @Path("id") id: Int
    ): Response<Unit>

    /**
     * 提交需求评审
     */
    @POST("requirements/{id}/submit")
    suspend fun submitRequirement(
        @Path("id") id: Int
    ): Response<Requirement>

    /**
     * 批准需求
     */
    @POST("requirements/{id}/approve")
    suspend fun approveRequirement(
        @Path("id") id: Int,
        @Body request: ApproveRequest
    ): Response<Requirement>

    /**
     * 拒绝需求
     */
    @POST("requirements/{id}/reject")
    suspend fun rejectRequirement(
        @Path("id") id: Int,
        @Body request: RejectRequest
    ): Response<Requirement>

    /**
     * 关联任务到需求
     */
    @POST("requirements/{id}/tasks")
    suspend fun linkTasks(
        @Path("id") id: Int,
        @Body taskIds: List<Int>
    ): Response<Unit>

    /**
     * 获取需求关联的任务列表
     */
    @GET("requirements/{id}/tasks")
    suspend fun getRequirementTasks(
        @Path("id") id: Int,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20
    ): Response<TaskListResponse>
}

// ==================== 请求数据类 ====================

/**
 * 批准需求请求
 */
data class ApproveRequest(
    val comment: String? = null
)

/**
 * 拒绝需求请求
 */
data class RejectRequest(
    val reason: String
)

// ==================== 响应数据类 ====================

/**
 * 需求列表响应
 */
data class RequirementListResponse(
    val data: List<Requirement>,
    val pagination: Pagination
)

/**
 * 分页信息
 */
data class Pagination(
    val page: Int,
    val page_size: Int,
    val total: Int,
    val total_pages: Int
)

// 注意: Requirement 和 Task 数据模型需要在对应的任务中定义
// - Requirement: 任务 #3658
// - Task: 任务 #3660
