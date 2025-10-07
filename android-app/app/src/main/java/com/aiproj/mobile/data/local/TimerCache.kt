package com.aiproj.mobile.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
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
 * 使用DataStore存储
 */
@Singleton
class TimerCache @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val gson: Gson
) {

    companion object {
        private val CURRENT_TIMER_KEY = stringPreferencesKey("current_timer")
        private val OFFLINE_RECORDS_KEY = stringPreferencesKey("offline_records")
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
     * 获取当前计时器
     */
    suspend fun getCurrentTimer(): TimerStatus? {
        val json = dataStore.data.first()[CURRENT_TIMER_KEY]
        return if (json != null) {
            gson.fromJson(json, TimerStatus::class.java)
        } else {
            null
        }
    }

    /**
     * 观察当前计时器
     */
    fun observeCurrentTimer(): Flow<TimerStatus?> {
        return dataStore.data.map { preferences ->
            val json = preferences[CURRENT_TIMER_KEY]
            if (json != null) {
                gson.fromJson(json, TimerStatus::class.java)
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
     * 获取离线记录
     */
    suspend fun getOfflineRecords(): List<OfflineTimerRecord> {
        val json = dataStore.data.first()[OFFLINE_RECORDS_KEY]
        return if (json != null) {
            val type = object : TypeToken<List<OfflineTimerRecord>>() {}.type
            gson.fromJson(json, type)
        } else {
            emptyList()
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
            it.syncStatus != SyncStatus.SYNCED.toApiString()
        }
        dataStore.edit { preferences ->
            preferences[OFFLINE_RECORDS_KEY] = gson.toJson(records)
        }
    }
}
