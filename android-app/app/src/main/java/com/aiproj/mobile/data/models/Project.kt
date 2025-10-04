package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 项目数据模型
 */
data class Project(
    @SerializedName("id")
    val id: Int,

    @SerializedName("name")
    val name: String,

    @SerializedName("description")
    val description: String?,

    @SerializedName("status")
    val status: String?,

    @SerializedName("owner_id")
    val ownerId: Int?,

    @SerializedName("owner")
    val owner: User?,

    @SerializedName("task_count")
    val taskCount: Int?,

    @SerializedName("member_count")
    val memberCount: Int? = 0,

    @SerializedName("completion_rate")
    val completionRate: Float? = 0f,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String
)

/**
 * 项目列表响应
 */
data class ProjectListResponse(
    @SerializedName("projects")
    val projects: List<Project>,

    @SerializedName("total")
    val total: Int,

    @SerializedName("pagination")
    val pagination: Pagination?
)
