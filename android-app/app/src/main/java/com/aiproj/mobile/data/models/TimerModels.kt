package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 计时器状态
 * 对应后端模型: TimerStatus
 */
data class TimerStatus(
    @SerializedName("id")
    val id: Long,

    @SerializedName("user_id")
    val userId: Long = -1,

    @SerializedName("task_id")
    val taskId: Long? = null,

    @SerializedName("task_title")
    val taskTitle: String? = null,

    @SerializedName("project_id")
    val projectId: Long? = null,

    @SerializedName("project_name")
    val projectName: String? = null,

    @SerializedName("timer_type")
    val timerType: String = "project_task",

    @SerializedName("status")
    val status: String,

    @SerializedName("description")
    val description: String? = null,

    @SerializedName("started_at")
    val startedAt: String,

    @SerializedName("paused_at")
    val pausedAt: String? = null,

    @SerializedName("resumed_at")
    val resumedAt: String? = null,

    @SerializedName("stopped_at")
    val stoppedAt: String? = null,

    @SerializedName("elapsed_seconds")
    val elapsedSeconds: Long = 0,

    @SerializedName("paused_duration")
    val pausedDuration: Long = 0,

    @SerializedName("is_local")
    val isLocal: Boolean = false
)

/**
 * 启动计时器请求
 */
data class StartTimerRequest(
    @SerializedName("task_id")
    val taskId: Long? = null,

    @SerializedName("timer_type")
    val timerType: String = "project_task",

    @SerializedName("description")
    val description: String? = null,

    @SerializedName("auto_stop_others")
    val autoStopOthers: Boolean = true,

    @SerializedName("tags")
    val tags: List<String>? = null
)

/**
 * 计时器类型枚举
 */
enum class TimerType {
    PROJECT_TASK,
    PERSONAL_TASK,
    QUICK_TIMER,
    POMODORO;

    companion object {
        fun fromString(value: String): TimerType {
            return when (value.lowercase()) {
                "project_task" -> PROJECT_TASK
                "personal_task" -> PERSONAL_TASK
                "quick_timer" -> QUICK_TIMER
                "pomodoro" -> POMODORO
                else -> PROJECT_TASK
            }
        }
    }

    fun toApiString(): String {
        return when (this) {
            PROJECT_TASK -> "project_task"
            PERSONAL_TASK -> "personal_task"
            QUICK_TIMER -> "quick_timer"
            POMODORO -> "pomodoro"
        }
    }
}

/**
 * 计时器状态枚举
 */
enum class TimerStatusEnum {
    RUNNING,
    PAUSED,
    COMPLETED,
    CANCELLED;

    companion object {
        fun fromString(value: String): TimerStatusEnum {
            return when (value.lowercase()) {
                "running" -> RUNNING
                "paused" -> PAUSED
                "completed" -> COMPLETED
                "cancelled" -> CANCELLED
                else -> RUNNING
            }
        }
    }

    fun toApiString(): String {
        return when (this) {
            RUNNING -> "running"
            PAUSED -> "paused"
            COMPLETED -> "completed"
            CANCELLED -> "cancelled"
        }
    }
}

/**
 * 离线计时记录
 */
data class OfflineTimerRecord(
    @SerializedName("local_id")
    val localId: String,

    @SerializedName("task_id")
    val taskId: Long? = null,

    @SerializedName("title")
    val title: String? = null,

    @SerializedName("start_time")
    val startTime: Long,

    @SerializedName("end_time")
    val endTime: Long? = null,

    @SerializedName("elapsed_seconds")
    val elapsedSeconds: Long = 0,

    @SerializedName("sync_status")
    val syncStatus: String = "pending",

    @SerializedName("created_at")
    val createdAt: Long,

    @SerializedName("metadata")
    val metadata: String? = null
)

/**
 * 同步状态枚举
 */
enum class SyncStatus {
    PENDING,
    SYNCED,
    FAILED;

    fun toApiString(): String {
        return when (this) {
            PENDING -> "pending"
            SYNCED -> "synced"
            FAILED -> "failed"
        }
    }

    companion object {
        fun fromString(value: String): SyncStatus {
            return when (value.lowercase()) {
                "pending" -> PENDING
                "synced" -> SYNCED
                "failed" -> FAILED
                else -> PENDING
            }
        }
    }
}

/**
 * 计时器历史记录
 * 用于历史记录页面展示
 */
data class TimerLog(
    @SerializedName("id")
    val id: Long,

    @SerializedName("task_id")
    val taskId: Long? = null,

    @SerializedName("task_title")
    val taskTitle: String? = null,

    @SerializedName("project_id")
    val projectId: Long? = null,

    @SerializedName("project_name")
    val projectName: String? = null,

    @SerializedName("timer_type")
    val timerType: String = "project_task",

    @SerializedName("status")
    val status: String,

    @SerializedName("description")
    val description: String? = null,

    @SerializedName("started_at")
    val startedAt: String,

    @SerializedName("paused_at")
    val pausedAt: String? = null,

    @SerializedName("stopped_at")
    val stoppedAt: String? = null,

    @SerializedName("duration")
    val duration: Int? = null,  // 分钟

    @SerializedName("created_at")
    val createdAt: String
)

/**
 * 计时器历史记录响应
 * 包含分页信息和统计数据
 */
data class TimerHistoryResponse(
    @SerializedName("logs")
    val logs: List<TimerLog>,

    @SerializedName("total")
    val total: Int,

    @SerializedName("page")
    val page: Int,

    @SerializedName("page_size")
    val pageSize: Int,

    @SerializedName("stats")
    val stats: TimeStatsData? = null
)
