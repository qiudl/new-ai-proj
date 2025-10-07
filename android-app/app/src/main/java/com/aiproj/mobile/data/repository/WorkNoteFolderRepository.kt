package com.aiproj.mobile.data.repository

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.aiproj.mobile.data.api.WorkNoteApi
import com.aiproj.mobile.data.models.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

private val Context.folderDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "folder_cache"
)

/**
 * 工作笔记文件夹数据仓库
 *
 * 负责处理文件夹相关的所有数据操作，包括CRUD、树形结构查询等
 *
 * 性能优化:
 * - 内存缓存：使用cachedFolders缓存最近获取的文件夹树
 * - 持久化缓存：使用DataStore缓存数据，应用重启后仍可用
 * - 缓存时效：5分钟过期策略
 * - 离线支持：网络失败时返回缓存数据
 */
@Singleton
class WorkNoteFolderRepository @Inject constructor(
    private val api: WorkNoteApi,
    @ApplicationContext private val context: Context
) {
    private val json = Json { ignoreUnknownKeys = true }

    companion object {
        private const val TAG = "WorkNoteFolderRepo"
        private val FOLDER_TREE_KEY = stringPreferencesKey("folder_tree")
        private const val CACHE_DURATION = 5 * 60 * 1000L // 5分钟
    }

    // 内存缓存
    private var lastCacheTime = 0L
    private var cachedFolders: List<WorkNoteFolder>? = null

    /**
     * 获取文件夹树（带多级缓存）
     *
     * 缓存策略:
     * 1. 检查内存缓存，如果有效则立即返回
     * 2. 如果内存缓存失效，尝试从DataStore加载
     * 3. 同时发起网络请求，更新缓存
     * 4. 如果网络失败但有缓存，返回缓存数据
     *
     * @param parentId 父文件夹ID（null表示获取根级文件夹）
     * @param maxDepth 最大深度（默认2层）
     * @param forceRefresh 是否强制刷新，忽略缓存
     */
    fun getFolderTree(
        parentId: Int? = null,
        maxDepth: Int = 2,
        forceRefresh: Boolean = false
    ): Flow<Result<List<WorkNoteFolder>>> = flow {
        Log.d(TAG, "getFolderTree: parentId=$parentId, maxDepth=$maxDepth, forceRefresh=$forceRefresh")

        // 1. 检查内存缓存
        if (!forceRefresh && cachedFolders != null &&
            System.currentTimeMillis() - lastCacheTime < CACHE_DURATION
        ) {
            Log.d(TAG, "getFolderTree: Memory cache hit, returning ${cachedFolders!!.size} folders")
            emit(Result.success(cachedFolders!!))
            return@flow
        }

        // 2. 尝试从DataStore加载缓存
        if (!forceRefresh) {
            val cachedData = loadFromCache()
            if (cachedData != null) {
                Log.d(TAG, "getFolderTree: DataStore cache hit, returning ${cachedData.size} folders")
                cachedFolders = cachedData
                emit(Result.success(cachedData))
                // 继续后台更新，不return
            }
        }

        // 3. 发起网络请求
        try {
            Log.d(TAG, "getFolderTree: Fetching from network...")
            val response = api.getFolderTree(
                parentId = parentId?.toString(),
                maxDepth = maxDepth
            )

            if (response.isSuccessful && response.body() != null) {
                val folders = response.body()!!.data
                Log.d(TAG, "getFolderTree: Network success, got ${folders.size} folders")

                // 更新缓存
                cachedFolders = folders
                lastCacheTime = System.currentTimeMillis()
                saveToCache(folders)

                emit(Result.success(folders))
            } else {
                val errorMsg = response.errorBody()?.string() ?: "获取文件夹树失败"
                Log.e(TAG, "getFolderTree: Network error - $errorMsg")
                emit(Result.failure(Exception(errorMsg)))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getFolderTree: Exception - ${e.message}", e)
            // 4. 如果网络失败但有缓存，返回缓存数据
            cachedFolders?.let {
                Log.d(TAG, "getFolderTree: Using cached data as fallback")
                emit(Result.success(it))
            } ?: emit(Result.failure(e))
        }
    }

    /**
     * 从DataStore加载缓存
     */
    private suspend fun loadFromCache(): List<WorkNoteFolder>? {
        return try {
            val prefs = context.folderDataStore.data.first()
            val jsonString = prefs[FOLDER_TREE_KEY] ?: return null
            json.decodeFromString<List<WorkNoteFolder>>(jsonString)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 保存到DataStore缓存
     */
    private suspend fun saveToCache(folders: List<WorkNoteFolder>) {
        try {
            val jsonString = json.encodeToString(folders)
            context.folderDataStore.edit { prefs ->
                prefs[FOLDER_TREE_KEY] = jsonString
            }
        } catch (e: Exception) {
            // 缓存失败不影响主流程
        }
    }

    /**
     * 清除所有缓存
     */
    suspend fun clearCache() {
        cachedFolders = null
        lastCacheTime = 0L
        try {
            context.folderDataStore.edit { it.clear() }
        } catch (e: Exception) {
            // 忽略清理错误
        }
    }

    /**
     * 获取文件夹列表（分页）
     */
    suspend fun getFolders(
        page: Int = 1,
        pageSize: Int = 50,
        projectId: Int? = null,
        parentId: Int? = null
    ): Result<FolderListResponse> {
        return try {
            val response = api.getFolders(
                page = page,
                pageSize = pageSize,
                projectId = projectId,
                parentId = parentId?.toString()
            )

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception(
                        response.errorBody()?.string() ?: "获取文件夹列表失败"
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取单个文件夹详情
     */
    suspend fun getFolder(folderId: Int): Result<WorkNoteFolder> {
        return try {
            val response = api.getFolder(folderId)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception(
                        response.errorBody()?.string() ?: "获取文件夹详情失败"
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 创建文件夹
     *
     * 创建成功后会清除缓存，强制下次获取最新数据
     */
    suspend fun createFolder(
        name: String,
        description: String? = null,
        parentId: Int? = null,
        visibility: WorkNoteVisibility = WorkNoteVisibility.PRIVATE,
        color: String? = null,
        icon: String? = null
    ): Result<WorkNoteFolder> {
        Log.d(TAG, "createFolder: name='$name', parentId=$parentId, visibility=$visibility")
        return try {
            val request = CreateWorkNoteFolderRequest(
                name = name,
                description = description,
                parentId = parentId,
                visibility = visibility,
                color = color,
                icon = icon
            )

            val response = api.createFolder(request)

            if (response.isSuccessful && response.body() != null) {
                val newFolder = response.body()!!
                Log.d(TAG, "createFolder: Success - created folder id=${newFolder.id}")
                // 清除缓存
                clearCache()
                Result.success(newFolder)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "创建文件夹失败"
                Log.e(TAG, "createFolder: Failed - $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "createFolder: Exception - ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * 更新文件夹
     *
     * 更新成功后会清除缓存
     */
    suspend fun updateFolder(
        folderId: Int,
        name: String? = null,
        description: String? = null,
        visibility: WorkNoteVisibility? = null,
        color: String? = null,
        icon: String? = null
    ): Result<WorkNoteFolder> {
        Log.d(TAG, "updateFolder: folderId=$folderId, name='$name', visibility=$visibility")
        return try {
            val request = UpdateWorkNoteFolderRequest(
                name = name,
                description = description,
                visibility = visibility,
                color = color,
                icon = icon
            )

            val response = api.updateFolder(folderId, request)

            if (response.isSuccessful && response.body() != null) {
                Log.d(TAG, "updateFolder: Success - updated folder id=$folderId")
                // 清除缓存
                clearCache()
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "更新文件夹失败"
                Log.e(TAG, "updateFolder: Failed - $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateFolder: Exception - ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * 删除文件夹
     *
     * 删除成功后会清除缓存
     */
    suspend fun deleteFolder(folderId: Int): Result<Unit> {
        Log.d(TAG, "deleteFolder: folderId=$folderId")
        return try {
            val response = api.deleteFolder(folderId)

            if (response.isSuccessful) {
                Log.d(TAG, "deleteFolder: Success - deleted folder id=$folderId")
                // 清除缓存
                clearCache()
                Result.success(Unit)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "删除文件夹失败"
                Log.e(TAG, "deleteFolder: Failed - $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "deleteFolder: Exception - ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * 移动文件夹
     *
     * 移动成功后会清除缓存
     *
     * @param folderId 要移动的文件夹ID
     * @param newParentId 新的父文件夹ID（null表示移动到根目录）
     */
    suspend fun moveFolder(
        folderId: Int,
        newParentId: Int?
    ): Result<WorkNoteFolder> {
        Log.d(TAG, "moveFolder: folderId=$folderId, newParentId=$newParentId")
        return try {
            val request = MoveFolderRequest(targetParentId = newParentId)
            val response = api.moveFolder(folderId, request)

            if (response.isSuccessful && response.body() != null) {
                Log.d(TAG, "moveFolder: Success - moved folder id=$folderId to parent=$newParentId")
                // 清除缓存
                clearCache()
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "移动文件夹失败"
                Log.e(TAG, "moveFolder: Failed - $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "moveFolder: Exception - ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * 检查是否会形成循环（用于移动前验证）
     *
     * 使用迭代实现而非递归，避免深层文件夹树导致栈溢出
     *
     * @param folderId 要移动的文件夹ID
     * @param targetParentId 目标父文件夹ID
     * @param allFolders 所有文件夹列表
     * @return true 如果移动会形成循环，false 如果可以安全移动
     */
    fun isCircularMove(
        folderId: Int,
        targetParentId: Int?,
        allFolders: List<WorkNoteFolder>
    ): Boolean {
        Log.d(TAG, "isCircularMove: checking folderId=$folderId -> targetParentId=$targetParentId")

        // 移动到根目录总是安全的
        if (targetParentId == null) {
            Log.d(TAG, "isCircularMove: Moving to root - safe")
            return false
        }

        // 不能移动到自己下面
        if (folderId == targetParentId) {
            Log.w(TAG, "isCircularMove: Cannot move folder to itself - circular detected")
            return true
        }

        // 检查targetParentId是否是folderId的子孙（迭代实现）
        // 从targetParentId向上遍历，看是否会遇到folderId
        var currentId: Int? = targetParentId
        var depth = 0
        val maxDepth = 100  // 防止无限循环，最大深度限制

        while (currentId != null && depth < maxDepth) {
            val folder = allFolders.find { it.id == currentId }
                ?: break  // 文件夹不存在，中断

            // 如果父节点是folderId，说明会形成循环
            if (folder.parentId == folderId) {
                Log.w(TAG, "isCircularMove: Circular reference detected at depth $depth")
                return true
            }

            // 向上移动到父节点
            currentId = folder.parentId
            depth++
        }

        Log.d(TAG, "isCircularMove: No circular reference - safe to move")
        return false
    }
}
