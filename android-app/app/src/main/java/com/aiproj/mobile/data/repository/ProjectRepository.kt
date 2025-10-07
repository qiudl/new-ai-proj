package com.aiproj.mobile.data.repository

import android.content.Context
import android.util.Log
import com.aiproj.mobile.data.api.ProjectApi
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.ProjectListData
import com.aiproj.mobile.data.models.ProjectListResponse
import com.aiproj.mobile.data.models.Pagination
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 项目 Repository
 * 负责处理项目相关的数据操作
 *
 * 性能优化:
 * - 内存缓存：缓存项目列表，5分钟过期策略
 * - 离线支持：网络失败时返回缓存数据
 */
@Singleton
class ProjectRepository @Inject constructor(
    private val projectApi: ProjectApi,
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "ProjectRepository"
        private const val CACHE_DURATION = 5 * 60 * 1000L // 5分钟
    }

    // 内存缓存
    private var cachedProjects: List<Project>? = null
    private var lastCacheTime = 0L

    /**
     * 获取项目列表（带缓存）- 用于项目过滤功能
     *
     * 缓存策略:
     * 1. 检查内存缓存，如果有效则立即返回
     * 2. 如果缓存失效或强制刷新，发起网络请求
     * 3. 网络失败时，如果有缓存则返回缓存数据
     *
     * @param page 页码
     * @param pageSize 每页数量
     * @param status 状态过滤
     * @param forceRefresh 是否强制刷新，忽略缓存
     */
    suspend fun getProjectsCached(
        page: Int = 1,
        pageSize: Int = 20,
        status: String? = null,
        forceRefresh: Boolean = false
    ): Result<ProjectListData> {
        Log.d(TAG, "getProjects: page=$page, forceRefresh=$forceRefresh")

        // 1. 检查内存缓存
        if (!forceRefresh && cachedProjects != null &&
            System.currentTimeMillis() - lastCacheTime < CACHE_DURATION
        ) {
            Log.d(TAG, "getProjects: Cache hit, returning ${cachedProjects!!.size} projects")
            return Result.success(
                ProjectListData(
                    data = cachedProjects!!,
                    pagination = Pagination(
                        page = 1,
                        limit = cachedProjects!!.size,
                        total = cachedProjects!!.size,
                        totalPages = 1,
                        hasNext = false,
                        hasPrev = false
                    )
                )
            )
        }

        // 2. 发起网络请求
        return try {
            Log.d(TAG, "getProjects: Fetching from network...")
            val response = projectApi.getProjects(page, pageSize, status, null)

            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                val data = apiResponse.data

                if (data != null) {
                    Log.d(TAG, "getProjects: Network success, got ${data.data.size} projects")

                    // 更新缓存
                    cachedProjects = data.data
                    lastCacheTime = System.currentTimeMillis()

                    Result.success(data)
                } else {
                    val errorMsg = apiResponse.message ?: "获取项目列表失败"
                    Log.e(TAG, "getProjects: API returned null data - $errorMsg")

                    // 如果有缓存，返回缓存数据
                    cachedProjects?.let {
                        Log.d(TAG, "getProjects: Using stale cache as fallback")
                        Result.success(
                            ProjectListData(
                                data = it,
                                pagination = null
                            )
                        )
                    } ?: Result.failure(Exception(errorMsg))
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "获取项目列表失败"
                Log.e(TAG, "getProjects: Network error - $errorMsg")

                // 如果有缓存，返回缓存数据
                cachedProjects?.let {
                    Log.d(TAG, "getProjects: Using stale cache as fallback")
                    Result.success(
                        ProjectListData(
                            data = it,
                            pagination = null
                        )
                    )
                } ?: Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getProjects: Exception - ${e.message}", e)

            // 异常时也尝试返回缓存
            cachedProjects?.let {
                Log.d(TAG, "getProjects: Using cache after exception")
                Result.success(
                    ProjectListData(
                        data = it,
                        pagination = null
                    )
                )
            } ?: Result.failure(e)
        }
    }

    /**
     * 清除缓存
     */
    suspend fun clearCache() {
        cachedProjects = null
        lastCacheTime = 0L
        Log.d(TAG, "clearCache: Cache cleared")
    }

    /**
     * 获取项目列表（Flow）
     */
    fun getProjects(
        page: Int = 1,
        limit: Int = 20,
        status: String? = null,
        search: String? = null
    ): Flow<Result<ProjectListResponse>> = flow {
        val response = projectApi.getProjects(
            page = page,
            limit = limit,
            status = status,
            search = search
        )

        if (response.isSuccessful && response.body() != null) {
            emit(Result.success(response.body()!!))
        } else {
            emit(Result.failure(
                Exception(response.errorBody()?.string() ?: "获取项目列表失败")
            ))
        }
    }.catch { e ->
        emit(Result.failure(e as? Exception ?: Exception(e.message)))
    }

    /**
     * 获取项目详情
     */
    suspend fun getProject(projectId: Int): Result<Project> {
        return try {
            val response = projectApi.getProject(projectId)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "获取项目详情失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取活跃项目（用于仪表盘）
     */
    fun getActiveProjects(limit: Int = 5): Flow<Result<ProjectListResponse>> = flow {
        val response = projectApi.getActiveProjects(limit)

        if (response.isSuccessful && response.body() != null) {
            emit(Result.success(response.body()!!))
        } else {
            emit(Result.failure(
                Exception(response.errorBody()?.string() ?: "获取活跃项目失败")
            ))
        }
    }.catch { e ->
        emit(Result.failure(e as? Exception ?: Exception(e.message)))
    }

    /**
     * 根据ID获取项目
     */
    suspend fun getProjectById(id: Int): Result<Project> {
        return try {
            val response = projectApi.getProject(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("获取项目失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 创建项目
     */
    suspend fun createProject(name: String, description: String?): Result<Project> {
        return try {
            val response = projectApi.createProject(name, description)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("创建项目失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 更新项目
     */
    suspend fun updateProject(id: Int, name: String, description: String?): Result<Project> {
        return try {
            val response = projectApi.updateProject(id, name, description)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("更新项目失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 删除项目
     */
    suspend fun deleteProject(id: Int): Result<Unit> {
        return try {
            val response = projectApi.deleteProject(id)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("删除项目失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
