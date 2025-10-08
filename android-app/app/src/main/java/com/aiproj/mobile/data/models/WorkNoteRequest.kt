package com.aiproj.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CreateWorkNoteRequest(
    @SerialName("title") val title: String,
    @SerialName("content") val content: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("work_note_folder_id") val workNoteFolderId: Int? = null,
    @SerialName("work_note_type") val workNoteType: WorkNoteType,
    @SerialName("priority") val priority: WorkNotePriority,
    @SerialName("visibility") val visibility: WorkNoteVisibility,
    @SerialName("tags") val tags: List<String>? = null,
    @SerialName("is_pinned") val isPinned: Boolean = false,
    @SerialName("is_bookmarked") val isBookmarked: Boolean = false,
    @SerialName("related_tasks") val relatedTasks: List<Int>? = null,
    @SerialName("related_notes") val relatedNotes: List<Int>? = null
)

@Serializable
data class UpdateWorkNoteRequest(
    @SerialName("title") val title: String? = null,
    @SerialName("content") val content: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("work_note_folder_id") val workNoteFolderId: Int? = null,
    @SerialName("work_note_type") val workNoteType: WorkNoteType? = null,
    @SerialName("priority") val priority: WorkNotePriority? = null,
    @SerialName("visibility") val visibility: WorkNoteVisibility? = null,
    @SerialName("status") val status: WorkNoteStatus? = null,
    @SerialName("tags") val tags: List<String>? = null,
    @SerialName("is_pinned") val isPinned: Boolean? = null,
    @SerialName("is_bookmarked") val isBookmarked: Boolean? = null,
    @SerialName("related_tasks") val relatedTasks: List<Int>? = null,
    @SerialName("related_notes") val relatedNotes: List<Int>? = null
)

@Serializable
data class WorkNoteListResponse(
    @SerialName("data") val data: WorkNoteListData
)

@Serializable
data class WorkNoteListData(
    @SerialName("notes") val notes: List<WorkNote>,
    @SerialName("total") val total: Int,
    @SerialName("page") val page: Int,
    @SerialName("limit") val limit: Int
)

@Serializable
data class ConvertToTaskDocumentRequest(
    @SerialName("target_task_id") val targetTaskId: Int,
    @SerialName("conversion_options") val conversionOptions: ConversionOptions
)

@Serializable
data class ConversionOptions(
    @SerialName("preserve_original") val preserveOriginal: Boolean = true,
    @SerialName("copy_relations") val copyRelations: Boolean = true,
    @SerialName("convert_format") val convertFormat: String = "markdown",
    @SerialName("visibility") val visibility: WorkNoteVisibility = WorkNoteVisibility.PRIVATE,
    @SerialName("relation_type") val relationType: String = "attachment"
)

@Serializable
data class ConversionResult(
    @SerialName("original_work_note_id") val originalWorkNoteId: Int,
    @SerialName("created_task_document") val createdTaskDocument: TaskDocumentSummary,
    @SerialName("conversion_summary") val conversionSummary: ConversionSummary
)

@Serializable
data class TaskDocumentSummary(
    @SerialName("id") val id: Int,
    @SerialName("task_id") val taskId: Int,
    @SerialName("title") val title: String,
    @SerialName("format") val format: String,
    @SerialName("created_at") val createdAt: String
)

@Serializable
data class ConversionSummary(
    @SerialName("content_migrated") val contentMigrated: Boolean,
    @SerialName("relations_copied") val relationsCopied: Int,
    @SerialName("attachments_moved") val attachmentsMoved: Int
)

@Serializable
data class CreateWorkNoteFolderRequest(
    @SerialName("name") val name: String,
    @SerialName("description") val description: String? = null,
    @SerialName("parent_id") val parentId: Int? = null,
    @SerialName("visibility") val visibility: WorkNoteVisibility,
    @SerialName("color") val color: String? = null,
    @SerialName("icon") val icon: String? = null
)

@Serializable
data class UpdateWorkNoteFolderRequest(
    @SerialName("name") val name: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("parent_id") val parentId: Int? = null,
    @SerialName("visibility") val visibility: WorkNoteVisibility? = null,
    @SerialName("color") val color: String? = null,
    @SerialName("icon") val icon: String? = null
)

@Serializable
data class MoveFolderRequest(
    @SerialName("target_parent_id") val targetParentId: Int?,
    @SerialName("sort_order") val sortOrder: Int? = null
)

@Serializable
data class WorkNoteStats(
    @SerialName("total_notes") val totalNotes: Int,
    @SerialName("notes_by_type") val notesByType: Map<String, Int>,
    @SerialName("notes_by_priority") val notesByPriority: Map<String, Int>,
    @SerialName("notes_by_folder") val notesByFolder: Map<Int, Int>,
    @SerialName("pinned_count") val pinnedCount: Int,
    @SerialName("bookmarked_count") val bookmarkedCount: Int
)

@Serializable
data class FolderListResponse(
    @SerialName("data") val data: FolderListData
)

@Serializable
data class FolderListData(
    @SerialName("items") val items: List<WorkNoteFolder>,
    @SerialName("pagination") val pagination: PaginationInfo
)

@Serializable
data class PaginationInfo(
    @SerialName("page") val page: Int,
    @SerialName("size") val size: Int,
    @SerialName("total") val total: Long,
    @SerialName("totalPages") val totalPages: Int
)

@Serializable
data class FolderTreeResponse(
    @SerialName("data") val data: List<WorkNoteFolder>
)
