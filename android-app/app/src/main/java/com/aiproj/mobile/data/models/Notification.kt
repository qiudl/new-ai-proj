package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 通知类型
 */
enum class NotificationType {
    @SerializedName("task_assigned")
    TASK_ASSIGNED,

    @SerializedName("task_updated")
    TASK_UPDATED,

    @SerializedName("task_completed")
    TASK_COMPLETED,

    @SerializedName("comment_added")
    COMMENT_ADDED,

    @SerializedName("deadline_approaching")
    DEADLINE_APPROACHING,

    @SerializedName("project_updated")
    PROJECT_UPDATED,

    @SerializedName("system")
    SYSTEM
}

/**
 * 通知数据模型
 */
data class Notification(
    @SerializedName("id")
    val id: Int,

    @SerializedName("type")
    val type: NotificationType,

    @SerializedName("title")
    val title: String,

    @SerializedName("message")
    val message: String,

    @SerializedName("is_read")
    val isRead: Boolean = false,

    @SerializedName("related_task_id")
    val relatedTaskId: Int? = null,

    @SerializedName("related_project_id")
    val relatedProjectId: Int? = null,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("read_at")
    val readAt: String? = null
)

/**
 * 通知列表响应
 */
data class NotificationListResponse(
    @SerializedName("notifications")
    val notifications: List<Notification>,

    @SerializedName("total")
    val total: Int,

    @SerializedName("unread_count")
    val unreadCount: Int,

    @SerializedName("pagination")
    val pagination: Pagination?
)
