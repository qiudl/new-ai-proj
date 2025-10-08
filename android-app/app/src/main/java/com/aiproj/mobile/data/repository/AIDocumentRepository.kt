package com.aiproj.mobile.data.repository

import android.util.Log
import com.aiproj.mobile.data.api.AIDocumentApi
import com.aiproj.mobile.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AI文档生成数据仓库
 */
@Singleton
class AIDocumentRepository @Inject constructor(
    private val aiDocumentApi: AIDocumentApi
) {
    companion object {
        private const val TAG = "AIDocumentRepository"
    }

    /**
     * 获取文档类型列表
     */
    suspend fun getDocumentTypes(): Result<DocumentTypesData> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Fetching document types...")
            val response = aiDocumentApi.getDocumentTypes()

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Log.d(TAG, "Document types fetched successfully: ${apiResponse.data.total} types")
                    Result.success(apiResponse.data)
                } else {
                    val errorMsg = apiResponse.message ?: "获取文档类型失败"
                    Log.e(TAG, "API error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                Log.e(TAG, "Response error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception in getDocumentTypes", e)
            Result.failure(e)
        }
    }

    /**
     * 获取文档模板列表
     */
    suspend fun getDocumentTemplates(): Result<DocumentTemplatesData> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Fetching document templates...")
            val response = aiDocumentApi.getDocumentTemplates()

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Log.d(TAG, "Document templates fetched successfully: ${apiResponse.data.total} templates")
                    Result.success(apiResponse.data)
                } else {
                    val errorMsg = apiResponse.message ?: "获取文档模板失败"
                    Log.e(TAG, "API error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                Log.e(TAG, "Response error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception in getDocumentTemplates", e)
            Result.failure(e)
        }
    }

    /**
     * 生成文档
     */
    suspend fun generateDocument(request: AIDocumentGenerateRequest): Result<AIDocumentGenerateResponse> =
        withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Generating document for task ${request.taskId}, type: ${request.documentType}")
                val response = aiDocumentApi.generateDocument(request)

                if (response.isSuccessful && response.body() != null) {
                    val apiResponse = response.body()!!
                    if (apiResponse.success && apiResponse.data != null) {
                        Log.d(TAG, "Document generated successfully: ${apiResponse.data.document.title}")
                        Result.success(apiResponse.data)
                    } else {
                        val errorMsg = apiResponse.message ?: "生成文档失败"
                        Log.e(TAG, "API error: $errorMsg")
                        Result.failure(Exception(errorMsg))
                    }
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                    Log.e(TAG, "Response error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception in generateDocument", e)
                Result.failure(e)
            }
        }

    /**
     * 保存文档到任务
     */
    suspend fun saveDocument(request: SaveDocumentRequest): Result<SaveDocumentData> =
        withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Saving document to task ${request.taskId}")
                val response = aiDocumentApi.saveDocument(request)

                if (response.isSuccessful && response.body() != null) {
                    val saveResponse = response.body()!!
                    if (saveResponse.success && saveResponse.data != null) {
                        Log.d(TAG, "Document saved successfully: document_id=${saveResponse.data.documentId}")
                        Result.success(saveResponse.data)
                    } else {
                        val errorMsg = saveResponse.message ?: "保存文档失败"
                        Log.e(TAG, "API error: $errorMsg")
                        Result.failure(Exception(errorMsg))
                    }
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "网络请求失败"
                    Log.e(TAG, "Response error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception in saveDocument", e)
                Result.failure(e)
            }
        }
}
