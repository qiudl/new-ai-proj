package com.aiproj.mobile.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.aiproj.mobile.data.models.OfflineTimerRecord
import com.aiproj.mobile.data.models.SyncStatus
import com.aiproj.mobile.data.models.TimerStatus
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 计时器本地缓存
 * 使用DataStore实现离线数据持久化
 */
@Singleton
class TimerCache @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val gson: Gson
) {

    companion object {
        private val CURRENT_TIMER_KEY = stringPreferencesKey("current_timer")
        private val OFFLINE_RECORDS_KEY = stringPreferencesKey("offline_records")
        private val LAST_SYNC_TIME_KEY = longPreferencesKey("last_sync_time")
    }

    /**
     * 保存当前计时器
     */
    suspend fun saveCurrentTimer(timer: TimerStatus) {
        dataStore.edit { preferences ->
            preferences[CURRENT_TIMER_KEY] = gson.toJson(timer)
        }
    }

    /**
     * 获取当前计时器（同步）
     */
    suspend fun getCurrentTimer(): TimerStatus? {
        val json = dataStore.data.first()[CURRENT_TIMER_KEY]
        return if (json != null) {
            try {
                gson.fromJson(json, TimerStatus::class.java)
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }
    }

    /**
     * 观察当前计时器（Flow）
     */
    fun observeCurrentTimer(): Flow<TimerStatus?> {
        return dataStore.data.map { preferences ->
            val json = preferences[CURRENT_TIMER_KEY]
            if (json != null) {
                try {
                    gson.fromJson(json, TimerStatus::class.java)
                } catch (e: Exception) {
                    null
                }
            } else {
                null
            }
        }
    }

    /**
     * 清除当前计时器
     */
    suspend fun clearCurrentTimer() {
        dataStore.edit { preferences ->
            preferences.remove(CURRENT_TIMER_KEY)
        }
    }

    /**
     * 保存离线记录
     */
    suspend fun saveOfflineRecord(record: OfflineTimerRecord) {
        val records = getOfflineRecords().toMutableList()
        records.add(record)
        dataStore.edit { preferences ->
            preferences[OFFLINE_RECORDS_KEY] = gson.toJson(records)
        }
    }

    /**
     * 获取所有离线记录
     */
    suspend fun getOfflineRecords(): List<OfflineTimerRecord> {
        val json = dataStore.data.first()[OFFLINE_RECORDS_KEY]
        return if (json != null) {
            try {
                val type = object : TypeToken<List<OfflineTimerRecord>>() {}.type
                gson.fromJson(json, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
        } else {
            emptyList()
        }
    }

    /**
     * 获取待同步的离线记录（状态为PENDING）
     */
    suspend fun getPendingOfflineRecords(): List<OfflineTimerRecord> {
        return getOfflineRecords().filter {
            SyncStatus.fromString(it.syncStatus) == SyncStatus.PENDING
        }
    }

    /**
     * 标记为已同步
     */
    suspend fun markAsSynced(localId: String) {
        val records = getOfflineRecords().map { record ->
            if (record.localId == localId) {
                record.copy(syncStatus = SyncStatus.SYNCED.toApiString())
            } else {
                record
            }
        }
        dataStore.edit { preferences ->
            preferences[OFFLINE_RECORDS_KEY] = gson.toJson(records)
        }
    }

    /**
     * 标记为同步失败
     */
    suspend fun markAsFailed(localId: String) {
        val records = getOfflineRecords().map { record ->
            if (record.localId == localId) {
                record.copy(syncStatus = SyncStatus.FAILED.toApiString())
            } else {
                record
            }
        }
        dataStore.edit { preferences ->
            preferences[OFFLINE_RECORDS_KEY] = gson.toJson(records)
        }
    }

    /**
     * 清除已同步的记录
     */
    suspend fun clearSyncedRecords() {
        val records = getOfflineRecords().filter {
            SyncStatus.fromString(it.syncStatus) != SyncStatus.SYNCED
        }
        dataStore.edit { preferences ->
            preferences[OFFLINE_RECORDS_KEY] = gson.toJson(records)
        }
    }

    /**
     * 删除单条离线记录
     */
    suspend fun deleteOfflineRecord(localId: String) {
        val records = getOfflineRecords().filter { it.localId != localId }
        dataStore.edit { preferences ->
            preferences[OFFLINE_RECORDS_KEY] = gson.toJson(records)
        }
    }

    /**
     * 清除所有离线记录
     */
    suspend fun clearAllOfflineRecords() {
        dataStore.edit { preferences ->
            preferences.remove(OFFLINE_RECORDS_KEY)
        }
    }

    // ========== Sync Time ==========

    /**
     * 保存上次同步时间
     */
    suspend fun saveLastSyncTime(timestamp: Long = System.currentTimeMillis()) {
        dataStore.edit { preferences ->
            preferences[LAST_SYNC_TIME_KEY] = timestamp
        }
    }

    /**
     * 获取上次同步时间
     */
    suspend fun getLastSyncTime(): Long? {
        return dataStore.data.first()[LAST_SYNC_TIME_KEY]
    }

    /**
     * 观察上次同步时间
     */
    fun observeLastSyncTime(): Flow<Long?> {
        return dataStore.data.map { preferences ->
            preferences[LAST_SYNC_TIME_KEY]
        }
    }

    // ========== Helper Functions ==========

    /**
     * 清除所有缓存数据（用于登出等场景）
     */
    suspend fun clearAll() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    /**
     * 获取缓存统计信息
     */
    suspend fun getCacheStats(): CacheStats {
        val preferences = dataStore.data.first()
        val hasCurrentTimer = preferences[CURRENT_TIMER_KEY] != null
        val offlineRecords = getOfflineRecords()
        val lastSyncTime = preferences[LAST_SYNC_TIME_KEY]

        return CacheStats(
            hasCurrentTimer = hasCurrentTimer,
            totalOfflineRecords = offlineRecords.size,
            pendingRecords = offlineRecords.count {
                SyncStatus.fromString(it.syncStatus) == SyncStatus.PENDING
            },
            syncedRecords = offlineRecords.count {
                SyncStatus.fromString(it.syncStatus) == SyncStatus.SYNCED
            },
            failedRecords = offlineRecords.count {
                SyncStatus.fromString(it.syncStatus) == SyncStatus.FAILED
            },
            lastSyncTime = lastSyncTime
        )
    }
}

/**
 * 缓存统计信息
 */
data class CacheStats(
    val hasCurrentTimer: Boolean,
    val totalOfflineRecords: Int,
    val pendingRecords: Int,
    val syncedRecords: Int,
    val failedRecords: Int,
    val lastSyncTime: Long?
)
