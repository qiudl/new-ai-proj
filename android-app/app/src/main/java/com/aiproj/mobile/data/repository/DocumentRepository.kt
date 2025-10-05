package com.aiproj.mobile.data.repository

import android.util.Log
import com.aiproj.mobile.data.api.DocumentApi
import com.aiproj.mobile.data.local.dao.DocumentDao
import com.aiproj.mobile.data.local.entity.toEntity
import com.aiproj.mobile.data.local.entity.toModel
import com.aiproj.mobile.data.models.Document
import com.aiproj.mobile.data.models.DocumentRequest
import kotlinx.coroutines.flow.firstOrNull
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 文档 Repository
 * 负责处理文档相关的数据操作
 * 实现离线优先策略:先读缓存,再请求API,成功后更新缓存
 */
@Singleton
class DocumentRepository @Inject constructor(
    private val documentApi: DocumentApi,
    private val documentDao: DocumentDao
) {

    /**
     * 获取文档列表 (离线优先)
     * 1. 先返回缓存数据
     * 2. 请求API更新
     * 3. 失败时仍使用缓存
     */
    suspend fun getDocuments(taskId: Int): Result<List<Document>> {
        return try {
            // 1. 尝试从API获取最新数据
            val response = documentApi.getDocuments(taskId)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val documents = apiResponse.data
                    // 2. 更新本地缓存
                    try {
                        documentDao.insertOrUpdateAll(documents.map { it.toEntity() })
                        Log.d("DocumentRepository", "缓存已更新: ${documents.size}条文档")
                    } catch (cacheError: Exception) {
                        Log.w("DocumentRepository", "缓存更新失败", cacheError)
                    }
                    Result.success(documents)
                } else {
                    // API返回失败,尝试返回缓存
                    val cached = documentDao.getByTaskIdFlow(taskId).firstOrNull()
                    if (!cached.isNullOrEmpty()) {
                        Log.d("DocumentRepository", "API失败,返回缓存: ${cached.size}条")
                        Result.success(cached.map { it.toModel() })
                    } else {
                        Result.failure(
                            Exception(apiResponse.error ?: apiResponse.message ?: "获取文档列表失败")
                        )
                    }
                }
            } else {
                // HTTP请求失败,返回缓存
                val cached = documentDao.getByTaskIdFlow(taskId).firstOrNull()
                if (!cached.isNullOrEmpty()) {
                    Log.d("DocumentRepository", "HTTP失败,返回缓存: ${cached.size}条")
                    Result.success(cached.map { it.toModel() })
                } else {
                    Result.failure(
                        Exception(response.errorBody()?.string() ?: "获取文档列表失败")
                    )
                }
            }
        } catch (e: Exception) {
            // 网络异常,尝试返回缓存
            Log.e("DocumentRepository", "网络请求异常,尝试返回缓存", e)
            val cached = documentDao.getByTaskIdFlow(taskId).firstOrNull()
            if (!cached.isNullOrEmpty()) {
                Log.d("DocumentRepository", "网络异常,返回缓存: ${cached.size}条")
                Result.success(cached.map { it.toModel() })
            } else {
                Result.failure(e)
            }
        }
    }

    /**
     * 获取文档详情 (离线优先)
     */
    suspend fun getDocument(taskId: Int, documentId: Int): Result<Document> {
        return try {
            // 1. 尝试从API获取最新数据
            val response = documentApi.getDocument(taskId, documentId)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val document = apiResponse.data
                    // 2. 更新本地缓存
                    try {
                        documentDao.insertOrUpdate(document.toEntity())
                        Log.d("DocumentRepository", "文档缓存已更新: $documentId")
                    } catch (cacheError: Exception) {
                        Log.w("DocumentRepository", "缓存更新失败", cacheError)
                    }
                    Result.success(document)
                } else {
                    // API返回失败,尝试返回缓存
                    val cached = documentDao.getById(documentId)
                    if (cached != null) {
                        Log.d("DocumentRepository", "API失败,返回缓存文档: $documentId")
                        Result.success(cached.toModel())
                    } else {
                        Result.failure(
                            Exception(apiResponse.error ?: apiResponse.message ?: "获取文档失败")
                        )
                    }
                }
            } else {
                // HTTP请求失败,返回缓存
                val cached = documentDao.getById(documentId)
                if (cached != null) {
                    Log.d("DocumentRepository", "HTTP失败,返回缓存文档: $documentId")
                    Result.success(cached.toModel())
                } else {
                    Result.failure(
                        Exception(response.errorBody()?.string() ?: "获取文档失败")
                    )
                }
            }
        } catch (e: Exception) {
            // 网络异常,尝试返回缓存
            Log.e("DocumentRepository", "网络请求异常,尝试返回缓存", e)
            val cached = documentDao.getById(documentId)
            if (cached != null) {
                Log.d("DocumentRepository", "网络异常,返回缓存文档: $documentId")
                Result.success(cached.toModel())
            } else {
                Result.failure(e)
            }
        }
    }

    /**
     * 创建文档 (成功后更新缓存)
     */
    suspend fun createDocument(taskId: Int, request: DocumentRequest): Result<Document> {
        return try {
            val response = documentApi.createDocument(taskId, request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val document = apiResponse.data
                    // 更新本地缓存
                    try {
                        documentDao.insertOrUpdate(document.toEntity())
                        Log.d("DocumentRepository", "新文档已缓存: ${document.id}")
                    } catch (cacheError: Exception) {
                        Log.w("DocumentRepository", "缓存更新失败", cacheError)
                    }
                    Result.success(document)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "创建文档失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "创建文档失败")
                )
            }
        } catch (e: Exception) {
            Log.e("DocumentRepository", "创建文档失败", e)
            Result.failure(e)
        }
    }

    /**
     * 更新文档 (成功后更新缓存)
     */
    suspend fun updateDocument(
        taskId: Int,
        documentId: Int,
        request: DocumentRequest
    ): Result<Document> {
        return try {
            val response = documentApi.updateDocument(taskId, documentId, request)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val document = apiResponse.data
                    // 更新本地缓存
                    try {
                        documentDao.insertOrUpdate(document.toEntity())
                        Log.d("DocumentRepository", "文档缓存已更新: $documentId")
                    } catch (cacheError: Exception) {
                        Log.w("DocumentRepository", "缓存更新失败", cacheError)
                    }
                    Result.success(document)
                } else {
                    Result.failure(
                        Exception(apiResponse.error ?: apiResponse.message ?: "更新文档失败")
                    )
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "更新文档失败")
                )
            }
        } catch (e: Exception) {
            Log.e("DocumentRepository", "更新文档失败", e)
            Result.failure(e)
        }
    }

    /**
     * 删除文档 (成功后删除缓存)
     */
    suspend fun deleteDocument(taskId: Int, documentId: Int): Result<Unit> {
        return try {
            val response = documentApi.deleteDocument(taskId, documentId)

            if (response.isSuccessful) {
                // 删除本地缓存
                try {
                    documentDao.delete(documentId)
                    Log.d("DocumentRepository", "文档缓存已删除: $documentId")
                } catch (cacheError: Exception) {
                    Log.w("DocumentRepository", "缓存删除失败", cacheError)
                }
                Result.success(Unit)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "删除文档失败")
                )
            }
        } catch (e: Exception) {
            Log.e("DocumentRepository", "删除文档失败", e)
            Result.failure(e)
        }
    }
}
