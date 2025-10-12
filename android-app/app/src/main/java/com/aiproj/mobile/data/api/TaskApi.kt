package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.*

/**
 * 任务相关 API 接口
 */
interface TaskApi {

    /**
     * 获取任务列表
     */
    @GET("tasks")
    suspend fun getTasks(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null,
        @Query("priority") priority: String? = null,
        @Query("project_id") projectId: Int? = null,
        @Query("assignee_id") assigneeId: Int? = null,
        @Query("search") search: String? = null,
        @Query("sort_by") sortBy: String? = null,
        @Query("sort_order") sortOrder: String? = null,
        @Query("work_date") workDate: String? = null  // YYYY-MM-DD format, filter tasks by work date
    ): Response<TaskListResponse>

    /**
     * 获取任务详情
     */
    @GET("tasks/{id}")
    suspend fun getTask(
        @Path("id") taskId: Int
    ): Response<ApiResponse<Task>>

    /**
     * 创建任务
     */
    @POST("tasks")
    suspend fun createTask(
        @Body request: TaskRequest
    ): Response<ApiResponse<Task>>

    /**
     * 更新任务
     */
    @PUT("tasks/{id}")
    suspend fun updateTask(
        @Path("id") taskId: Int,
        @Body request: TaskRequest
    ): Response<ApiResponse<Task>>

    /**
     * 删除任务
     */
    @DELETE("tasks/{id}")
    suspend fun deleteTask(
        @Path("id") taskId: Int
    ): Response<ApiResponse<Unit>>

    /**
     * 开始任务（修复路径：使用 PATCH /tasks/{id}/status 并传入状态）
     */
    @PATCH("tasks/{id}/status")
    suspend fun startTask(
        @Path("id") taskId: Int,
        @Body request: TaskStatusUpdateRequest = TaskStatusUpdateRequest(status = "in_progress")
    ): Response<ApiResponse<Task>>

    /**
     * 完成任务
     */
    @POST("tasks/{id}/complete")
    suspend fun completeTask(
        @Path("id") taskId: Int
    ): Response<ApiResponse<Task>>

    /**
     * 获取任务的子任务列表
     */
    @GET("tasks/{id}/children")
    suspend fun getTaskChildren(
        @Path("id") taskId: Int
    ): Response<TaskListResponse>

    /**
     * 获取子任务列表
     */
    @GET("tasks/{id}/children")
    suspend fun getSubtasks(
        @Path("id") parentId: Int
    ): Response<TaskListResponse>

    /**
     * 根据ID获取任务
     */
    @GET("tasks/{id}")
    suspend fun getTaskById(
        @Path("id") id: Int
    ): Response<ApiResponse<Task>>

    // ==================== 评论相关接口 ====================

    /**
     * 获取任务评论列表（分页）
     * GET /tasks/{id}/comments?page=1&limit=20
     *
     * @param taskId 任务ID
     * @param page 页码（从1开始）
     * @param limit 每页数量（默认20，最大100）
     * @return 评论列表响应
     */
    @GET("tasks/{id}/comments")
    suspend fun getComments(
        @Path("id") taskId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<CommentListResponse>

    /**
     * 创建评论
     * POST /tasks/{id}/comments
     *
     * @param taskId 任务ID
     * @param request 评论内容
     * @return 新创建的评论
     */
    @POST("tasks/{id}/comments")
    suspend fun createComment(
        @Path("id") taskId: Int,
        @Body request: AddCommentRequest
    ): Response<CommentResponse>

    /**
     * 删除评论
     * DELETE /tasks/{id}/comments/{commentId}
     *
     * @param taskId 任务ID
     * @param commentId 评论ID
     * @return 删除结果
     */
    @DELETE("tasks/{id}/comments/{commentId}")
    suspend fun deleteComment(
        @Path("id") taskId: Int,
        @Path("commentId") commentId: Int
    ): Response<ApiResponse<Unit>>

    /**
     * 获取评论统计
     * GET /tasks/{id}/comments/stats
     *
     * @param taskId 任务ID
     * @return 评论统计信息
     */
    @GET("tasks/{id}/comments/stats")
    suspend fun getCommentStats(
        @Path("id") taskId: Int
    ): Response<CommentStatsResponse>
}
