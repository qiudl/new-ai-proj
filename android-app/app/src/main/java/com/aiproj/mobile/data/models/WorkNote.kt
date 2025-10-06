package com.aiproj.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class WorkNote(
    @SerialName("id") val id: Int,
    @SerialName("title") val title: String? = "",
    @SerialName("content") val content: String? = null,
    @SerialName("description") val description: String? = null,
    // 使用 work_note_type 字段（后端主要字段），忽略 type 字段
    @SerialName("work_note_type") val workNoteType: WorkNoteType? = WorkNoteType.GENERAL,
    @SerialName("priority") val priority: WorkNotePriority? = WorkNotePriority.MEDIUM,
    @SerialName("work_note_folder_id") val workNoteFolderId: Int? = null,
    @SerialName("visibility") val visibility: WorkNoteVisibility? = WorkNoteVisibility.PRIVATE,
    @SerialName("status") val status: WorkNoteStatus? = WorkNoteStatus.DRAFT,
    @SerialName("tags") val tags: List<String>? = null,
    @SerialName("is_pinned") val isPinned: Boolean = false,
    @SerialName("is_bookmarked") val isBookmarked: Boolean = false,
    @SerialName("read_time") val readTime: Int? = null,
    @SerialName("word_count") val wordCount: Int? = null,
    @SerialName("view_count") val viewCount: Int = 0,
    @SerialName("last_read_at") val lastReadAt: String? = null,
    @SerialName("related_tasks") val relatedTasks: List<Int>? = null,
    @SerialName("related_notes") val relatedNotes: List<Int>? = null,
    @SerialName("owner_id") val ownerId: Int = 0,
    @SerialName("owner_name") val ownerName: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
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
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String? = null,
    @SerialName("data") val data: WorkNote
)
