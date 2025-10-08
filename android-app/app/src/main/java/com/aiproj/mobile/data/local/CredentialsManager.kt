package com.aiproj.mobile.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 安全凭据管理器
 * 使用 EncryptedSharedPreferences 加密存储敏感信息
 */
@Singleton
class CredentialsManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "biometric_credentials",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    companion object {
        private const val KEY_USERNAME = "saved_username"
        private const val KEY_PASSWORD = "saved_password"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
    }

    /**
     * 保存生物识别凭据
     */
    fun saveBiometricCredentials(username: String, password: String) {
        sharedPreferences.edit()
            .putString(KEY_USERNAME, username)
            .putString(KEY_PASSWORD, password)
            .putBoolean(KEY_BIOMETRIC_ENABLED, true)
            .apply()
    }

    /**
     * 获取保存的用户名
     */
    fun getSavedUsername(): String? {
        return sharedPreferences.getString(KEY_USERNAME, null)
    }

    /**
     * 获取保存的密码
     */
    fun getSavedPassword(): String? {
        return sharedPreferences.getString(KEY_PASSWORD, null)
    }

    /**
     * 检查是否启用了生物识别
     */
    fun isBiometricEnabled(): Boolean {
        return sharedPreferences.getBoolean(KEY_BIOMETRIC_ENABLED, false)
    }

    /**
     * 清除保存的凭据
     */
    fun clearCredentials() {
        sharedPreferences.edit()
            .remove(KEY_USERNAME)
            .remove(KEY_PASSWORD)
            .remove(KEY_BIOMETRIC_ENABLED)
            .apply()
    }

    /**
     * 获取保存的凭据（用于生物识别后自动登录）
     */
    fun getSavedCredentials(): Pair<String, String>? {
        val username = getSavedUsername()
        val password = getSavedPassword()

        return if (username != null && password != null) {
            Pair(username, password)
        } else {
            null
        }
    }
}
