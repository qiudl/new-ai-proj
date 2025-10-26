package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 文档数据模型
 */
data class Document(
    val id: Int,
    @SerializedName("task_id")
    val taskId: Int,
    val title: String,
    val content: String,
    val type: String? = "markdown",
    val status: String? = "draft",
    @SerializedName("created_at")
    val createdAt: String? = null,
    @SerializedName("updated_at")
    val updatedAt: String? = null,
    @SerializedName("created_by")
    val createdBy: Int? = null,
    @SerializedName("updated_by")
    val updatedBy: Int? = null,
    val version: Int = 1
)

/**
 * 文档类型枚举
 */
enum class DocumentType {
    MARKDOWN,
    TXT,
    PDF;

    companion object {
        fun fromString(value: String?): DocumentType {
            return when (value?.lowercase()) {
                "markdown", "md" -> MARKDOWN
                "txt", "text" -> TXT
                "pdf" -> PDF
                else -> MARKDOWN
            }
        }
    }
}

/**
 * 文档状态枚举
 */
enum class DocumentStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED;

    companion object {
        fun fromString(value: String?): DocumentStatus {
            return when (value?.lowercase()) {
                "draft" -> DRAFT
                "published" -> PUBLISHED
                "archived" -> ARCHIVED
                else -> DRAFT
            }
        }
    }
}

/**
 * 文档请求模型
 */
data class DocumentRequest(
    val title: String,
    val content: String,
    val type: String = "markdown",
    val status: String = "published"
)

/**
 * 文档列表响应
 */
data class DocumentListResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<Document>? = null,
    val error: String? = null
)
