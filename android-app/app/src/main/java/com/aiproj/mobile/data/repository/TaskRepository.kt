package com.aiproj.mobile.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.local.dao.TaskDao
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskListResponse
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskRequest
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.network.ConnectivityObserver
import com.aiproj.mobile.data.paging.TaskPagingSource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 任务 Repository
 * 负责处理任务相关的数据操作
 */
@Singleton
class TaskRepository @Inject constructor(
    private val taskApi: TaskApi,
    private val taskDao: TaskDao,
    private val connectivityObserver: ConnectivityObserver
) {

    /**
     * 获取任务列表（Flow）
     */
    fun getTasks(
        page: Int = 1,
        limit: Int = 20,
        status: TaskStatus? = null,
        priority: TaskPriority? = null,
        projectId: Int? = null,
        assigneeId: Int? = null,
        search: String? = null,
        sortBy: String? = null,
        sortOrder: String? = null
    ): Flow<Result<TaskListResponse>> = flow {
        val response = taskApi.getTasks(
            page = page,
            limit = limit,
            status = status?.name?.lowercase(),
            priority = priority?.name?.lowercase(),
            projectId = projectId,
            assigneeId = assigneeId,
            search = search,
            sortBy = sortBy,
            sortOrder = sortOrder
        )

        if (response.isSuccessful && response.body() != null) {
            emit(Result.success(response.body()!!))
        } else {
            emit(Result.failure(
                Exception(response.errorBody()?.string() ?: "获取任务列表失败")
            ))
        }
    }.catch { e ->
        emit(Result.failure(e as? Exception ?: Exception(e.message)))
    }

    /**
     * 获取任务详情
     */
    suspend fun getTask(taskId: Int): Result<Task> {
        return try {
            val response = taskApi.getTask(taskId)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "获取任务详情失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "获取任务详情失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 创建任务
     */
    suspend fun createTask(request: TaskRequest): Result<Task> {
        return try {
            val response = taskApi.createTask(request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "创建任务失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "创建任务失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 更新任务
     */
    suspend fun updateTask(taskId: Int, request: TaskRequest): Result<Task> {
        return try {
            val response = taskApi.updateTask(taskId, request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "更新任务失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "更新任务失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 删除任务
     */
    suspend fun deleteTask(taskId: Int): Result<Unit> {
        return try {
            val response = taskApi.deleteTask(taskId)

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "删除任务失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 开始任务
     */
    suspend fun startTask(taskId: Int): Result<Task> {
        return try {
            val response = taskApi.startTask(taskId)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "开始任务失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "开始任务失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取任务的子任务列表
     */
    suspend fun getTaskChildren(taskId: Int): Result<List<Task>> {
        return try {
            val response = taskApi.getTaskChildren(taskId)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "获取子任务失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "获取子任务失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 完成任务
     */
    suspend fun completeTask(taskId: Int): Result<Task> {
        return try {
            val response = taskApi.completeTask(taskId)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "完成任务失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "完成任务失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取子任务列表
     */
    fun getSubtasks(parentId: Int): Flow<Result<TaskListResponse>> = flow {
        val response = taskApi.getSubtasks(parentId)

        if (response.isSuccessful && response.body() != null) {
            emit(Result.success(response.body()!!))
        } else {
            emit(Result.failure(
                Exception(response.errorBody()?.string() ?: "获取子任务失败")
            ))
        }
    }.catch { e ->
        emit(Result.failure(e as? Exception ?: Exception(e.message)))
    }

    /**
     * 获取优先任务（用于仪表盘）
     */
    fun getPriorityTasks(limit: Int = 5): Flow<Result<TaskListResponse>> {
        return getTasks(
            limit = limit,
            status = TaskStatus.IN_PROGRESS,
            sortBy = "priority",
            sortOrder = "desc"
        )
    }

    /**
     * 根据ID获取任务
     */
    suspend fun getTaskById(id: Int): Result<Task> {
        return getTask(id)
    }

    // ==================== Paging 3支持 ====================

    /**
     * 获取任务分页数据流（支持离线优先）
     */
    fun getTasksPaging(
        projectId: Int? = null,
        status: String? = null,
        search: String? = null
    ): Flow<PagingData<Task>> {
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = false,
                initialLoadSize = 20,
                prefetchDistance = 5
            ),
            pagingSourceFactory = {
                TaskPagingSource(
                    taskApi = taskApi,
                    taskDao = taskDao,
                    connectivityObserver = connectivityObserver,
                    projectId = projectId,
                    status = status,
                    search = search
                )
            }
        ).flow
    }
}
