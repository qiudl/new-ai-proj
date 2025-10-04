package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.StartTimerRequest
import com.aiproj.mobile.data.api.TimeLogApi
import com.aiproj.mobile.data.models.TimeLog
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 时间记录仓库
 * 管理时间记录相关的数据操作
 */
@Singleton
class TimeLogRepository @Inject constructor(
    private val timeLogApi: TimeLogApi
) {

    /**
     * 获取任务的时间日志列表
     */
    suspend fun getTaskTimeLogs(taskId: Int): Result<List<TimeLog>> {
        return try {
            val response = timeLogApi.getTaskTimeLogs(taskId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.timeLogs)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "获取时间日志失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取当前运行中的计时器
     */
    suspend fun getCurrentTimer(): Result<TimeLog?> {
        return try {
            val response = timeLogApi.getCurrentTimer()
            if (response.isSuccessful) {
                Result.success(response.body())
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "获取当前计时器失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 开始计时
     */
    suspend fun startTimer(taskId: Long, description: String?): Result<TimeLog> {
        return try {
            val request = StartTimerRequest(taskId = taskId, description = description)
            val response = timeLogApi.startTimer(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "开始计时失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 停止计时
     */
    suspend fun stopTimer(id: Long): Result<TimeLog> {
        return try {
            val response = timeLogApi.stopTimer(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "停止计时失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 停止当前运行中的计时器
     */
    suspend fun stopCurrentTimer(): Result<TimeLog> {
        return try {
            val response = timeLogApi.stopCurrentTimer()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "停止当前计时器失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
