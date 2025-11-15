package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.models.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 需求管理 Repository
 * 封装API调用、数据缓存和错误处理逻辑
 */
@Singleton
class RequirementRepository @Inject constructor(
    private val requirementApi: RequirementApi
) {
    // 内存缓存
    private val requirementsCache = mutableMapOf<Int, Requirement>()
    private val cacheMutex = Mutex()
    private var cacheTimestamp: Long = 0
    private val CACHE_VALID_DURATION = 5 * 60 * 1000L // 5分钟

    /**
     * 获取需求列表（支持缓存）
     */
    fun getRequirementsCached(
        projectId: Int? = null,
        status: String? = null,
        priority: String? = null,
        search: String? = null
    ): Flow<Result<List<Requirement>>> = flow {
        try {
            // 尝试从缓存获取
            cacheMutex.withLock {
                if (System.currentTimeMillis() - cacheTimestamp < CACHE_VALID_DURATION
                    && requirementsCache.isNotEmpty()
                ) {
                    // 应用过滤参数
                    var filtered = requirementsCache.values.toList()

                    if (projectId != null) {
                        filtered = filtered.filter { it.projectId == projectId }
                    }
                    if (status != null) {
                        filtered = filtered.filter { it.status.name.lowercase() == status.lowercase() }
                    }
                    if (priority != null) {
                        filtered = filtered.filter { it.priority.name.lowercase() == priority.lowercase() }
                    }
                    if (!search.isNullOrBlank()) {
                        filtered = filtered.filter {
                            it.title.contains(search, ignoreCase = true) ||
                            it.description?.contains(search, ignoreCase = true) == true
                        }
                    }

                    emit(Result.success(filtered))
                    return@flow
                }
            }

            // 从API获取
            val response = requirementApi.getRequirements(
                page = 1,
                pageSize = 100,
                status = status,
                priority = priority,
                search = search,
                projectId = projectId
            )

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val requirements = apiResponse.data.data

                    // 更新缓存
                    cacheMutex.withLock {
                        requirementsCache.clear()
                        requirements.forEach { requirementsCache[it.id] = it }
                        cacheTimestamp = System.currentTimeMillis()
                    }

                    emit(Result.success(requirements))
                } else {
                    emit(Result.failure(Exception(apiResponse.message ?: "Failed to load requirements")))
                }
            } else {
                emit(Result.failure(Exception("Failed to load requirements")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    /**
     * 获取需求详情
     */
    suspend fun getRequirement(id: Int): Result<Requirement> {
        return try {
            val response = requirementApi.getRequirement(id)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val requirement = apiResponse.data

                    // 更新缓存
                    cacheMutex.withLock {
                        requirementsCache[id] = requirement
                    }

                    Result.success(requirement)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "Failed"))
                }
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 创建需求
     */
    suspend fun createRequirement(dto: CreateRequirementDTO): Result<Requirement> {
        return try {
            val response = requirementApi.createRequirement(dto)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    clearCache() // 清除缓存
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "Failed"))
                }
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 更新需求
     */
    suspend fun updateRequirement(id: Int, dto: UpdateRequirementDTO): Result<Requirement> {
        return try {
            val response = requirementApi.updateRequirement(id, dto)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    clearCache()
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "Failed"))
                }
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 删除需求
     */
    suspend fun deleteRequirement(id: Int): Result<Unit> {
        return try {
            val response = requirementApi.deleteRequirement(id)
            if (response.isSuccessful) {
                clearCache()
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 提交需求评审
     */
    suspend fun submitRequirement(id: Int): Result<Requirement> {
        return try {
            val response = requirementApi.submitRequirement(id)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    clearCache()
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "Failed"))
                }
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 清除缓存
     */
    suspend fun clearCache() {
        cacheMutex.withLock {
            requirementsCache.clear()
            cacheTimestamp = 0
        }
    }
}
