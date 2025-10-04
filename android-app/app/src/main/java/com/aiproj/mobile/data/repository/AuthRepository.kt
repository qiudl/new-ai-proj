package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.AuthApi
import com.aiproj.mobile.data.api.TokenProvider
import com.aiproj.mobile.data.models.LoginRequest
import com.aiproj.mobile.data.models.LoginResponse
import com.aiproj.mobile.data.models.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 认证 Repository
 * 负责处理登录、注册、Token 管理等认证相关业务
 */
@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenProvider: TokenProvider
) {

    /**
     * 用户登录
     */
    suspend fun login(username: String, password: String): Result<LoginResponse> {
        return try {
            val response = authApi.login(
                LoginRequest(username, password)
            )

            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                // 保存 Token 和 Refresh Token
                if (tokenProvider is com.aiproj.mobile.data.local.TokenManager) {
                    tokenProvider.saveLoginResponse(
                        token = loginResponse.token,
                        refreshToken = loginResponse.refreshToken,
                        expiresAt = loginResponse.expiresAt
                    )
                } else {
                    tokenProvider.saveToken(loginResponse.token)
                }
                Result.success(loginResponse)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "登录失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取当前用户信息
     */
    suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = authApi.getCurrentUser()

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "获取用户信息失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 退出登录
     */
    suspend fun logout(): Result<Unit> {
        return try {
            val response = authApi.logout()
            // 清除本地 Token
            tokenProvider.clearToken()

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "退出登录失败")
                )
            }
        } catch (e: Exception) {
            // 即使服务端请求失败，也清除本地 Token
            tokenProvider.clearToken()
            Result.failure(e)
        }
    }

    /**
     * 检查是否已登录
     */
    suspend fun isLoggedIn(): Boolean {
        val token = tokenProvider.getToken()
        return !token.isNullOrEmpty()
    }

    /**
     * 获取保存的 Token
     */
    suspend fun getToken(): String? {
        return tokenProvider.getToken()
    }

    /**
     * 刷新 Token
     */
    suspend fun refreshToken(): Result<String> {
        return try {
            val response = authApi.refreshToken()

            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                // 保存新的 Token
                tokenProvider.saveToken(loginResponse.token)
                Result.success(loginResponse.token)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "刷新Token失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
