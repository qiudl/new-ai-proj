package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 任务状态更新请求
 */
data class TaskStatusUpdateRequest(
    @SerializedName("status")
    val status: String
)