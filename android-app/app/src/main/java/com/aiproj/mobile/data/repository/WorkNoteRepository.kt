package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.WorkNoteApi
import com.aiproj.mobile.data.local.CacheManager
import com.aiproj.mobile.data.models.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WorkNoteRepository @Inject constructor(
    private val api: WorkNoteApi,
    private val cacheManager: CacheManager,
    private val json: Json
) {

    // ========== 笔记CRUD ==========

    suspend fun getNotes(
        page: Int = 1,
        limit: Int = 20,
        folderId: Int? = null,
        type: WorkNoteType? = null,
        priority: WorkNotePriority? = null,
        isPinned: Boolean? = null,
        isBookmarked: Boolean? = null,
        search: String? = null,
        sortBy: String? = null,
        order: String? = null
    ): Result<WorkNoteListResponse> {
        return try {
            val response = api.getWorkNotes(
                page = page,
                limit = limit,
                folderId = folderId,
                type = type?.name?.lowercase(),
                priority = priority?.name?.lowercase(),
                isPinned = isPinned,
                isBookmarked = isBookmarked,
                search = search,
                sortBy = sortBy,
                order = order
            )

            if (response.isSuccessful && response.body() != null) {
                val responseData = response.body()!!
                // 缓存笔记列表
                cacheNotes(responseData.data.notes)
                Result.success(responseData)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "获取工作笔记列表失败"))
            }
        } catch (e: Exception) {
            // 尝试从缓存读取
            val cachedNotes = getCachedNotes()
            if (cachedNotes.isNotEmpty()) {
                Result.success(
                    WorkNoteListResponse(
                        data = WorkNoteListData(
                            notes = cachedNotes,
                            total = cachedNotes.size,
                            page = 1,
                            limit = cachedNotes.size
                        )
                    )
                )
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getNoteById(id: Int): Result<WorkNote> {
        return try {
            val response = api.getWorkNote(id)
            if (response.isSuccessful && response.body() != null) {
                val note = response.body()!!
                cacheNote(note)
                Result.success(note)
            } else {
                Result.failure(Exception("获取笔记详情失败"))
            }
        } catch (e: Exception) {
            // 尝试从缓存读取
            val cachedNote = getCachedNote(id)
            if (cachedNote != null) {
                Result.success(cachedNote)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun createNote(request: CreateWorkNoteRequest): Result<WorkNote> {
        return try {
            val response = api.createWorkNote(request)
            if (response.isSuccessful && response.body() != null) {
                val note = response.body()!!
                cacheNote(note)
                Result.success(note)
            } else {
                Result.failure(Exception("创建笔记失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateNote(id: Int, request: UpdateWorkNoteRequest): Result<WorkNote> {
        return try {
            val response = api.updateWorkNote(id, request)
            if (response.isSuccessful && response.body() != null) {
                val note = response.body()!!
                cacheNote(note)
                Result.success(note)
            } else {
                Result.failure(Exception("更新笔记失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteNote(id: Int): Result<Unit> {
        return try {
            val response = api.deleteWorkNote(id)
            if (response.isSuccessful) {
                removeCachedNote(id)
                Result.success(Unit)
            } else {
                Result.failure(Exception("删除笔记失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun searchNotes(query: String, page: Int = 1): Result<WorkNoteListResponse> {
        return try {
            val response = api.searchWorkNotes(query, page)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("搜索失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ========== 文件夹管理 ==========

    suspend fun getFolders(
        page: Int = 1,
        pageSize: Int = 50,
        parentId: Int? = null
    ): Result<List<WorkNoteFolder>> {
        return try {
            val parentIdStr = parentId?.toString() ?: "null"
            val response = api.getFolders(page, pageSize, parentId = parentIdStr)
            if (response.isSuccessful && response.body() != null) {
                val folders = response.body()!!.data.items
                cacheFolders(folders)
                Result.success(folders)
            } else {
                Result.failure(Exception("获取文件夹列表失败"))
            }
        } catch (e: Exception) {
            val cachedFolders = getCachedFolders()
            if (cachedFolders.isNotEmpty()) {
                Result.success(cachedFolders)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getFolderTree(
        parentId: Int? = null,
        maxDepth: Int = 2
    ): Result<List<WorkNoteFolder>> {
        return try {
            val parentIdStr = parentId?.toString()
            val response = api.getFolderTree(parentIdStr, maxDepth)
            if (response.isSuccessful && response.body() != null) {
                val folders = response.body()!!.data
                cacheFolderTree(folders)
                Result.success(folders)
            } else {
                Result.failure(Exception("获取文件夹树失败"))
            }
        } catch (e: Exception) {
            val cachedTree = getCachedFolderTree()
            if (cachedTree.isNotEmpty()) {
                Result.success(cachedTree)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun convertToTaskDocument(
        noteId: Int,
        request: ConvertToTaskDocumentRequest
    ): Result<ConversionResult> {
        return try {
            val response = api.convertToTaskDocument(noteId, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("转换失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ========== 缓存方法 ==========

    private suspend fun cacheNotes(notes: List<WorkNote>) {
        val jsonString = json.encodeToString(notes)
        cacheManager.saveCache("cached_notes", jsonString)
        cacheManager.saveCache("notes_cache_time", System.currentTimeMillis())
    }

    private suspend fun getCachedNotes(): List<WorkNote> {
        val jsonString = cacheManager.getCache("cached_notes", String::class.java) ?: return emptyList()
        val cacheTime = cacheManager.getCache("notes_cache_time", Long::class.java) ?: 0

        // 缓存1小时有效
        if (System.currentTimeMillis() - cacheTime > 3600_000) {
            return emptyList()
        }

        return try {
            json.decodeFromString(jsonString)
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun cacheNote(note: WorkNote) {
        val key = "note_${note.id}"
        val jsonString = json.encodeToString(note)
        cacheManager.saveCache(key, jsonString)
    }

    private suspend fun getCachedNote(id: Int): WorkNote? {
        val key = "note_$id"
        val jsonString = cacheManager.getCache(key, String::class.java) ?: return null
        return try {
            json.decodeFromString(jsonString)
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun removeCachedNote(id: Int) {
        val key = "note_$id"
        cacheManager.saveCache(key, null)
    }

    private suspend fun cacheFolders(folders: List<WorkNoteFolder>) {
        val jsonString = json.encodeToString(folders)
        cacheManager.saveCache("cached_folders", jsonString)
        cacheManager.saveCache("folders_cache_time", System.currentTimeMillis())
    }

    private suspend fun getCachedFolders(): List<WorkNoteFolder> {
        val jsonString = cacheManager.getCache("cached_folders", String::class.java) ?: return emptyList()
        val cacheTime = cacheManager.getCache("folders_cache_time", Long::class.java) ?: 0

        // 缓存2小时有效
        if (System.currentTimeMillis() - cacheTime > 7200_000) {
            return emptyList()
        }

        return try {
            json.decodeFromString(jsonString)
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun cacheFolderTree(tree: List<WorkNoteFolder>) {
        val jsonString = json.encodeToString(tree)
        cacheManager.saveCache("cached_folder_tree", jsonString)
    }

    private suspend fun getCachedFolderTree(): List<WorkNoteFolder> {
        val jsonString = cacheManager.getCache("cached_folder_tree", String::class.java) ?: return emptyList()
        return try {
            json.decodeFromString(jsonString)
        } catch (e: Exception) {
            emptyList()
        }
    }

    // ========== 文档转换 ==========

    suspend fun convertNoteToTaskDocument(
        noteId: Int,
        targetTaskId: Int,
        preserveOriginal: Boolean,
        copyRelations: Boolean
    ): Result<ConversionResult> {
        return try {
            val request = ConvertToTaskDocumentRequest(
                targetTaskId = targetTaskId,
                conversionOptions = ConversionOptions(
                    preserveOriginal = preserveOriginal,
                    copyRelations = copyRelations
                )
            )

            val response = api.convertNoteToTaskDocument(noteId, request)
            if (response.isSuccessful && response.body() != null) {
                // 如果不保留原始文档，从缓存中移除
                if (!preserveOriginal) {
                    removeCachedNote(noteId)
                }
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("转换失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
