package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 分页信息
 */
data class Pagination(
    @SerializedName("page")
    val page: Int,

    @SerializedName("limit")
    val limit: Int,

    @SerializedName("total")
    val total: Int,

    @SerializedName("totalPages")
    val totalPages: Int,

    @SerializedName("hasNext")
    val hasNext: Boolean,

    @SerializedName("hasPrev")
    val hasPrev: Boolean
)

/**
 * 通用API响应
 */
data class ApiResponse<T>(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: T?,

    @SerializedName("message")
    val message: String?,

    @SerializedName("error")
    val error: String?
)

/**
 * API错误响应
 */
data class ApiError(
    @SerializedName("error")
    val error: String,

    @SerializedName("message")
    val message: String?,

    @SerializedName("code")
    val code: Int?
)
