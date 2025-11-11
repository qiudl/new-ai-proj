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

### 文件1: Requirement.kt
```
app/src/main/java/com/aiproj/mobile/data/model/Requirement.kt
```
包含：Requirement 数据类、RequirementStatus、RequirementPriority、RequirementCategory、ComplexityRating 枚举

### 文件2: RequirementDTO.kt
```
app/src/main/java/com/aiproj/mobile/data/model/RequirementDTO.kt
```
包含：CreateRequirementDTO、UpdateRequirementDTO 数据类

## 实现内容

### 1. Requirement.kt - 需求实体模型和枚举

```kotlin
package com.aiproj.mobile.data.model

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

### 2. RequirementDTO.kt - 创建/更新DTO

```kotlin
package com.aiproj.mobile.data.model

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

**前置依赖**: 无（数据模型应该优先定义）

**后续依赖**:
- #3657 - RequirementApi接口（API接口需要使用这些数据模型）
- #3659 - RequirementRepository（Repository需要使用这些数据模型）

**重要说明**：本任务应该**最先完成**，因为 API 接口和 Repository 都依赖于这些数据模型的定义。

## 验证标准

- [ ] 所有字段与后端API响应匹配
- [ ] 使用@SerializedName标注snake_case字段
- [ ] 枚举值与后端保持一致
- [ ] 日期字段使用Date类型
- [ ] 可空字段正确标注为nullable
- [ ] DTO与实体分离

## 注意事项

1. **字段命名**：使用camelCase（Kotlin规范）
2. **JSON序列化**：使用@SerializedName处理snake_case
3. **枚举值**：必须与后端完全一致
4. **DTO设计**：创建/更新DTO只包含可编辑字段，不包含系统自动生成的字段（如id、createdAt等）
5. **时间字段**：使用java.util.Date，需要配置Gson日期格式

### Gson 日期格式配置

在 Retrofit 配置中需要设置日期格式：

```kotlin
val gson = GsonBuilder()
    .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    .create()

val retrofit = Retrofit.Builder()
    .baseUrl("https://your-domain.com/api/v1/")
    .addConverterFactory(GsonConverterFactory.create(gson))
    .build()
```

6. **字段约束**：
   - `title`: 必填字段，不能为空
   - `projectId`: 必填字段，必须是有效的项目ID
   - `priority` 和 `category`: 在创建时有默认值
   - `businessValue`: 建议范围 1-10
   - `description` 和 `acceptanceCriteria`: 可选字段

7. **与API接口协调**：
   - API接口的 `createRequirement` 应该使用 `CreateRequirementDTO` 而不是 `Requirement`
   - API接口的 `updateRequirement` 应该使用 `UpdateRequirementDTO` 而不是 `Requirement`
   - 这是最佳实践，避免客户端传入不应修改的系统字段
   - 需要在 #3657 任务中相应调整 API 接口定义

## 使用示例

### 创建需求

```kotlin
val createDto = CreateRequirementDTO(
    projectId = 1,
    title = "实现用户登录功能",
    description = "支持邮箱和手机号登录，提供记住密码功能",
    priority = RequirementPriority.HIGH,
    category = RequirementCategory.FEATURE,
    acceptanceCriteria = """
        1. 用户可以使用邮箱登录
        2. 用户可以使用手机号登录
        3. 提供"记住密码"选项
        4. 登录失败时显示友好的错误提示
    """.trimIndent()
)
```

### 更新需求

```kotlin
val updateDto = UpdateRequirementDTO(
    title = "实现用户登录和注册功能",
    priority = RequirementPriority.URGENT,
    description = "扩展需求：增加注册功能",
    category = null,  // 不修改类别
    acceptanceCriteria = null  // 不修改验收标准
)
```

### 使用枚举

```kotlin
// 检查需求状态
when (requirement.status) {
    RequirementStatus.DRAFT -> println("需求还在草稿阶段")
    RequirementStatus.PENDING -> println("需求等待评审")
    RequirementStatus.APPROVED -> println("需求已批准")
    else -> println("其他状态")
}

// 根据优先级排序
val sortedRequirements = requirements.sortedByDescending {
    when (it.priority) {
        RequirementPriority.URGENT -> 4
        RequirementPriority.HIGH -> 3
        RequirementPriority.MEDIUM -> 2
        RequirementPriority.LOW -> 1
    }
}
```

## 完成标记

完成后在此任务下评论："✅ Requirement数据模型定义完成"
