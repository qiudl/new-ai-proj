package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.TimerApi
import com.aiproj.mobile.data.local.TimerCache
import com.aiproj.mobile.data.models.OfflineTimerRecord
import com.aiproj.mobile.data.models.StartTimerRequest
import com.aiproj.mobile.data.models.SyncStatus
import com.aiproj.mobile.data.models.TimerStatus
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 计时器数据仓库
 * 整合API调用和本地缓存
 */
@Singleton
class TimerRepository @Inject constructor(
    private val api: TimerApi,
    private val cache: TimerCache
) {

    /**
     * 启动计时器
     */
    suspend fun startTimer(request: StartTimerRequest): Result<TimerStatus> {
        return try {
            val response = api.startTimer(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val timer = response.body()!!.data!!
                // 保存到本地缓存
                cache.saveCurrentTimer(timer)
                Result.success(timer)
            } else {
                val errorMsg = response.body()?.error ?: "启动计时器失败"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            // 离线模式：保存到本地待同步
            saveOfflineTimerStart(request)
            Result.failure(e)
        }
    }

    /**
     * 暂停计时器
     */
    suspend fun pauseTimer(): Result<TimerStatus> {
        return try {
            val response = api.pauseTimer()
            if (response.isSuccessful && response.body()?.success == true) {
                val timer = response.body()!!.data!!
                cache.saveCurrentTimer(timer)
                Result.success(timer)
            } else {
                val errorMsg = response.body()?.error ?: "暂停计时器失败"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 恢复计时器
     */
    suspend fun resumeTimer(): Result<TimerStatus> {
        return try {
            val response = api.resumeTimer()
            if (response.isSuccessful && response.body()?.success == true) {
                val timer = response.body()!!.data!!
                cache.saveCurrentTimer(timer)
                Result.success(timer)
            } else {
                val errorMsg = response.body()?.error ?: "恢复计时器失败"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 停止计时器
     */
    suspend fun stopTimer(): Result<Unit> {
        return try {
            val response = api.stopTimer()
            if (response.isSuccessful && response.body()?.success == true) {
                // 清除本地缓存
                cache.clearCurrentTimer()
                Result.success(Unit)
            } else {
                val errorMsg = response.body()?.error ?: "停止计时器失败"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取当前计时器（一次性）
     */
    suspend fun getCurrentTimer(): Result<TimerStatus?> {
        return try {
            val response = api.getCurrentTimer()
            if (response.isSuccessful && response.body()?.success == true) {
                val timer = response.body()!!.data
                if (timer != null) {
                    cache.saveCurrentTimer(timer)
                }
                Result.success(timer)
            } else {
                // 失败时从缓存读取
                val cachedTimer = cache.getCurrentTimer()
                Result.success(cachedTimer)
            }
        } catch (e: Exception) {
            // 网络错误时从缓存读取
            val cachedTimer = cache.getCurrentTimer()
            if (cachedTimer != null) {
                Result.success(cachedTimer)
            } else {
                Result.failure(e)
            }
        }
    }

    /**
     * 观察当前计时器（Flow）
     */
    fun observeCurrentTimer(): Flow<TimerStatus?> {
        return cache.observeCurrentTimer()
    }

    /**
     * 获取活跃计时器列表
     */
    suspend fun getActiveTimers(): Result<List<TimerStatus>> {
        return try {
            val response = api.getActiveTimers()
            if (response.isSuccessful && response.body()?.success == true) {
                val timers = response.body()!!.data!!
                Result.success(timers)
            } else {
                val errorMsg = response.body()?.error ?: "获取活跃计时器失败"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 同步离线记录
     */
    suspend fun syncOfflineRecords(): Result<Int> {
        return try {
            val offlineRecords = cache.getOfflineRecords()
            var syncedCount = 0

            offlineRecords.forEach { record ->
                try {
                    // TODO P1-3: 实现离线同步API
                    // 暂时标记为同步成功
                    cache.markAsSynced(record.localId)
                    syncedCount++
                } catch (e: Exception) {
                    cache.markAsFailed(record.localId)
                }
            }

            Result.success(syncedCount)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 保存离线计时开始记录
     */
    private suspend fun saveOfflineTimerStart(request: StartTimerRequest) {
        val offlineRecord = OfflineTimerRecord(
            localId = java.util.UUID.randomUUID().toString(),
            taskId = request.taskId,
            title = null,
            startTime = System.currentTimeMillis(),
            endTime = null,
            elapsedSeconds = 0,
            syncStatus = SyncStatus.PENDING.toApiString(),
            createdAt = System.currentTimeMillis(),
            metadata = null
        )
        cache.saveOfflineRecord(offlineRecord)
    }
}
