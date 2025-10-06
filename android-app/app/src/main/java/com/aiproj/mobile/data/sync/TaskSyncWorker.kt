package com.aiproj.mobile.data.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.local.dao.TaskDao
import com.aiproj.mobile.data.local.entity.PendingAction
import com.aiproj.mobile.data.local.entity.toEntity
import com.aiproj.mobile.data.models.TaskRequest
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * 任务同步Worker
 * 自动将离线操作同步到服务器
 */
@HiltWorker
class TaskSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val taskApi: TaskApi,
    private val taskDao: TaskDao
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "开始同步离线任务...")

            // 获取待同步任务
            val pendingTasks = taskDao.getPendingSyncTasks()
            Log.d(TAG, "找到 ${pendingTasks.size} 个待同步任务")

            var successCount = 0
            var failureCount = 0

            for (task in pendingTasks) {
                try {
                    when (task.pendingAction) {
                        PendingAction.CREATE -> {
                            // 创建任务
                            val request = TaskRequest(
                                title = task.title,
                                description = task.description,
                                status = task.status,
                                priority = task.priority,
                                projectId = task.projectId,
                                assigneeId = task.assigneeId,
                                parentId = task.parentId,
                                dueDate = task.dueDate,
                                estimatedMinutes = task.estimatedMinutes
                            )

                            val response = taskApi.createTask(request)
                            if (response.isSuccessful && response.body() != null) {
                                val apiResponse = response.body()!!
                                if (apiResponse.success && apiResponse.data != null) {
                                    val serverTask = apiResponse.data
                                    // 删除临时记录,插入服务器返回的真实任务
                                    taskDao.deleteTask(task.id)
                                    taskDao.insertTask(serverTask.toEntity(isSynced = true))
                                    successCount++
                                    Log.d(TAG, "✅ 创建任务成功: ${task.title}")
                                } else {
                                    failureCount++
                                    Log.w(TAG, "❌ 创建任务失败: ${apiResponse.error ?: apiResponse.message}")
                                }
                            } else {
                                failureCount++
                                Log.w(TAG, "❌ 创建任务失败: ${response.code()}")
                            }
                        }

                        PendingAction.UPDATE -> {
                            // 更新任务
                            val request = TaskRequest(
                                title = task.title,
                                description = task.description,
                                status = task.status,
                                priority = task.priority,
                                projectId = task.projectId,
                                assigneeId = task.assigneeId,
                                parentId = task.parentId,
                                dueDate = task.dueDate,
                                estimatedMinutes = task.estimatedMinutes
                            )

                            val response = taskApi.updateTask(task.id, request)
                            if (response.isSuccessful && response.body() != null) {
                                val apiResponse = response.body()!!
                                if (apiResponse.success && apiResponse.data != null) {
                                    val serverTask = apiResponse.data
                                    taskDao.insertTask(serverTask.toEntity(isSynced = true))
                                    successCount++
                                    Log.d(TAG, "✅ 更新任务成功: ${task.title}")
                                } else {
                                    failureCount++
                                    Log.w(TAG, "❌ 更新任务失败: ${apiResponse.error ?: apiResponse.message}")
                                }
                            } else {
                                failureCount++
                                Log.w(TAG, "❌ 更新任务失败: ${response.code()}")
                            }
                        }

                        PendingAction.DELETE -> {
                            // 删除任务
                            val response = taskApi.deleteTask(task.id)
                            if (response.isSuccessful) {
                                taskDao.deleteTask(task.id)
                                successCount++
                                Log.d(TAG, "✅ 删除任务成功: ${task.title}")
                            } else {
                                failureCount++
                                Log.w(TAG, "❌ 删除任务失败: ${response.code()}")
                            }
                        }

                        null -> {
                            Log.w(TAG, "⚠️ 任务无待同步操作: ${task.id}")
                        }
                    }
                } catch (e: Exception) {
                    failureCount++
                    Log.e(TAG, "同步任务失败: ${task.id}", e)
                }
            }

            Log.i(TAG, "同步完成: 成功 $successCount, 失败 $failureCount")

            // 如果有失败,返回Retry让WorkManager稍后重试
            if (failureCount > 0 && successCount == 0) {
                Result.retry()
            } else {
                Result.success()
            }

        } catch (e: Exception) {
            Log.e(TAG, "同步任务异常", e)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "TaskSyncWorker"
        const val WORK_NAME = "task_sync_work"

        /**
         * 创建一次性同步任务
         */
        fun createOneTimeSyncWork(): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<TaskSyncWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
        }

        /**
         * 创建定期同步任务(每15分钟)
         */
        fun createPeriodicSyncWork(): PeriodicWorkRequest {
            return PeriodicWorkRequestBuilder<TaskSyncWorker>(
                repeatInterval = 15,
                repeatIntervalTimeUnit = TimeUnit.MINUTES
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .setRequiresBatteryNotLow(true)
                        .build()
                )
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
        }
    }
}
