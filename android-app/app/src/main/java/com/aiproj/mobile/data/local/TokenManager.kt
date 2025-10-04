package com.aiproj.mobile.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.aiproj.mobile.data.api.TokenProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

// DataStore 扩展
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

/**
 * Token 管理器
 * 使用 DataStore 安全存储 JWT Token
 */
@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) : TokenProvider {

    private val tokenKey = stringPreferencesKey("jwt_token")
    private val refreshTokenKey = stringPreferencesKey("refresh_token")
    private val expiresAtKey = stringPreferencesKey("expires_at")

    /**
     * 获取 Token
     */
    override suspend fun getToken(): String? {
        return context.dataStore.data
            .map { preferences ->
                preferences[tokenKey]
            }
            .first()
    }

    /**
     * 保存 Token
     */
    override suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[tokenKey] = token
        }
    }

    /**
     * 清除 Token
     */
    override suspend fun clearToken() {
        context.dataStore.edit { preferences ->
            preferences.remove(tokenKey)
            preferences.remove(refreshTokenKey)
            preferences.remove(expiresAtKey)
        }
    }

    /**
     * 获取 Refresh Token
     */
    suspend fun getRefreshToken(): String? {
        return context.dataStore.data
            .map { preferences ->
                preferences[refreshTokenKey]
            }
            .first()
    }

    /**
     * 保存 Refresh Token
     */
    suspend fun saveRefreshToken(refreshToken: String) {
        context.dataStore.edit { preferences ->
            preferences[refreshTokenKey] = refreshToken
        }
    }

    /**
     * 保存 Token 过期时间
     */
    suspend fun saveExpiresAt(expiresAt: String) {
        context.dataStore.edit { preferences ->
            preferences[expiresAtKey] = expiresAt
        }
    }

    /**
     * 获取 Token 过期时间
     */
    suspend fun getExpiresAt(): String? {
        return context.dataStore.data
            .map { preferences ->
                preferences[expiresAtKey]
            }
            .first()
    }

    /**
     * 保存完整的登录响应
     */
    suspend fun saveLoginResponse(token: String, refreshToken: String?, expiresAt: String?) {
        context.dataStore.edit { preferences ->
            preferences[tokenKey] = token
            if (refreshToken != null) {
                preferences[refreshTokenKey] = refreshToken
            }
            if (expiresAt != null) {
                preferences[expiresAtKey] = expiresAt
            }
        }
    }
}
