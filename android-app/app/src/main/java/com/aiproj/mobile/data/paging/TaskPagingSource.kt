package com.aiproj.mobile.data.paging

import android.util.Log
import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.local.dao.TaskDao
import com.aiproj.mobile.data.local.entity.toEntity
import com.aiproj.mobile.data.local.entity.toTask
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.network.ConnectivityObserver
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 任务分页数据源
 * 实现离线优先策略:
 * 1. 有网络: 从API加载并缓存到本地
 * 2. 无网络: 从本地数据库加载
 */
class TaskPagingSource(
    private val taskApi: TaskApi,
    private val taskDao: TaskDao,
    private val connectivityObserver: ConnectivityObserver,
    private val projectId: Int? = null,
    private val status: String? = null,
    private val search: String? = null
) : PagingSource<Int, Task>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Task> {
        return try {
            val page = params.key ?: 1
            val pageSize = params.loadSize

            // 检查网络连接
            val isConnected = connectivityObserver.isConnected()

            if (isConnected) {
                // 有网络: 从API加载
                loadFromNetwork(page, pageSize)
            } else {
                // 无网络: 从本地数据库加载
                loadFromLocal(page, pageSize)
            }
        } catch (e: Exception) {
            Log.e(TAG, "加载任务失败", e)
            // 网络请求失败时尝试从本地加载
            try {
                loadFromLocal(params.key ?: 1, params.loadSize)
            } catch (localError: Exception) {
                LoadResult.Error(e)
            }
        }
    }

    /**
     * 从网络加载数据并缓存到本地
     */
    private suspend fun loadFromNetwork(page: Int, pageSize: Int): LoadResult<Int, Task> =
        withContext(Dispatchers.IO) {
            try {
                val response = taskApi.getTasks(
                    page = page,
                    limit = pageSize,
                    projectId = projectId,
                    status = status,
                    search = search
                )

                when {
                    !response.isSuccessful || response.body() == null -> {
                        LoadResult.Error(Exception("API错误: ${response.code()}"))
                    }
                    else -> {
                        val apiResponse = response.body()!!

                        // 检查 API 响应是否成功
                        if (!apiResponse.success || apiResponse.data == null) {
                            LoadResult.Error(Exception(apiResponse.error ?: apiResponse.message ?: "API返回失败"))
                        } else {
                            val allTasks = apiResponse.data.tasks ?: emptyList()

                            // ✅ 只返回顶层任务（parentId == null）
                            val topLevelTasks = allTasks.filter { it.parentId == null }

                            Log.d(TAG, "从网络加载 ${allTasks.size} 个任务，过滤后顶层任务 ${topLevelTasks.size} 个 (页码: $page)")

                            // 缓存所有任务到本地数据库（包括子任务，以便展开时使用）
                            if (page == 1) {
                                // 第一页: 清空旧数据
                                if (projectId == null && status == null && search == null) {
                                    taskDao.deleteAllTasks()
                                }
                            }

                            // 插入所有任务（包括子任务）
                            allTasks.forEach { task ->
                                taskDao.insertTask(task.toEntity(isSynced = true))
                            }

                            // 只返回顶层任务给UI
                            LoadResult.Page(
                                data = topLevelTasks,
                                prevKey = if (page == 1) null else page - 1,
                                nextKey = if (topLevelTasks.isEmpty() || topLevelTasks.size < pageSize) null else page + 1
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "网络加载失败", e)
                throw e
            }
        }

    /**
     * 从本地数据库加载数据（只加载顶层任务）
     */
    private suspend fun loadFromLocal(page: Int, pageSize: Int): LoadResult<Int, Task> =
        withContext(Dispatchers.IO) {
            try {
                val offset = (page - 1) * pageSize

                // ✅ 使用顶层任务查询方法（parent_id IS NULL）
                val taskEntities = when {
                    projectId != null && status != null -> {
                        taskDao.getTopLevelTasksByProjectAndStatus(projectId, status, pageSize, offset)
                    }
                    projectId != null -> {
                        taskDao.getTopLevelTasksByProject(projectId, pageSize, offset)
                    }
                    status != null -> {
                        taskDao.getTopLevelTasksByStatus(status, pageSize, offset)
                    }
                    search != null -> {
                        taskDao.searchTopLevelTasks(search, pageSize, offset)
                    }
                    else -> {
                        taskDao.getTopLevelTasksPaged(pageSize, offset)
                    }
                }

                val tasks = taskEntities.map { it.toTask() }

                Log.d(TAG, "从本地加载 ${tasks.size} 个顶层任务 (页码: $page)")

                LoadResult.Page(
                    data = tasks,
                    prevKey = if (page == 1) null else page - 1,
                    nextKey = if (tasks.isEmpty() || tasks.size < pageSize) null else page + 1
                )
            } catch (e: Exception) {
                Log.e(TAG, "本地加载失败", e)
                LoadResult.Error(e)
            }
        }

    override fun getRefreshKey(state: PagingState<Int, Task>): Int? {
        // 刷新时返回最接近当前位置的页码
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }

    companion object {
        private const val TAG = "TaskPagingSource"
    }
}
