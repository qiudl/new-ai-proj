package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 评论模型
 */
data class Comment(
    @SerializedName("id")
    val id: Int,

    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("user_id")
    val userId: Int,

    @SerializedName("user_name")
    val userName: String? = null,

    @SerializedName("user_avatar")
    val userAvatar: String? = null,

    @SerializedName("content")
    val content: String,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String? = null
)

/**
 * 评论列表响应
 */
data class CommentListResponse(
    @SerializedName("comments")
    val comments: List<Comment>
)

/**
 * 添加评论请求
 */
data class AddCommentRequest(
    @SerializedName("content")
    val content: String
)
