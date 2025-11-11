package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName
import java.util.Date

data class Requirement(
    val id: Int,

    @SerializedName("project_id")
    val projectId: Int,

    val title: String,

    val description: String?,

    val status: RequirementStatus,

    val priority: RequirementPriority,

    val category: RequirementCategory,

    @SerializedName("submitter_id")
    val submitterId: Int,

    @SerializedName("submitter_name")
    val submitterName: String?,

    @SerializedName("reviewer_id")
    val reviewerId: Int?,

    @SerializedName("reviewer_name")
    val reviewerName: String?,

    @SerializedName("review_comment")
    val reviewComment: String?,

    @SerializedName("complexity_rating")
    val complexityRating: ComplexityRating?,

    @SerializedName("business_value")
    val businessValue: Int?,

    @SerializedName("technical_risk")
    val technicalRisk: String?,

    @SerializedName("acceptance_criteria")
    val acceptanceCriteria: String?,

    @SerializedName("related_tasks_count")
    val relatedTasksCount: Int = 0,

    @SerializedName("comments_count")
    val commentsCount: Int = 0,

    @SerializedName("created_at")
    val createdAt: Date?,

    @SerializedName("updated_at")
    val updatedAt: Date?,

    @SerializedName("submitted_at")
    val submittedAt: Date?,

    @SerializedName("reviewed_at")
    val reviewedAt: Date?
)

// 需求状态枚举
enum class RequirementStatus {
    @SerializedName("draft")
    DRAFT,          // 草稿

    @SerializedName("pending")
    PENDING,        // 待评审

    @SerializedName("reviewing")
    REVIEWING,      // 评审中

    @SerializedName("approved")
    APPROVED,       // 已批准

    @SerializedName("rejected")
    REJECTED,       // 已拒绝

    @SerializedName("archived")
    ARCHIVED        // 已归档
}

// 需求优先级枚举
enum class RequirementPriority {
    @SerializedName("low")
    LOW,

    @SerializedName("medium")
    MEDIUM,

    @SerializedName("high")
    HIGH,

    @SerializedName("urgent")
    URGENT
}

// 需求类别枚举
enum class RequirementCategory {
    @SerializedName("feature")
    FEATURE,        // 功能需求

    @SerializedName("bug")
    BUG,            // 缺陷修复

    @SerializedName("improvement")
    IMPROVEMENT,    // 改进优化

    @SerializedName("documentation")
    DOCUMENTATION,  // 文档需求

    @SerializedName("other")
    OTHER           // 其他
}

// 复杂度评级枚举
enum class ComplexityRating {
    @SerializedName("simple")
    SIMPLE,         // 简单

    @SerializedName("medium")
    MEDIUM,         // 中等

    @SerializedName("complex")
    COMPLEX,        // 复杂

    @SerializedName("very_complex")
    VERY_COMPLEX    // 非常复杂
}
