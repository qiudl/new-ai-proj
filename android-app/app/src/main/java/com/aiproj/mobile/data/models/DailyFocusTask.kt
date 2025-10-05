package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * Daily Focus Task - 今日主要任务
 */
data class DailyFocusTask(
    @SerializedName("id")
    val id: Int,

    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("user_id")
    val userId: Int,

    @SerializedName("project_id")
    val projectId: Int,

    @SerializedName("focus_date")
    val focusDate: String, // "2025-10-05"

    @SerializedName("sort_order")
    val sortOrder: Int,

    @SerializedName("priority_level")
    val priorityLevel: DailyFocusPriority,

    @SerializedName("is_auto_suggested")
    val isAutoSuggested: Boolean = false,

    @SerializedName("suggestion_reason")
    val suggestionReason: String? = null,

    @SerializedName("suggestion_score")
    val suggestionScore: Double? = null,

    @SerializedName("status")
    val status: DailyFocusStatus,

    @SerializedName("completed_at")
    val completedAt: String? = null,

    @SerializedName("carried_from_date")
    val carriedFromDate: String? = null,

    @SerializedName("user_notes")
    val userNotes: String? = null,

    @SerializedName("estimated_duration_minutes")
    val estimatedDurationMinutes: Int? = null,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String? = null,

    // 关联的任务信息
    @SerializedName("task")
    val task: Task? = null,

    @SerializedName("project")
    val project: Project? = null,

    // JOIN查询额外字段
    @SerializedName("task_title")
    val taskTitle: String? = null,

    @SerializedName("task_description")
    val taskDescription: String? = null,

    @SerializedName("task_status")
    val taskStatus: String? = null,

    @SerializedName("task_priority")
    val taskPriority: String? = null,

    @SerializedName("task_due_date")
    val taskDueDate: String? = null,

    @SerializedName("project_name")
    val projectName: String? = null
)

/**
 * Daily Focus Priority - 优先级
 */
enum class DailyFocusPriority {
    @SerializedName("low")
    LOW,

    @SerializedName("medium")
    MEDIUM,

    @SerializedName("high")
    HIGH,

    @SerializedName("critical")
    CRITICAL
}

/**
 * Daily Focus Status - 状态
 */
enum class DailyFocusStatus {
    @SerializedName("active")
    ACTIVE,

    @SerializedName("completed")
    COMPLETED,

    @SerializedName("removed")
    REMOVED,

    @SerializedName("carried_over")
    CARRIED_OVER
}

/**
 * Task Suggestion - 智能推荐任务
 */
data class TaskSuggestion(
    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("suggestion_reason")
    val suggestionReason: String,

    @SerializedName("suggestion_score")
    val suggestionScore: Double,

    @SerializedName("estimated_duration_minutes")
    val estimatedDurationMinutes: Int,

    @SerializedName("task")
    val task: Task? = null
)

/**
 * Daily Focus Task List Response
 */
data class DailyFocusTaskListResponse(
    @SerializedName("focus_date")
    val focusDate: String,

    @SerializedName("total_count")
    val totalCount: Int,

    @SerializedName("active_count")
    val activeCount: Int,

    @SerializedName("completed_count")
    val completedCount: Int,

    @SerializedName("estimated_total_minutes")
    val estimatedTotalMinutes: Int,

    @SerializedName("tasks")
    val tasks: List<DailyFocusTask>,

    @SerializedName("suggestions")
    val suggestions: List<TaskSuggestion>? = null
)

/**
 * Create Daily Focus Task Request
 */
data class CreateDailyFocusTaskRequest(
    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("priority_level")
    val priorityLevel: String? = "medium",

    @SerializedName("estimated_duration_minutes")
    val estimatedDurationMinutes: Int? = null,

    @SerializedName("user_notes")
    val userNotes: String? = null,

    @SerializedName("focus_date")
    val focusDate: String? = null
)

/**
 * Update Daily Focus Task Request
 */
data class UpdateDailyFocusTaskRequest(
    @SerializedName("priority_level")
    val priorityLevel: String? = null,

    @SerializedName("estimated_duration_minutes")
    val estimatedDurationMinutes: Int? = null,

    @SerializedName("user_notes")
    val userNotes: String? = null
)
