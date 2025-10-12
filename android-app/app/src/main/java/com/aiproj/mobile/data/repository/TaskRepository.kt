package com.aiproj.mobile.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.local.dao.TaskDao
import com.aiproj.mobile.data.models.AddCommentRequest
import com.aiproj.mobile.data.models.Comment
import com.aiproj.mobile.data.models.CommentStats
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskListResponse
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskRequest
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.models.TaskStatusUpdateRequest
import com.aiproj.mobile.data.network.ConnectivityObserver
import com.aiproj.mobile.data.paging.TaskPagingSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
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
            android.util.Log.d("TaskRepository", "发起删除任务请求 - taskId: $taskId")
            val response = taskApi.deleteTask(taskId)

            android.util.Log.d("TaskRepository", "删除任务API响应 - taskId: $taskId, code: ${response.code()}, success: ${response.isSuccessful}")

            if (response.isSuccessful) {
                android.util.Log.d("TaskRepository", "✅ 删除任务成功 - taskId: $taskId")
                Result.success(Unit)
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("TaskRepository", "❌ 删除任务失败 - taskId: $taskId, code: ${response.code()}, error: $errorBody")
                Result.failure(
                    Exception(errorBody ?: "删除任务失败 (HTTP ${response.code()})")
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("TaskRepository", "❌ 删除任务异常 - taskId: $taskId", e)
            Result.failure(e)
        }
    }

    /**
     * 开始任务
     */
    suspend fun startTask(taskId: Int): Result<Task> {
        return try {
            val response = taskApi.startTask(taskId, TaskStatusUpdateRequest(status = "in_progress"))

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
                val taskListResponse = response.body()!!
                if (taskListResponse.success && taskListResponse.data != null) {
                    // TaskListResponse.data is TaskListData which has a .data field containing the tasks list
                    Result.success(taskListResponse.data.tasks)
                } else {
                    Result.failure(
                        Exception(taskListResponse.error ?: taskListResponse.message ?: "获取子任务失败")
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

    // ==================== 评论相关方法 ====================

    /**
     * 获取任务评论列表（分页）
     * @param taskId 任务ID
     * @param page 页码（从1开始）
     * @param limit 每页数量（默认20，最大100）
     * @return Result包装的评论列表
     */
    suspend fun getComments(
        taskId: Int,
        page: Int = 1,
        limit: Int = 20
    ): Result<List<Comment>> = withContext(Dispatchers.IO) {
        try {
            android.util.Log.d("TaskRepository", "获取评论列表 - taskId: $taskId, page: $page, limit: $limit")

            val response = taskApi.getComments(taskId, page, limit)

            android.util.Log.d("TaskRepository", "评论列表API响应 - code: ${response.code()}, success: ${response.isSuccessful}")

            if (response.isSuccessful && response.body() != null) {
                val commentListResponse = response.body()!!
                if (commentListResponse.success) {
                    val comments = commentListResponse.data.comments
                    android.util.Log.d("TaskRepository", "✅ 获取评论列表成功 - 共${comments.size}条评论")
                    Result.success(comments)
                } else {
                    android.util.Log.e("TaskRepository", "❌ 获取评论列表失败 - success=false")
                    Result.failure(Exception("获取评论列表失败"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("TaskRepository", "❌ 获取评论列表失败 - code: ${response.code()}, error: $errorBody")
                Result.failure(
                    Exception(errorBody ?: "获取评论列表失败 (HTTP ${response.code()})")
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("TaskRepository", "❌ 获取评论列表异常 - taskId: $taskId", e)
            Result.failure(e)
        }
    }

    /**
     * 创建评论
     * @param taskId 任务ID
     * @param content 评论内容
     * @return Result包装的新创建的评论
     */
    suspend fun createComment(
        taskId: Int,
        content: String
    ): Result<Comment> = withContext(Dispatchers.IO) {
        try {
            // 内容验证
            if (content.isBlank()) {
                return@withContext Result.failure(Exception("评论内容不能为空"))
            }
            if (content.length > 5000) {
                return@withContext Result.failure(Exception("评论内容不能超过5000字"))
            }

            android.util.Log.d("TaskRepository", "创建评论 - taskId: $taskId, content: ${content.take(50)}...")

            val request = AddCommentRequest(content = content.trim())
            val response = taskApi.createComment(taskId, request)

            android.util.Log.d("TaskRepository", "创建评论API响应 - code: ${response.code()}, success: ${response.isSuccessful}")

            if (response.isSuccessful && response.body() != null) {
                val commentResponse = response.body()!!
                if (commentResponse.success) {
                    val comment = commentResponse.data
                    android.util.Log.d("TaskRepository", "✅ 创建评论成功 - commentId: ${comment.id}")
                    Result.success(comment)
                } else {
                    android.util.Log.e("TaskRepository", "❌ 创建评论失败 - success=false")
                    Result.failure(Exception("创建评论失败"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("TaskRepository", "❌ 创建评论失败 - code: ${response.code()}, error: $errorBody")
                Result.failure(
                    Exception(errorBody ?: "创建评论失败 (HTTP ${response.code()})")
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("TaskRepository", "❌ 创建评论异常 - taskId: $taskId", e)
            Result.failure(e)
        }
    }

    /**
     * 删除评论
     * @param taskId 任务ID
     * @param commentId 评论ID
     * @return Result包装的Unit
     */
    suspend fun deleteComment(
        taskId: Int,
        commentId: Int
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            android.util.Log.d("TaskRepository", "删除评论 - taskId: $taskId, commentId: $commentId")

            val response = taskApi.deleteComment(taskId, commentId)

            android.util.Log.d("TaskRepository", "删除评论API响应 - code: ${response.code()}, success: ${response.isSuccessful}")

            if (response.isSuccessful) {
                android.util.Log.d("TaskRepository", "✅ 删除评论成功 - commentId: $commentId")
                Result.success(Unit)
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("TaskRepository", "❌ 删除评论失败 - code: ${response.code()}, error: $errorBody")
                Result.failure(
                    Exception(errorBody ?: "删除评论失败 (HTTP ${response.code()})")
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("TaskRepository", "❌ 删除评论异常 - taskId: $taskId, commentId: $commentId", e)
            Result.failure(e)
        }
    }

    /**
     * 获取评论统计信息
     * @param taskId 任务ID
     * @return Result包装的评论统计
     */
    suspend fun getCommentStats(
        taskId: Int
    ): Result<CommentStats> = withContext(Dispatchers.IO) {
        try {
            android.util.Log.d("TaskRepository", "获取评论统计 - taskId: $taskId")

            val response = taskApi.getCommentStats(taskId)

            android.util.Log.d("TaskRepository", "评论统计API响应 - code: ${response.code()}, success: ${response.isSuccessful}")

            if (response.isSuccessful && response.body() != null) {
                val statsResponse = response.body()!!
                if (statsResponse.success) {
                    val stats = statsResponse.data
                    android.util.Log.d("TaskRepository", "✅ 获取评论统计成功 - 总数: ${stats.totalComments}, 参与者: ${stats.participants}")
                    Result.success(stats)
                } else {
                    android.util.Log.e("TaskRepository", "❌ 获取评论统计失败 - success=false")
                    Result.failure(Exception("获取评论统计失败"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("TaskRepository", "❌ 获取评论统计失败 - code: ${response.code()}, error: $errorBody")
                Result.failure(
                    Exception(errorBody ?: "获取评论统计失败 (HTTP ${response.code()})")
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("TaskRepository", "❌ 获取评论统计异常 - taskId: $taskId", e)
            Result.failure(e)
        }
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
