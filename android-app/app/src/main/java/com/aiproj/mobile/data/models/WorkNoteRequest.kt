package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * 工作笔记请求/响应模型
 *
 * 注意: 本应用使用 Gson 进行 Retrofit 网络请求的 JSON 解析
 * 因此必须同时使用 @SerializedName (Gson) 和 @SerialName (Kotlinx Serialization) 注解
 */

@Serializable
data class CreateWorkNoteRequest(
    @SerializedName("title") @SerialName("title") val title: String,
    @SerializedName("content") @SerialName("content") val content: String? = null,
    @SerializedName("description") @SerialName("description") val description: String? = null,
    @SerializedName("work_note_folder_id") @SerialName("work_note_folder_id") val workNoteFolderId: Int? = null,
    @SerializedName("work_note_type") @SerialName("work_note_type") val workNoteType: WorkNoteType,
    @SerializedName("priority") @SerialName("priority") val priority: WorkNotePriority,
    @SerializedName("visibility") @SerialName("visibility") val visibility: WorkNoteVisibility,
    @SerializedName("tags") @SerialName("tags") val tags: List<String>? = null,
    @SerializedName("is_pinned") @SerialName("is_pinned") val isPinned: Boolean = false,
    @SerializedName("is_bookmarked") @SerialName("is_bookmarked") val isBookmarked: Boolean = false,
    @SerializedName("related_tasks") @SerialName("related_tasks") val relatedTasks: List<Int>? = null,
    @SerializedName("related_notes") @SerialName("related_notes") val relatedNotes: List<Int>? = null
)

@Serializable
data class UpdateWorkNoteRequest(
    @SerializedName("title") @SerialName("title") val title: String? = null,
    @SerializedName("content") @SerialName("content") val content: String? = null,
    @SerializedName("description") @SerialName("description") val description: String? = null,
    @SerializedName("work_note_folder_id") @SerialName("work_note_folder_id") val workNoteFolderId: Int? = null,
    @SerializedName("work_note_type") @SerialName("work_note_type") val workNoteType: WorkNoteType? = null,
    @SerializedName("priority") @SerialName("priority") val priority: WorkNotePriority? = null,
    @SerializedName("visibility") @SerialName("visibility") val visibility: WorkNoteVisibility? = null,
    @SerializedName("status") @SerialName("status") val status: WorkNoteStatus? = null,
    @SerializedName("tags") @SerialName("tags") val tags: List<String>? = null,
    @SerializedName("is_pinned") @SerialName("is_pinned") val isPinned: Boolean? = null,
    @SerializedName("is_bookmarked") @SerialName("is_bookmarked") val isBookmarked: Boolean? = null,
    @SerializedName("related_tasks") @SerialName("related_tasks") val relatedTasks: List<Int>? = null,
    @SerializedName("related_notes") @SerialName("related_notes") val relatedNotes: List<Int>? = null
)

@Serializable
data class WorkNoteListResponse(
    @SerializedName("data") @SerialName("data") val data: WorkNoteListData
)

@Serializable
data class WorkNoteListData(
    @SerializedName("notes") @SerialName("notes") val notes: List<WorkNote>,
    @SerializedName("total") @SerialName("total") val total: Int,
    @SerializedName("page") @SerialName("page") val page: Int,
    @SerializedName("limit") @SerialName("limit") val limit: Int
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

/**
 * 标准化响应格式 - 单个文件夹
 * 对应后端的 StandardResponse 结构
 */
@Serializable
data class StandardFolderResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String,
    @SerialName("data") val data: WorkNoteFolder,
    @SerialName("timestamp") val timestamp: Long
)

/**
 * 标准化响应格式 - 删除操作
 */
@Serializable
data class StandardDeleteResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String,
    @SerialName("data") val data: DeletedFolderInfo? = null,
    @SerialName("timestamp") val timestamp: Long
)

/**
 * 删除文件夹返回的信息
 */
@Serializable
data class DeletedFolderInfo(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("deleted_at") val deletedAt: String
)

/**
 * 搜索文件夹响应
 */
@Serializable
data class SearchFoldersResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String,
    @SerialName("data") val data: SearchFoldersData
)

/**
 * 搜索文件夹数据
 */
@Serializable
data class SearchFoldersData(
    @SerialName("folders") val folders: List<WorkNoteFolder>,
    @SerialName("pagination") val pagination: SearchPaginationInfo,
    @SerialName("query") val query: String
)

/**
 * 搜索分页信息
 */
@Serializable
data class SearchPaginationInfo(
    @SerialName("page") val page: Int,
    @SerialName("limit") val limit: Int,
    @SerialName("total") val total: Int,
    @SerialName("pages") val pages: Int
)
