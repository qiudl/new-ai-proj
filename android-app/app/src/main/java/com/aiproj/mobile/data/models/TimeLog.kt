package com.aiproj.mobile.data.models

/**
 * 时间记录模型
 */
data class TimeLog(
    val id: Long,
    val taskId: Long,
    val userId: Long,
    val startedAt: String,
    val endedAt: String?,
    val description: String?,
    val duration: Int? = null
)
