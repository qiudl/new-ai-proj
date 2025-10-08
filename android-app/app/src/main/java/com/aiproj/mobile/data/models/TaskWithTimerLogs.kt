package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 任务及其计时记录
 * 用于每日任务列表，包含任务基本信息和timer logs
 */
data class TaskWithTimerLogs(
    @SerializedName("id")
    val id: Int,

    @SerializedName("project_id")
    val projectId: Int,

    @SerializedName("project_name")
    val projectName: String,

    @SerializedName("title")
    val title: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("priority")
    val priority: String,

    @SerializedName("work_hours")
    val workHours: Float,

    @SerializedName("timer_logs")
    val timerLogs: List<TimerLogEntry>,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String
)

/**
 * 计时记录条目
 * 包含开始时间、结束时间和实际工作秒数
 */
data class TimerLogEntry(
    @SerializedName("id")
    val id: Int,

    @SerializedName("start_time")
    val startTime: String,      // "09:30" 格式

    @SerializedName("end_time")
    val endTime: String?,       // "12:00" 格式，可能为null（正在进行中的任务）

    @SerializedName("actual_work_seconds")
    val actualWorkSeconds: Int,

    @SerializedName("status")
    val status: String
)

/**
 * 每日任务及计时记录响应
 */
data class DailyTasksWithTimersResponse(
    @SerializedName("date")
    val date: String,

    @SerializedName("count")
    val count: Int,

    @SerializedName("tasks")
    val tasks: List<TaskWithTimerLogs>
)
