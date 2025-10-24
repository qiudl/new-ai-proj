package com.aiproj.mobile.data.repository

import android.util.Log
import com.aiproj.mobile.data.api.AISubtaskApi
import com.aiproj.mobile.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AI子任务生成数据仓库
 */
@Singleton
class AISubtaskRepository @Inject constructor(
    private val aiSubtaskApi: AISubtaskApi
) {
    companion object {
        private const val TAG = "AISubtaskRepository"
    }

    /**
     * 生成子任务
     */
    suspend fun generateSubtasks(
        taskId: Int,
        request: SubtaskGenerateRequest
    ): Result<SubtaskGenerateResponse> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Generating subtasks for task $taskId, count: ${request.count}")
            val response = aiSubtaskApi.generateSubtasks(taskId, request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Log.d(TAG, "Subtasks generated successfully: ${apiResponse.data.subtasks.size} subtasks")
                    Result.success(apiResponse.data)
                } else {
                    val errorMsg = apiResponse.message ?: "生成子任务失败"
                    Log.e(TAG, "API error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                Log.e(TAG, "Response error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception in generateSubtasks", e)
            Result.failure(e)
        }
    }

    /**
     * 批量创建子任务
     */
    suspend fun batchCreateSubtasks(request: BatchCreateSubtasksRequest): Result<BatchCreateSubtasksResponse> =
        withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Batch creating ${request.subtasks.size} subtasks for task ${request.parentTaskId}")
                val response = aiSubtaskApi.batchCreateSubtasks(request)

                if (response.isSuccessful && response.body() != null) {
                    val batchResponse = response.body()!!
                    if (batchResponse.success) {
                        Log.d(TAG, "Subtasks created successfully: ${batchResponse.createdCount} subtasks")
                        Result.success(batchResponse)
                    } else {
                        val errorMsg = batchResponse.message
                        Log.e(TAG, "API error: $errorMsg")
                        Result.failure(Exception(errorMsg))
                    }
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                    Log.e(TAG, "Response error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception in batchCreateSubtasks", e)
                Result.failure(e)
            }
        }
}
