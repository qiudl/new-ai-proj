package com.aiproj.mobile.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.cacheDataStore by preferencesDataStore(name = "app_cache")

@Singleton
class CacheManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    private val cache = mutableMapOf<String, Any>()

    suspend fun <T> getCache(key: String, clazz: Class<T>): T? {
        return cache[key] as? T ?: loadFromDataStore(key, clazz)
    }

    suspend fun <T> saveCache(key: String, data: T) {
        cache[key] = data as Any
        saveToDataStore(key, data)
    }

    private suspend fun <T> loadFromDataStore(key: String, clazz: Class<T>): T? {
        val prefKey = stringPreferencesKey(key)
        val json = context.cacheDataStore.data.map { it[prefKey] }.first()
        return json?.let { gson.fromJson(it, clazz) }
    }

    private suspend fun <T> saveToDataStore(key: String, data: T) {
        val prefKey = stringPreferencesKey(key)
        val json = gson.toJson(data)
        context.cacheDataStore.edit { it[prefKey] = json }
    }

    fun clearMemoryCache() {
        cache.clear()
    }
}
