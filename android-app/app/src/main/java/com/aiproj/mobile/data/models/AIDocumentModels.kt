package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * AI文档类型
 */
data class AIDocumentType(
    @SerializedName("type")
    val type: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("description")
    val description: String
)

/**
 * 文档类型列表响应数据
 */
data class DocumentTypesData(
    @SerializedName("types")
    val types: List<AIDocumentType>,
    @SerializedName("total")
    val total: Int
)

/**
 * 文档生成选项
 */
data class DocumentGenOptions(
    @SerializedName("include_subtasks")
    val includeSubtasks: Boolean = false,
    @SerializedName("include_code_examples")
    val includeCodeExamples: Boolean = false,
    @SerializedName("language")
    val language: String = "zh"
)

/**
 * AI文档生成请求
 */
data class AIDocumentGenerateRequest(
    @SerializedName("task_id")
    val taskId: Int,
    @SerializedName("model")
    val model: String,
    @SerializedName("document_type")
    val documentType: String,
    @SerializedName("custom_prompt")
    val customPrompt: String? = null,
    @SerializedName("options")
    val options: DocumentGenOptions? = null
)

/**
 * 文档元数据
 */
data class DocumentMetadata(
    @SerializedName("word_count")
    val wordCount: Int,
    @SerializedName("estimated_read_time")
    val estimatedReadTime: String,
    @SerializedName("sections")
    val sections: List<String>
)

/**
 * 生成的文档数据
 */
data class DocumentData(
    @SerializedName("title")
    val title: String,
    @SerializedName("content")
    val content: String,
    @SerializedName("metadata")
    val metadata: DocumentMetadata
)

/**
 * AI文档生成响应
 */
data class AIDocumentGenerateResponse(
    @SerializedName("document")
    val document: DocumentData,
    @SerializedName("model_used")
    val modelUsed: String,
    @SerializedName("generated_at")
    val generatedAt: String
)

/**
 * 保存文档请求
 */
data class SaveDocumentRequest(
    @SerializedName("task_id")
    val taskId: Int,
    @SerializedName("title")
    val title: String,
    @SerializedName("content")
    val content: String,
    @SerializedName("project_id")
    val projectId: Int? = null
)

/**
 * 保存文档响应数据
 */
data class SaveDocumentData(
    @SerializedName("document_id")
    val documentId: Int,
    @SerializedName("task_id")
    val taskId: Int,
    @SerializedName("created_at")
    val createdAt: String
)

/**
 * 保存文档响应
 */
data class SaveDocumentResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("data")
    val data: SaveDocumentData,
    @SerializedName("message")
    val message: String
)

/**
 * AI文档模板（从后端获取）
 */
data class AIDocumentTemplate(
    @SerializedName("id")
    val id: Int,
    @SerializedName("name")
    val name: String,
    @SerializedName("type")
    val type: String,
    @SerializedName("description")
    val description: String,
    @SerializedName("template_content")
    val templateContent: String
)

/**
 * 文档模板列表响应数据
 */
data class DocumentTemplatesData(
    @SerializedName("templates")
    val templates: List<AIDocumentTemplate>,
    @SerializedName("total")
    val total: Int
)
