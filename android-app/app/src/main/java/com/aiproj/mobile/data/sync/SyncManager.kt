package com.aiproj.mobile.data.sync

import android.content.Context
import android.util.Log
import androidx.work.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 同步管理器
 */
@Singleton
class SyncManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val workManager = WorkManager.getInstance(context)

    /**
     * 立即同步(一次性)
     */
    fun syncNow() {
        Log.d(TAG, "触发立即同步")
        val syncWork = TaskSyncWorker.createOneTimeSyncWork()

        workManager.enqueueUniqueWork(
            TaskSyncWorker.WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            syncWork
        )
    }

    /**
     * 启用自动同步(周期性)
     */
    fun enableAutoSync() {
        Log.d(TAG, "启用自动同步")
        val periodicSync = TaskSyncWorker.createPeriodicSyncWork()

        workManager.enqueueUniquePeriodicWork(
            "${TaskSyncWorker.WORK_NAME}_periodic",
            ExistingPeriodicWorkPolicy.UPDATE,
            periodicSync
        )
    }

    /**
     * 禁用自动同步
     */
    fun disableAutoSync() {
        Log.d(TAG, "禁用自动同步")
        workManager.cancelUniqueWork("${TaskSyncWorker.WORK_NAME}_periodic")
    }

    /**
     * 观察同步状态
     */
    fun observeSyncStatus(): Flow<SyncStatus> {
        return workManager.getWorkInfosForUniqueWorkFlow(TaskSyncWorker.WORK_NAME)
            .map { workInfos ->
                val workInfo = workInfos.firstOrNull()
                when {
                    workInfo == null -> SyncStatus.Idle
                    workInfo.state == WorkInfo.State.RUNNING -> SyncStatus.Syncing
                    workInfo.state == WorkInfo.State.SUCCEEDED -> SyncStatus.Success
                    workInfo.state == WorkInfo.State.FAILED -> SyncStatus.Failed
                    else -> SyncStatus.Idle
                }
            }
    }

    /**
     * 取消所有同步
     */
    fun cancelAllSync() {
        workManager.cancelUniqueWork(TaskSyncWorker.WORK_NAME)
        workManager.cancelUniqueWork("${TaskSyncWorker.WORK_NAME}_periodic")
    }

    companion object {
        private const val TAG = "SyncManager"
    }
}

/**
 * 同步状态
 */
sealed class SyncStatus {
    object Idle : SyncStatus()
    object Syncing : SyncStatus()
    object Success : SyncStatus()
    object Failed : SyncStatus()
}
