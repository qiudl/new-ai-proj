package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.LoginRequest
import com.aiproj.mobile.data.models.LoginResponse
import com.aiproj.mobile.data.models.User
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * 认证相关 API 接口
 */
interface AuthApi {

    /**
     * 用户登录
     */
    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    /**
     * 获取当前用户信息
     */
    @GET("auth/me")
    suspend fun getCurrentUser(): Response<User>

    /**
     * 退出登录
     */
    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    /**
     * 刷新 Token
     */
    @POST("auth/refresh")
    suspend fun refreshToken(): Response<LoginResponse>
}
