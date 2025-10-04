package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 任务数据模型
 */
data class Task(
    @SerializedName("id")
    val id: Int,

    @SerializedName("project_id")
    val projectId: Int,

    @SerializedName("title")
    val title: String,

    @SerializedName("description")
    val description: String?,

    @SerializedName("status")
    val status: TaskStatus,

    @SerializedName("priority")
    val priority: TaskPriority?,

    @SerializedName("assignee_id")
    val assigneeId: Int?,

    @SerializedName("assignee")
    val assignee: User?,

    @SerializedName("parent_id")
    val parentId: Int?,

    @SerializedName("due_date")
    val dueDate: String?,

    @SerializedName("estimated_minutes")
    val estimatedMinutes: Int?,

    @SerializedName("actual_minutes")
    val actualMinutes: Int?,

    @SerializedName("children_count")
    val childrenCount: Int?,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String
)

/**
 * 任务状态枚举
 */
enum class TaskStatus {
    @SerializedName("draft")
    DRAFT,

    @SerializedName("planning")
    PLANNING,

    @SerializedName("todo")
    TODO,

    @SerializedName("in_progress")
    IN_PROGRESS,

    @SerializedName("testing")
    TESTING,

    @SerializedName("completed")
    COMPLETED,

    @SerializedName("cancelled")
    CANCELLED,

    @SerializedName("on_hold")
    ON_HOLD,

    @SerializedName("blocked")
    BLOCKED,

    @SerializedName("archived")
    ARCHIVED
}

/**
 * 任务优先级枚举
 */
enum class TaskPriority {
    @SerializedName("low")
    LOW,

    @SerializedName("medium")
    MEDIUM,

    @SerializedName("high")
    HIGH
}

/**
 * 任务列表响应
 */
data class TaskListResponse(
    @SerializedName("tasks")
    val tasks: List<Task>,

    @SerializedName("total")
    val total: Int,

    @SerializedName("pagination")
    val pagination: Pagination?
)

/**
 * 创建/更新任务请求
 */
data class TaskRequest(
    @SerializedName("title")
    val title: String,

    @SerializedName("description")
    val description: String? = null,

    @SerializedName("status")
    val status: TaskStatus? = null,

    @SerializedName("priority")
    val priority: TaskPriority? = null,

    @SerializedName("assignee_id")
    val assigneeId: Int? = null,

    @SerializedName("parent_id")
    val parentId: Int? = null,

    @SerializedName("project_id")
    val projectId: Int? = null,

    @SerializedName("due_date")
    val dueDate: String? = null,

    @SerializedName("estimated_minutes")
    val estimatedMinutes: Int? = null
)
