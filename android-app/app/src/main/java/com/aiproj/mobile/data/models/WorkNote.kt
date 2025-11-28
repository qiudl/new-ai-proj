package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * 工作笔记模型
 *
 * 注意: 本应用使用 Gson 进行 Retrofit 网络请求的 JSON 解析
 * 因此必须同时使用 @SerializedName (Gson) 和 @SerialName (Kotlinx Serialization) 注解
 * - @SerializedName: 用于 Retrofit 网络请求
 * - @SerialName: 用于本地缓存序列化
 */
@Serializable
data class WorkNote(
    @SerializedName("id") @SerialName("id") val id: Int,
    @SerializedName("title") @SerialName("title") val title: String? = "",
    @SerializedName("content") @SerialName("content") val content: String? = null,
    @SerializedName("description") @SerialName("description") val description: String? = null,
    // 使用 work_note_type 字段（后端主要字段），忽略 type 字段
    @SerializedName("work_note_type") @SerialName("work_note_type") val workNoteType: WorkNoteType? = WorkNoteType.GENERAL,
    @SerializedName("priority") @SerialName("priority") val priority: WorkNotePriority? = WorkNotePriority.MEDIUM,
    @SerializedName("work_note_folder_id") @SerialName("work_note_folder_id") val workNoteFolderId: Int? = null,
    @SerializedName("visibility") @SerialName("visibility") val visibility: WorkNoteVisibility? = WorkNoteVisibility.PRIVATE,
    @SerializedName("status") @SerialName("status") val status: WorkNoteStatus? = WorkNoteStatus.DRAFT,
    @SerializedName("tags") @SerialName("tags") val tags: List<String>? = null,
    @SerializedName("is_pinned") @SerialName("is_pinned") val isPinned: Boolean = false,
    @SerializedName("is_bookmarked") @SerialName("is_bookmarked") val isBookmarked: Boolean = false,
    @SerializedName("read_time") @SerialName("read_time") val readTime: Int? = null,
    @SerializedName("word_count") @SerialName("word_count") val wordCount: Int? = null,
    @SerializedName("view_count") @SerialName("view_count") val viewCount: Int = 0,
    @SerializedName("last_read_at") @SerialName("last_read_at") val lastReadAt: String? = null,
    @SerializedName("related_tasks") @SerialName("related_tasks") val relatedTasks: List<Int>? = null,
    @SerializedName("related_notes") @SerialName("related_notes") val relatedNotes: List<Int>? = null,
    @SerializedName("owner_id") @SerialName("owner_id") val ownerId: Int = 0,
    @SerializedName("owner_name") @SerialName("owner_name") val ownerName: String? = null,
    @SerializedName("created_at") @SerialName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") @SerialName("updated_at") val updatedAt: String? = null
    // 忽略其他额外字段: project_id, folder_id, type, file_url, file_size, mime_type,
    // version, parent_document_id, is_template, created_by, deleted_at, archived,
    // archived_at, archived_by, unarchived_at, unarchived_by
    // 这些字段会被 ignoreUnknownKeys = true 自动忽略
)

@Serializable
enum class WorkNoteType {
    @SerialName("general") @com.google.gson.annotations.SerializedName("general") GENERAL,
    @SerialName("markdown") @com.google.gson.annotations.SerializedName("markdown") MARKDOWN,
    @SerialName("text") @com.google.gson.annotations.SerializedName("text") TEXT,
    @SerialName("html") @com.google.gson.annotations.SerializedName("html") HTML,
    @SerialName("research") @com.google.gson.annotations.SerializedName("research") RESEARCH,
    @SerialName("meeting") @com.google.gson.annotations.SerializedName("meeting") MEETING,
    @SerialName("project") @com.google.gson.annotations.SerializedName("project") PROJECT
}

@Serializable
enum class WorkNotePriority {
    @SerialName("low") @com.google.gson.annotations.SerializedName("low") LOW,
    @SerialName("medium") @com.google.gson.annotations.SerializedName("medium") MEDIUM,
    @SerialName("high") @com.google.gson.annotations.SerializedName("high") HIGH,
    @SerialName("critical") @com.google.gson.annotations.SerializedName("critical") CRITICAL
}

@Serializable
enum class WorkNoteVisibility {
    @SerialName("private") @com.google.gson.annotations.SerializedName("private") PRIVATE,
    @SerialName("team") @com.google.gson.annotations.SerializedName("team") TEAM,
    @SerialName("public") @com.google.gson.annotations.SerializedName("public") PUBLIC
}

@Serializable
enum class WorkNoteStatus {
    @SerialName("draft") @com.google.gson.annotations.SerializedName("draft") DRAFT,
    @SerialName("published") @com.google.gson.annotations.SerializedName("published") PUBLISHED,
    @SerialName("archived") @com.google.gson.annotations.SerializedName("archived") ARCHIVED
}

/**
 * 单个笔记响应包装
 */
@Serializable
data class WorkNoteResponse(
    @SerializedName("success") @SerialName("success") val success: Boolean,
    @SerializedName("message") @SerialName("message") val message: String? = null,
    @SerializedName("data") @SerialName("data") val data: WorkNote
)
