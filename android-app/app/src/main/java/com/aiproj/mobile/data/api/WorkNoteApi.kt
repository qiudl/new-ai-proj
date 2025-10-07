package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface WorkNoteApi {

    // ========== 笔记CRUD ==========

    @GET("work-notes")
    suspend fun getWorkNotes(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("work_note_folder_id") folderId: Int? = null,
        @Query("work_note_type") type: String? = null,
        @Query("priority") priority: String? = null,
        @Query("visibility") visibility: String? = null,
        @Query("is_pinned") isPinned: Boolean? = null,
        @Query("is_bookmarked") isBookmarked: Boolean? = null,
        @Query("tags") tags: List<String>? = null,
        @Query("search") search: String? = null,
        @Query("sort_by") sortBy: String? = null,
        @Query("order") order: String? = null
    ): Response<WorkNoteListResponse>

    @GET("work-notes/{id}")
    suspend fun getWorkNote(
        @Path("id") id: Int
    ): Response<WorkNoteResponse>

    @POST("work-notes")
    suspend fun createWorkNote(
        @Body request: CreateWorkNoteRequest
    ): Response<WorkNoteResponse>

    @PUT("work-notes/{id}")
    suspend fun updateWorkNote(
        @Path("id") id: Int,
        @Body request: UpdateWorkNoteRequest
    ): Response<WorkNoteResponse>

    @DELETE("work-notes/{id}")
    suspend fun deleteWorkNote(
        @Path("id") id: Int
    ): Response<ApiResponse<Unit>>

    @GET("work-notes/search")
    suspend fun searchWorkNotes(
        @Query("q") query: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<WorkNoteListResponse>

    @GET("work-notes/stats")
    suspend fun getWorkNoteStats(): Response<WorkNoteStats>

    // ========== 笔记转换 ==========

    @POST("work-notes/{id}/convert-to-task-document")
    suspend fun convertToTaskDocument(
        @Path("id") id: Int,
        @Body request: ConvertToTaskDocumentRequest
    ): Response<ConversionResult>

    // ========== 文件夹管理 ==========

    @GET("work-note-folders")
    suspend fun getFolders(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 50,
        @Query("project_id") projectId: Int? = null,
        @Query("parent_id") parentId: String? = null
    ): Response<FolderListResponse>

    @GET("work-note-folders/tree")
    suspend fun getFolderTree(
        @Query("parent_id") parentId: String? = null,
        @Query("max_depth") maxDepth: Int = 2
    ): Response<FolderTreeResponse>

    @GET("work-note-folders/{id}")
    suspend fun getFolder(
        @Path("id") id: Int
    ): Response<WorkNoteFolder>

    @POST("work-note-folders")
    suspend fun createFolder(
        @Body request: CreateWorkNoteFolderRequest
    ): Response<WorkNoteFolder>

    @PUT("work-note-folders/{id}")
    suspend fun updateFolder(
        @Path("id") id: Int,
        @Body request: UpdateWorkNoteFolderRequest
    ): Response<WorkNoteFolder>

    @DELETE("work-note-folders/{id}")
    suspend fun deleteFolder(
        @Path("id") id: Int
    ): Response<ApiResponse<Unit>>

    @POST("work-note-folders/{id}/move")
    suspend fun moveFolder(
        @Path("id") id: Int,
        @Body request: MoveFolderRequest
    ): Response<WorkNoteFolder>

    // ========== 文档转换 ==========

    @POST("work-notes/{id}/convert-to-task-document")
    suspend fun convertNoteToTaskDocument(
        @Path("id") id: Int,
        @Body request: ConvertToTaskDocumentRequest
    ): Response<ConversionResult>
}
