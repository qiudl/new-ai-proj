package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 用户数据模型
 */
data class User(
    @SerializedName("id")
    val id: Int,

    @SerializedName("username")
    val username: String,

    @SerializedName("email")
    val email: String?,

    @SerializedName("display_name")
    val displayName: String?,

    @SerializedName("avatar_url")
    val avatarUrl: String?,

    @SerializedName("role")
    val role: String?,

    @SerializedName("created_at")
    val createdAt: String?,

    @SerializedName("updated_at")
    val updatedAt: String?
)

/**
 * 登录请求
 */
data class LoginRequest(
    @SerializedName("username")
    val username: String,

    @SerializedName("password")
    val password: String
)

/**
 * 登录响应
 */
data class LoginResponse(
    @SerializedName("token")
    val token: String,

    @SerializedName("refresh_token")
    val refreshToken: String?,

    @SerializedName("user")
    val user: User,

    @SerializedName("expires_at")
    val expiresAt: String?,

    @SerializedName("expires_in")
    val expiresIn: Long?
)
