package com.aiproj.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class WorkNote(
    @SerialName("id") val id: Int,
    @SerialName("title") val title: String,
    @SerialName("content") val content: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("work_note_type") val workNoteType: WorkNoteType,
    @SerialName("priority") val priority: WorkNotePriority,
    @SerialName("work_note_folder_id") val workNoteFolderId: Int? = null,
    @SerialName("visibility") val visibility: WorkNoteVisibility,
    @SerialName("status") val status: WorkNoteStatus,
    @SerialName("tags") val tags: List<String>? = null,
    @SerialName("is_pinned") val isPinned: Boolean = false,
    @SerialName("is_bookmarked") val isBookmarked: Boolean = false,
    @SerialName("read_time") val readTime: Int? = null,
    @SerialName("word_count") val wordCount: Int? = null,
    @SerialName("view_count") val viewCount: Int = 0,
    @SerialName("last_read_at") val lastReadAt: String? = null,
    @SerialName("related_tasks") val relatedTasks: List<Int>? = null,
    @SerialName("related_notes") val relatedNotes: List<Int>? = null,
    @SerialName("owner_id") val ownerId: Int,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String
)

@Serializable
enum class WorkNoteType {
    @SerialName("general") GENERAL,
    @SerialName("markdown") MARKDOWN,
    @SerialName("text") TEXT,
    @SerialName("html") HTML,
    @SerialName("research") RESEARCH,
    @SerialName("meeting") MEETING,
    @SerialName("project") PROJECT
}

@Serializable
enum class WorkNotePriority {
    @SerialName("low") LOW,
    @SerialName("medium") MEDIUM,
    @SerialName("high") HIGH,
    @SerialName("critical") CRITICAL
}

@Serializable
enum class WorkNoteVisibility {
    @SerialName("private") PRIVATE,
    @SerialName("team") TEAM,
    @SerialName("public") PUBLIC
}

@Serializable
enum class WorkNoteStatus {
    @SerialName("draft") DRAFT,
    @SerialName("published") PUBLISHED,
    @SerialName("archived") ARCHIVED
}
