package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 子任务生成请求
 */
data class SubtaskGenerateRequest(
    @SerializedName("task_id")
    val taskId: Int,
    @SerializedName("model")
    val model: String,
    @SerializedName("count")
    val count: Int = 5,
    @SerializedName("custom_prompt")
    val customPrompt: String? = null,
    @SerializedName("include_estimates")
    val includeEstimates: Boolean = true
)

/**
 * 生成的子任务
 */
data class GeneratedSubtask(
    @SerializedName("title")
    val title: String,
    @SerializedName("description")
    val description: String,
    @SerializedName("priority")
    val priority: String,
    @SerializedName("estimated_hours")
    val estimatedHours: Float? = null,
    @SerializedName("order")
    val order: Int
)

/**
 * 子任务元数据
 */
data class SubtaskMetadata(
    @SerializedName("total_subtasks")
    val totalSubtasks: Int,
    @SerializedName("estimated_total_hours")
    val estimatedTotalHours: Float? = null,
    @SerializedName("breakdown_logic")
    val breakdownLogic: String
)

/**
 * 子任务生成响应
 */
data class SubtaskGenerateResponse(
    @SerializedName("subtasks")
    val subtasks: List<GeneratedSubtask>,
    @SerializedName("metadata")
    val metadata: SubtaskMetadata,
    @SerializedName("model_used")
    val modelUsed: String,
    @SerializedName("generated_at")
    val generatedAt: String
)

/**
 * 批量创建子任务请求
 */
data class BatchCreateSubtasksRequest(
    @SerializedName("parent_task_id")
    val parentTaskId: Int,
    @SerializedName("subtasks")
    val subtasks: List<SubtaskCreateData>
)

/**
 * 子任务创建数据
 */
data class SubtaskCreateData(
    @SerializedName("title")
    val title: String,
    @SerializedName("description")
    val description: String,
    @SerializedName("priority")
    val priority: String = "medium",
    @SerializedName("status")
    val status: String = "todo"
)

/**
 * 创建的子任务结果
 */
data class CreatedSubtask(
    @SerializedName("id")
    val id: Int,
    @SerializedName("title")
    val title: String,
    @SerializedName("parent_task_id")
    val parentTaskId: Int,
    @SerializedName("created_at")
    val createdAt: String
)

/**
 * 批量创建子任务响应
 */
data class BatchCreateSubtasksResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("created_count")
    val createdCount: Int,
    @SerializedName("subtasks")
    val subtasks: List<CreatedSubtask>,
    @SerializedName("message")
    val message: String
)
