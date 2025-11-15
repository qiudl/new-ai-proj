package com.aiproj.mobile.data.api

import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

/**
 * 认证拦截器
 * 自动在请求头中添加 JWT Token
 * 支持 Token 过期后自动刷新
 */
class AuthInterceptor @Inject constructor(
    private val tokenProvider: TokenProvider
) : Interceptor {

    // 用于防止并发刷新
    private val refreshLock = Any()

    // 标记是否正在刷新
    @Volatile
    private var isRefreshing = false

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestPath = originalRequest.url.encodedPath

        // 跳过不需要认证的端点（登录、注册等）
        val skipAuthPaths = listOf(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh"  // refresh 有自己的 token 逻辑
        )

        val shouldSkipAuth = skipAuthPaths.any { requestPath.endsWith(it) }

        if (shouldSkipAuth) {
            android.util.Log.d("AuthInterceptor", "Skipping auth for: $requestPath")
            return chain.proceed(originalRequest)
        }

        // 获取 Token
        val token = runBlocking {
            tokenProvider.getToken()
        }

        android.util.Log.d("AuthInterceptor", "Request: ${originalRequest.url}, Token: ${token?.take(20) ?: "null"}")

        // 如果没有 Token，直接执行请求
        if (token.isNullOrEmpty()) {
            android.util.Log.w("AuthInterceptor", "No token available, proceeding without auth")
            return chain.proceed(originalRequest)
        }

        // 添加 Authorization 头
        val authenticatedRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()

        // 执行请求
        val response = chain.proceed(authenticatedRequest)

        // 检查是否需要刷新 Token (401 Unauthorized)
        if (response.code == 401 && !isRefreshing) {
            response.close()

            synchronized(refreshLock) {
                // 双重检查，避免重复刷新
                if (isRefreshing) {
                    // 等待其他线程完成刷新，然后重试
                    val newToken = runBlocking { tokenProvider.getToken() }
                    if (!newToken.isNullOrEmpty() && newToken != token) {
                        val newRequest = originalRequest.newBuilder()
                            .header("Authorization", "Bearer $newToken")
                            .build()
                        return chain.proceed(newRequest)
                    }
                    return response
                }

                isRefreshing = true

                try {
                    // 尝试刷新 Token
                    val newToken = runBlocking {
                        refreshToken()
                    }

                    if (newToken != null) {
                        // 刷新成功，使用新 Token 重试原始请求
                        val newRequest = originalRequest.newBuilder()
                            .header("Authorization", "Bearer $newToken")
                            .build()

                        return chain.proceed(newRequest)
                    } else {
                        // 刷新失败，清除 Token
                        runBlocking {
                            tokenProvider.clearToken()
                        }
                        return response
                    }
                } finally {
                    isRefreshing = false
                }
            }
        }

        return response
    }

    /**
     * 刷新 Token
     * @return 新的 Token，刷新失败返回 null
     */
    private suspend fun refreshToken(): String? {
        return try {
            // 调用刷新接口
            val retrofit = createRefreshRetrofit()
            val authApi = retrofit.create(AuthApi::class.java)

            val response = authApi.refreshToken()

            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                // 保存新的 Token
                tokenProvider.saveToken(loginResponse.token)
                loginResponse.token
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 创建用于刷新 Token 的 Retrofit 实例
     * 避免循环依赖
     */
    private fun createRefreshRetrofit(): retrofit2.Retrofit {
        val okHttpClient = okhttp3.OkHttpClient.Builder()
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        return retrofit2.Retrofit.Builder()
            .baseUrl(getBaseUrl())
            .client(okHttpClient)
            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
            .build()
    }

    /**
     * 获取 Base URL
     */
    private fun getBaseUrl(): String {
        // 使用 BuildConfig 中的 API_BASE_URL
        return try {
            val buildConfigClass = Class.forName("com.aiproj.mobile.BuildConfig")
            val field = buildConfigClass.getDeclaredField("API_BASE_URL")
            field.get(null) as String
        } catch (e: Exception) {
            "http://10.0.2.2:8080/api/v1/"
        }
    }
}

/**
 * Token 提供者接口
 * 用于从本地存储获取 JWT Token
 */
interface TokenProvider {
    suspend fun getToken(): String?
    suspend fun saveToken(token: String)
    suspend fun clearToken()
}
