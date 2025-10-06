package com.aiproj.mobile.data.repository

import android.util.Log
import com.aiproj.mobile.data.api.AIDescriptionApi
import com.aiproj.mobile.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AI描述生成数据仓库
 */
@Singleton
class AIDescriptionRepository @Inject constructor(
    private val aiDescriptionApi: AIDescriptionApi
) {
    companion object {
        private const val TAG = "AIDescriptionRepository"
    }

    /**
     * 生成任务描述
     */
    suspend fun generateDescription(
        taskId: Int,
        request: DescriptionGenerateRequest
    ): Result<DescriptionGenerateResponse> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Generating description for task $taskId, model: ${request.model}")
            val response = aiDescriptionApi.generateDescription(taskId, request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Log.d(TAG, "Description generated successfully: ${apiResponse.data.wordCount} words")
                    Result.success(apiResponse.data)
                } else {
                    val errorMsg = apiResponse.message ?: "生成描述失败"
                    Log.e(TAG, "API error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                Log.e(TAG, "Response error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception in generateDescription", e)
            Result.failure(e)
        }
    }

    /**
     * 更新任务描述
     */
    suspend fun updateTaskDescription(
        taskId: Int,
        description: String
    ): Result<Task> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Updating description for task $taskId")
            val request = UpdateDescriptionRequest(description)
            val response = aiDescriptionApi.updateTaskDescription(taskId, request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Log.d(TAG, "Task description updated successfully")
                    Result.success(apiResponse.data)
                } else {
                    val errorMsg = apiResponse.message ?: "更新描述失败"
                    Log.e(TAG, "API error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                Log.e(TAG, "Response error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception in updateTaskDescription", e)
            Result.failure(e)
        }
    }

    /**
     * 获取描述建议
     */
    suspend fun getDescriptionSuggestions(taskId: Int): Result<DescriptionSuggestionsResponse> =
        withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Getting description suggestions for task $taskId")
                val response = aiDescriptionApi.getDescriptionSuggestions(taskId)

                if (response.isSuccessful && response.body() != null) {
                    val apiResponse = response.body()!!
                    if (apiResponse.success && apiResponse.data != null) {
                        Log.d(TAG, "Description suggestions fetched: ${apiResponse.data.suggestions.size} suggestions")
                        Result.success(apiResponse.data)
                    } else {
                        val errorMsg = apiResponse.message ?: "获取描述建议失败"
                        Log.e(TAG, "API error: $errorMsg")
                        Result.failure(Exception(errorMsg))
                    }
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                    Log.e(TAG, "Response error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception in getDescriptionSuggestions", e)
                Result.failure(e)
            }
        }

    /**
     * 批量生成描述
     */
    suspend fun batchGenerateDescriptions(request: BatchGenerateDescriptionsRequest): Result<BatchGenerateDescriptionsResponse> =
        withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Batch generating descriptions for ${request.taskIds.size} tasks")
                val response = aiDescriptionApi.batchGenerateDescriptions(request)

                if (response.isSuccessful && response.body() != null) {
                    val apiResponse = response.body()!!
                    if (apiResponse.success && apiResponse.data != null) {
                        Log.d(TAG, "Batch generation completed: ${apiResponse.data.successCount}/${apiResponse.data.totalCount} succeeded")
                        Result.success(apiResponse.data)
                    } else {
                        val errorMsg = apiResponse.message ?: "批量生成描述失败"
                        Log.e(TAG, "API error: $errorMsg")
                        Result.failure(Exception(errorMsg))
                    }
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                    Log.e(TAG, "Response error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception in batchGenerateDescriptions", e)
                Result.failure(e)
            }
        }
}
