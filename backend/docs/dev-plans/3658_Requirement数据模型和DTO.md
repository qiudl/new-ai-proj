# 任务 #3658: Requirement数据模型和DTO定义

## 任务信息
- **任务ID**: #3658
- **父任务**: #3656 - Android需求管理模块设计
- **负责Agent**: Agent 1 - 数据层专家
- **预估工时**: 0.5小时
- **优先级**: Medium
- **状态**: Todo

## 任务目标

定义需求管理的Kotlin数据模型类，包括Requirement实体、DTO和状态枚举。

## 实现文件

```
android-app/app/src/main/java/com/aiproj/mobile/data/models/Requirement.kt
android-app/app/src/main/java/com/aiproj/mobile/data/models/RequirementDTO.kt
```

## 实现内容

### 1. 需求实体模型

```kotlin
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
```

### 2. 创建/更新DTO

```kotlin
package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

data class CreateRequirementDTO(
    @SerializedName("project_id")
    val projectId: Int,

    val title: String,

    val description: String?,

    val priority: RequirementPriority = RequirementPriority.MEDIUM,

    val category: RequirementCategory = RequirementCategory.FEATURE,

    @SerializedName("acceptance_criteria")
    val acceptanceCriteria: String?
)

data class UpdateRequirementDTO(
    val title: String?,

    val description: String?,

    val priority: RequirementPriority?,

    val category: RequirementCategory?,

    @SerializedName("acceptance_criteria")
    val acceptanceCriteria: String?
)
```

## 依赖关系

**前置依赖**: #3657 - RequirementApi接口
**后续依赖**: #3659 - RequirementRepository

## 验证标准

- [ ] 所有字段与后端API响应匹配
- [ ] 使用@SerializedName标注snake_case字段
- [ ] 枚举值与后端保持一致
- [ ] 日期字段使用Date类型
- [ ] 可空字段正确标注为nullable
- [ ] DTO与实体分离

## 注意事项

1. 字段命名使用camelCase（Kotlin规范）
2. JSON序列化使用@SerializedName处理snake_case
3. 枚举值必须与后端完全一致
4. 创建/更新DTO只包含可编辑字段
5. 时间字段使用java.util.Date（Retrofit默认支持）

## 完成标记

完成后在此任务下评论："✅ Requirement数据模型定义完成"
