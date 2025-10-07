package com.aiproj.mobile.data.sync

import android.util.Log
import com.aiproj.mobile.data.local.TimerCache
import com.aiproj.mobile.data.network.ConnectivityObserver
import com.aiproj.mobile.data.repository.TimerRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min
import kotlin.math.pow

/**
 * 同步管理器
 * 负责监控网络状态并自动同步离线数据
 */
@Singleton
class SyncManager @Inject constructor(
    private val cache: TimerCache,
    private val repository: TimerRepository,
    private val connectivityObserver: ConnectivityObserver
) {

    private val TAG = "SyncManager"
    private val syncScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState: StateFlow<SyncState> = _syncState.asStateFlow()

    private var retryCount = 0
    private val maxRetries = 5
    private val baseDelayMs = 1000L // 1 second

    init {
        // 监控网络状态变化
        observeNetworkChanges()
    }

    /**
     * 监控网络状态变化
     */
    private fun observeNetworkChanges() {
        syncScope.launch {
            connectivityObserver.observe().collect { networkStatus ->
                when (networkStatus) {
                    ConnectivityObserver.NetworkStatus.AVAILABLE -> {
                        Log.d(TAG, "Network available - triggering sync")
                        syncOfflineData()
                    }
                    ConnectivityObserver.NetworkStatus.UNAVAILABLE,
                    ConnectivityObserver.NetworkStatus.LOST -> {
                        Log.d(TAG, "Network unavailable - sync stopped")
                        _syncState.value = SyncState.Idle
                    }
                    ConnectivityObserver.NetworkStatus.LOSING -> {
                        Log.d(TAG, "Network losing connection")
                    }
                }
            }
        }
    }

    /**
     * 手动触发同步
     */
    suspend fun syncNow(): Result<Int> {
        return syncOfflineData()
    }

    /**
     * 同步离线数据
     */
    private suspend fun syncOfflineData(): Result<Int> {
        // Check network connectivity
        if (!connectivityObserver.isConnected()) {
            Log.d(TAG, "No network connection - skipping sync")
            return Result.failure(Exception("No network connection"))
        }

        // Check if already syncing
        if (_syncState.value is SyncState.Syncing) {
            Log.d(TAG, "Already syncing - skipping")
            return Result.failure(Exception("Already syncing"))
        }

        // Get pending records
        val pendingRecords = cache.getPendingOfflineRecords()
        if (pendingRecords.isEmpty()) {
            Log.d(TAG, "No pending records to sync")
            _syncState.value = SyncState.Idle
            return Result.success(0)
        }

        Log.d(TAG, "Starting sync of ${pendingRecords.size} records")
        _syncState.value = SyncState.Syncing(total = pendingRecords.size, completed = 0)

        return try {
            // Use repository to sync records
            val result = repository.syncOfflineRecords()

            if (result.isSuccess) {
                val syncedCount = result.getOrDefault(0)
                Log.d(TAG, "Sync completed: $syncedCount records synced")

                // Update last sync time
                cache.saveLastSyncTime()

                // Clear synced records
                cache.clearSyncedRecords()

                // Reset retry count on success
                retryCount = 0

                _syncState.value = SyncState.Success(syncedCount = syncedCount)

                // Auto transition back to Idle after 2 seconds
                delay(2000)
                _syncState.value = SyncState.Idle

                Result.success(syncedCount)
            } else {
                val throwable = result.exceptionOrNull() ?: Exception("Sync failed")
                val error = if (throwable is Exception) throwable else Exception(throwable)
                handleSyncError(error)
                Result.failure(error)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync error: ${e.message}", e)
            handleSyncError(e)
            Result.failure(e)
        }
    }

    /**
     * 处理同步错误（含重试逻辑）
     */
    private suspend fun handleSyncError(error: Exception) {
        retryCount++

        if (retryCount <= maxRetries) {
            // Calculate exponential backoff delay
            val delayMs = calculateBackoffDelay(retryCount)

            Log.d(TAG, "Sync failed (attempt $retryCount/$maxRetries), retrying in ${delayMs}ms")
            _syncState.value = SyncState.Error(
                message = error.message ?: "Sync failed",
                retryCount = retryCount,
                maxRetries = maxRetries
            )

            // Wait before retry
            delay(delayMs)

            // Retry sync
            if (connectivityObserver.isConnected()) {
                syncOfflineData()
            }
        } else {
            Log.e(TAG, "Max retries exceeded - giving up")
            _syncState.value = SyncState.Failed(
                message = "Sync failed after $maxRetries attempts: ${error.message}"
            )

            // Reset retry count after failure
            retryCount = 0
        }
    }

    /**
     * 计算指数退避延迟
     * 使用公式: delay = baseDelay * 2^(retryCount - 1)
     * 最大延迟限制为30秒
     */
    private fun calculateBackoffDelay(retry: Int): Long {
        val exponentialDelay = baseDelayMs * 2.0.pow(retry - 1).toLong()
        return min(exponentialDelay, 30_000L) // Max 30 seconds
    }

    /**
     * 获取同步统计信息
     */
    suspend fun getSyncStats(): SyncStats {
        val stats = cache.getCacheStats()
        val lastSyncTime = cache.getLastSyncTime()

        return SyncStats(
            pendingRecords = stats.pendingRecords,
            syncedRecords = stats.syncedRecords,
            failedRecords = stats.failedRecords,
            lastSyncTime = lastSyncTime,
            currentState = _syncState.value
        )
    }

    /**
     * 重置同步状态
     */
    fun resetSyncState() {
        retryCount = 0
        _syncState.value = SyncState.Idle
    }
}

/**
 * 同步状态
 */
sealed class SyncState {
    object Idle : SyncState()

    data class Syncing(
        val total: Int,
        val completed: Int
    ) : SyncState()

    data class Success(
        val syncedCount: Int
    ) : SyncState()

    data class Error(
        val message: String,
        val retryCount: Int,
        val maxRetries: Int
    ) : SyncState()

    data class Failed(
        val message: String
    ) : SyncState()
}

/**
 * 同步统计信息
 */
data class SyncStats(
    val pendingRecords: Int,
    val syncedRecords: Int,
    val failedRecords: Int,
    val lastSyncTime: Long?,
    val currentState: SyncState
)
