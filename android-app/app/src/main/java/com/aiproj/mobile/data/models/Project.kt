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

    // 🆕 新增字段
    @SerializedName("members")
    val members: List<User>? = null,

    @SerializedName("task_stats")
    val taskStats: TaskStats? = null,

    @SerializedName("is_favorite")
    val isFavorite: Boolean = false,

    @SerializedName("priority")
    val priority: String? = null,

    @SerializedName("tags")
    val tags: List<String>? = null,

    @SerializedName("project_number")
    val projectNumber: String? = null,

    @SerializedName("start_date")
    val startDate: String? = null,

    @SerializedName("end_date")
    val endDate: String? = null,

    @SerializedName("company_id")
    val companyId: Int? = null,

    @SerializedName("company_name")
    val companyName: String? = null,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String
)

/**
 * 项目列表数据
 */
data class ProjectListData(
    @SerializedName("data")
    val data: List<Project>,

    @SerializedName("pagination")
    val pagination: Pagination?
) {
    // 提供便捷属性以兼容旧代码
    val projects: List<Project> get() = data
    val total: Int get() = pagination?.total ?: data.size
}

/**
 * 项目列表响应 (包含 ApiResponse 包装)
 */
typealias ProjectListResponse = ApiResponse<ProjectListData>
