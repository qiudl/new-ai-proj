package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 描述生成请求
 */
data class DescriptionGenerateRequest(
    @SerializedName("model")
    val model: String,
    @SerializedName("custom_prompt")
    val customPrompt: String? = null,
    @SerializedName("length")
    val length: String = "medium", // short, medium, long
    @SerializedName("style")
    val style: String = "technical" // technical, business, casual
)

/**
 * 描述生成响应
 */
data class DescriptionGenerateResponse(
    @SerializedName("description")
    val description: String,
    @SerializedName("model_used")
    val modelUsed: String,
    @SerializedName("generated_at")
    val generatedAt: String,
    @SerializedName("word_count")
    val wordCount: Int
)

/**
 * 更新任务描述请求
 */
data class UpdateDescriptionRequest(
    @SerializedName("description")
    val description: String
)

/**
 * 描述建议
 */
data class DescriptionSuggestion(
    @SerializedName("description")
    val description: String,
    @SerializedName("style")
    val style: String,
    @SerializedName("length")
    val length: String,
    @SerializedName("score")
    val score: Float
)

/**
 * 描述建议列表响应
 */
data class DescriptionSuggestionsResponse(
    @SerializedName("suggestions")
    val suggestions: List<DescriptionSuggestion>,
    @SerializedName("model_used")
    val modelUsed: String,
    @SerializedName("generated_at")
    val generatedAt: String
)

/**
 * 批量生成描述请求
 */
data class BatchGenerateDescriptionsRequest(
    @SerializedName("task_ids")
    val taskIds: List<Int>,
    @SerializedName("model")
    val model: String,
    @SerializedName("auto_update")
    val autoUpdate: Boolean = false
)

/**
 * 批量生成描述结果
 */
data class BatchDescriptionResult(
    @SerializedName("task_id")
    val taskId: Int,
    @SerializedName("description")
    val description: String,
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("error")
    val error: String? = null
)

/**
 * 批量生成描述响应
 */
data class BatchGenerateDescriptionsResponse(
    @SerializedName("results")
    val results: List<BatchDescriptionResult>,
    @SerializedName("total_count")
    val totalCount: Int,
    @SerializedName("success_count")
    val successCount: Int,
    @SerializedName("model_used")
    val modelUsed: String
)
