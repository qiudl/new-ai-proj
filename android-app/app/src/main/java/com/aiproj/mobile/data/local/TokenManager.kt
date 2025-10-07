package com.aiproj.mobile.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.aiproj.mobile.data.api.TokenProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Token 管理器
 * 使用 EncryptedSharedPreferences 安全存储 JWT Token
 *
 * 安全措施:
 * - 使用 EncryptedSharedPreferences 加密存储（符合 SECURITY_AUDIT_CHECKLIST.md）
 * - 使用 AES256_GCM 加密算法
 * - 基于 MasterKey 的密钥管理
 * - 满足 OWASP Mobile Top 10 安全标准
 */
@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) : TokenProvider {

    companion object {
        private const val PREFS_NAME = "auth_prefs_encrypted"
        private const val KEY_JWT_TOKEN = "jwt_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_EXPIRES_AT = "expires_at"
    }

    // 加密的 SharedPreferences 实例（延迟初始化）
    private val encryptedPrefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /**
     * 获取 Token
     */
    override suspend fun getToken(): String? {
        return encryptedPrefs.getString(KEY_JWT_TOKEN, null)
    }

    /**
     * 保存 Token
     */
    override suspend fun saveToken(token: String) {
        encryptedPrefs.edit()
            .putString(KEY_JWT_TOKEN, token)
            .apply()
    }

    /**
     * 清除 Token
     */
    override suspend fun clearToken() {
        encryptedPrefs.edit()
            .remove(KEY_JWT_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_EXPIRES_AT)
            .apply()
    }

    /**
     * 获取 Refresh Token
     */
    suspend fun getRefreshToken(): String? {
        return encryptedPrefs.getString(KEY_REFRESH_TOKEN, null)
    }

    /**
     * 保存 Refresh Token
     */
    suspend fun saveRefreshToken(refreshToken: String) {
        encryptedPrefs.edit()
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
    }

    /**
     * 保存 Token 过期时间
     */
    suspend fun saveExpiresAt(expiresAt: String) {
        encryptedPrefs.edit()
            .putString(KEY_EXPIRES_AT, expiresAt)
            .apply()
    }

    /**
     * 获取 Token 过期时间
     */
    suspend fun getExpiresAt(): String? {
        return encryptedPrefs.getString(KEY_EXPIRES_AT, null)
    }

    /**
     * 保存完整的登录响应
     */
    suspend fun saveLoginResponse(token: String, refreshToken: String?, expiresAt: String?) {
        encryptedPrefs.edit().apply {
            putString(KEY_JWT_TOKEN, token)
            if (refreshToken != null) {
                putString(KEY_REFRESH_TOKEN, refreshToken)
            }
            if (expiresAt != null) {
                putString(KEY_EXPIRES_AT, expiresAt)
            }
            apply()
        }
    }
}
