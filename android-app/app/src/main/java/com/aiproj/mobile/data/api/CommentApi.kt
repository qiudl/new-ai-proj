package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.AddCommentRequest
import com.aiproj.mobile.data.models.Comment
import com.aiproj.mobile.data.models.CommentListResponse
import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

/**
 * 评论API接口
 */
interface CommentApi {
    /**
     * 获取任务的评论列表
     * @param taskId 任务ID
     * @param page 页码（可选，默认1）
     * @param limit 每页数量（可选，默认20）
     */
    @GET("tasks/{taskId}/comments")
    suspend fun getComments(
        @Path("taskId") taskId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<CommentListResponse>

    /**
     * 添加评论
     * @param taskId 任务ID
     * @param request 评论内容
     */
    @POST("tasks/{taskId}/comments")
    suspend fun addComment(
        @Path("taskId") taskId: Int,
        @Body request: AddCommentRequest
    ): Response<Comment>

    /**
     * 更新评论
     * @param taskId 任务ID
     * @param commentId 评论ID
     * @param request 更新内容
     */
    @PUT("tasks/{taskId}/comments/{commentId}")
    suspend fun updateComment(
        @Path("taskId") taskId: Int,
        @Path("commentId") commentId: Int,
        @Body request: AddCommentRequest
    ): Response<Comment>

    /**
     * 删除评论
     * @param taskId 任务ID
     * @param commentId 评论ID
     */
    @DELETE("tasks/{taskId}/comments/{commentId}")
    suspend fun deleteComment(
        @Path("taskId") taskId: Int,
        @Path("commentId") commentId: Int
    ): Response<Unit>
}
