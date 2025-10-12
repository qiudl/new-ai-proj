package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 评论模型 - 与后端API完全兼容
 */
data class Comment(
    @SerializedName("id")
    val id: Int,

    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("user_id")
    val userId: Int,

    @SerializedName("content")
    val content: String,

    @SerializedName("status")
    val status: String = "active",  // active/deleted/pending

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String,

    @SerializedName("user")
    val user: CommentUser? = null,

    @SerializedName("can_delete")
    val canDelete: Boolean = false,

    // 向后兼容字段（已废弃，使用user.name代替）
    @Deprecated("Use user.name instead", ReplaceWith("user?.name"))
    val userName: String? = user?.name,

    @Deprecated("Use user.avatar instead", ReplaceWith("user?.avatar"))
    val userAvatar: String? = user?.avatar
)

/**
 * 评论用户信息
 */
data class CommentUser(
    @SerializedName("id")
    val id: Int,

    @SerializedName("name")
    val name: String,

    @SerializedName("avatar")
    val avatar: String = ""
)

/**
 * 评论统计
 */
data class CommentStats(
    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("total_comments")
    val totalComments: Int,

    @SerializedName("participants")
    val participants: Int,

    @SerializedName("last_comment_at")
    val lastCommentAt: String?
)

/**
 * 评论列表数据
 */
data class CommentListData(
    @SerializedName("comments")
    val comments: List<Comment>,

    @SerializedName("total")
    val total: Int,

    @SerializedName("page")
    val page: Int,

    @SerializedName("page_size")
    val pageSize: Int
)

/**
 * 评论列表响应
 */
data class CommentListResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: CommentListData
)

/**
 * 单个评论响应
 */
data class CommentResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: Comment
)

/**
 * 评论统计响应
 */
data class CommentStatsResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: CommentStats
)

/**
 * 添加评论请求
 */
data class AddCommentRequest(
    @SerializedName("content")
    val content: String
)
