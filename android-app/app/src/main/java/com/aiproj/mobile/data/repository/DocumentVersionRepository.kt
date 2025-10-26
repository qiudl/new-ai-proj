package com.aiproj.mobile.data.repository

import com.aiproj.mobile.core.error.AppException
import com.aiproj.mobile.core.error.toAppException
import com.aiproj.mobile.data.api.DocumentVersionApi
import com.aiproj.mobile.data.local.dao.DocumentVersionDao
import com.aiproj.mobile.data.local.entity.DocumentVersionEntity
import com.aiproj.mobile.data.local.entity.toDto
import com.aiproj.mobile.data.local.entity.toEntity
import com.aiproj.mobile.data.models.DocumentVersionDto
import com.aiproj.mobile.data.models.VersionComparisonResponse
import com.aiproj.mobile.data.models.VersionHistoryResponse
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import okhttp3.ResponseBody
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 文档版本仓库
 *
 * 负责协调远程API和本地缓存，实现离线优先策略
 */
@Singleton
class DocumentVersionRepository @Inject constructor(
    private val api: DocumentVersionApi,
    private val dao: DocumentVersionDao
) {

    /**
     * 获取版本历史列表（带缓存）
     *
     * 策略：
     * 1. 先返回本地缓存（如果有）
     * 2. 然后从网络获取最新数据
     * 3. 更新本地缓存
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param limit 每页数量
     * @param offset 偏移量
     * @param includeContent 是否包含内容
     * @return Flow<Result<VersionHistoryResponse>>
     */
    fun getVersionHistory(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        limit: Int = 20,
        offset: Int = 0,
        includeContent: Boolean = false
    ): Flow<Result<VersionHistoryResponse>> = flow {
        // 先发射本地缓存数据
        val cachedVersions = dao.getVersionHistory(documentId, limit, offset)
        if (cachedVersions.isNotEmpty()) {
            emit(Result.success(
                VersionHistoryResponse(
                    versions = cachedVersions.map { it.toDto() },
                    pagination = com.aiproj.mobile.data.models.PaginationDto(
                        limit = limit,
                        offset = offset,
                        total = dao.getVersionCount(documentId),
                        hasMore = cachedVersions.size == limit
                    ),
                    totalVersions = dao.getVersionCount(documentId)
                )
            ))
        }

        // 从网络获取最新数据
        try {
            val response = api.getVersionHistory(
                projectId = projectId,
                taskId = taskId,
                documentId = documentId,
                limit = limit,
                offset = offset,
                includeContent = includeContent
            )

            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!

                // 防御式更新本地缓存，避免后端偶发返回 null 字段导致崩溃
                try {
                    if (offset == 0) {
                        // 首页：清除旧缓存
                        dao.deleteVersionsByDocumentId(documentId)
                    }
                    // 个别记录字段异常（例如后端返回 null 给非空字段）时，忽略该条以保证页面可用
                    val entities = (data.versions ?: emptyList()).mapNotNull { versionDto ->
                        runCatching { versionDto.toEntity() }.getOrNull()
                    }
                    if (entities.isNotEmpty()) {
                        dao.insertVersions(entities)
                    }
                } catch (cacheError: Exception) {
                    // 忽略缓存写入错误，避免影响页面展示
                }

                emit(Result.success(data))
            } else {
                val exception = AppException.NetworkException.ServerError(
                    response.code(),
                    response.message()
                )
                emit(Result.failure(exception))
            }
        } catch (e: Exception) {
            val appException = e.toAppException()
            emit(Result.failure(appException))
        }
    }

    /**
     * 获取版本详情
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @return Result<DocumentVersionDto>
     */
    suspend fun getVersionDetail(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        versionNumber: Int
    ): Result<DocumentVersionDto> {
        return try {
            // 先尝试从本地缓存获取
            val cached = dao.getVersionByNumber(documentId, versionNumber)
            if (cached != null) {
                return Result.success(cached.toDto())
            }

            // 从网络获取
            val response = api.getVersionDetail(projectId, taskId, documentId, versionNumber)

            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                // 缓存到本地
                dao.insertVersion(data.toEntity())
                Result.success(data)
            } else {
                Result.failure(
                    AppException.NetworkException.ServerError(
                        response.code(),
                        response.message()
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e.toAppException())
        }
    }

    /**
     * 恢复到指定版本
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 要恢复到的版本号
     * @return Result<DocumentVersionDto>
     */
    suspend fun restoreVersion(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        versionNumber: Int
    ): Result<DocumentVersionDto> {
        return try {
            val response = api.restoreVersion(projectId, taskId, documentId, versionNumber)

            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                // 更新本地缓存
                dao.insertVersion(data.toEntity())
                // 清除旧缓存，强制刷新
                dao.deleteVersionsByDocumentId(documentId)
                Result.success(data)
            } else {
                Result.failure(
                    AppException.NetworkException.ServerError(
                        response.code(),
                        response.message()
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e.toAppException())
        }
    }

    /**
     * 对比两个版本
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param version1 版本1
     * @param version2 版本2
     * @return Result<VersionComparisonResponse>
     */
    suspend fun compareVersions(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        version1: Int,
        version2: Int
    ): Result<VersionComparisonResponse> {
        return try {
            val response = api.compareVersions(projectId, taskId, documentId, version1, version2)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    AppException.NetworkException.ServerError(
                        response.code(),
                        response.message()
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e.toAppException())
        }
    }

    /**
     * 下载指定版本
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @return Result<ResponseBody>
     */
    suspend fun downloadVersion(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        versionNumber: Int
    ): Result<ResponseBody> {
        return try {
            val response = api.downloadVersion(projectId, taskId, documentId, versionNumber)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    AppException.NetworkException.ServerError(
                        response.code(),
                        response.message()
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e.toAppException())
        }
    }

    /**
     * 添加版本标签
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @param tag 标签名称
     * @return Result<DocumentVersionDto>
     */
    suspend fun addVersionTag(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        versionNumber: Int,
        tag: String
    ): Result<DocumentVersionDto> {
        return try {
            val response = api.addVersionTag(
                projectId,
                taskId,
                documentId,
                versionNumber,
                mapOf("tag" to tag)
            )

            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                // 更新本地缓存
                dao.insertVersion(data.toEntity())
                Result.success(data)
            } else {
                Result.failure(
                    AppException.NetworkException.ServerError(
                        response.code(),
                        response.message()
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e.toAppException())
        }
    }

    /**
     * 移除版本标签
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @return Result<DocumentVersionDto>
     */
    suspend fun removeVersionTag(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        versionNumber: Int
    ): Result<DocumentVersionDto> {
        return try {
            val response = api.removeVersionTag(projectId, taskId, documentId, versionNumber)

            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                // 更新本地缓存
                dao.insertVersion(data.toEntity())
                Result.success(data)
            } else {
                Result.failure(
                    AppException.NetworkException.ServerError(
                        response.code(),
                        response.message()
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e.toAppException())
        }
    }

    /**
     * 获取带标签的版本列表
     *
     * @param documentId 文档ID
     * @return Result<List<DocumentVersionDto>>
     */
    suspend fun getTaggedVersions(documentId: Long): Result<List<DocumentVersionDto>> {
        return try {
            val versions = dao.getTaggedVersions(documentId)
            Result.success(versions.map { it.toDto() })
        } catch (e: Exception) {
            Result.failure(e.toAppException())
        }
    }

    /**
     * 清除指定文档的缓存
     *
     * @param documentId 文档ID
     */
    suspend fun clearCache(documentId: Long) {
        try {
            dao.deleteVersionsByDocumentId(documentId)
        } catch (e: Exception) {
            // 忽略缓存清除错误
        }
    }

    /**
     * 清除过期缓存（超过7天）
     */
    suspend fun clearExpiredCache() {
        try {
            val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000)
            dao.deleteOldCache(sevenDaysAgo)
        } catch (e: Exception) {
            // 忽略缓存清除错误
        }
    }
}
