# 任务 #3659: RequirementRepository实现

## 任务信息
- **任务ID**: #3659
- **父任务**: #3656 - Android需求管理模块设计
- **负责Agent**: Agent 1 - 数据层专家
- **预估工时**: 1.0小时
- **优先级**: Medium
- **状态**: Todo

## 任务目标

实现需求管理的Repository层，封装API调用、数据缓存和错误处理逻辑。

## 实现文件

```
android-app/app/src/main/java/com/aiproj/mobile/data/repository/RequirementRepository.kt
```

## 实现内容

```kotlin
package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.models.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

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
                val requirements = response.body()!!.data

                // 更新缓存
                cacheMutex.withLock {
                    requirementsCache.clear()
                    requirements.forEach { requirementsCache[it.id] = it }
                    cacheTimestamp = System.currentTimeMillis()
                }

                emit(Result.success(requirements))
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
                val requirement = response.body()!!

                // 更新缓存
                cacheMutex.withLock {
                    requirementsCache[id] = requirement
                }

                Result.success(requirement)
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
                clearCache() // 清除缓存
                Result.success(response.body()!!)
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
                clearCache()
                Result.success(response.body()!!)
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
                clearCache()
                Result.success(response.body()!!)
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
```

## 依赖关系

**前置依赖**:
- #3657 - RequirementApi
- #3658 - Requirement数据模型

**后续依赖**: #3660 - RequirementPagingSource

## 验证标准

- [ ] 所有CRUD操作完整实现
- [ ] 使用Flow返回响应式数据流
- [ ] 实现内存缓存机制（5分钟TTL）
- [ ] 使用Mutex保证缓存线程安全
- [ ] 错误处理完整（try-catch + Result）
- [ ] 标注@Singleton确保单例
- [ ] 使用@Inject构造函数注入

## 完成标记

完成后在此任务下评论："✅ RequirementRepository实现完成"
