package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskListResponse
import com.aiproj.mobile.data.models.TaskRequest
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
     * 开始任务
     */
    @POST("tasks/{id}/start")
    suspend fun startTask(
        @Path("id") taskId: Int
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
}
