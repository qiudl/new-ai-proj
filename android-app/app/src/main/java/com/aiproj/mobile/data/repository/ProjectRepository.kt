package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.ProjectApi
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.ProjectListResponse
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 项目 Repository
 * 负责处理项目相关的数据操作
 */
@Singleton
class ProjectRepository @Inject constructor(
    private val projectApi: ProjectApi
) {

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
