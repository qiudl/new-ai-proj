# 任务 #3657: RequirementApi接口定义

## 任务信息
- **任务ID**: #3657
- **父任务**: #3656 - Android需求管理模块设计
- **负责Agent**: Agent 1 - 数据层专家
- **预估工时**: 0.5小时
- **优先级**: Medium
- **状态**: Todo

## 任务目标

在Android应用中定义需求管理的Retrofit API接口，用于与后端API进行数据交互。

## 实现文件

```
android-app/app/src/main/java/com/aiproj/mobile/data/api/RequirementApi.kt
```

## 实现内容

### 1. API接口定义

```kotlin
package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface RequirementApi {
    /**
     * 获取需求列表（分页）
     */
    @GET("requirements")
    suspend fun getRequirements(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
        @Query("status") status: String? = null,
        @Query("priority") priority: String? = null,
        @Query("search") search: String? = null,
        @Query("project_id") projectId: Int? = null
    ): Response<RequirementListResponse>

    /**
     * 获取需求详情
     */
    @GET("requirements/{id}")
    suspend fun getRequirement(
        @Path("id") id: Int
    ): Response<Requirement>

    /**
     * 创建需求
     */
    @POST("requirements")
    suspend fun createRequirement(
        @Body dto: CreateRequirementDTO
    ): Response<Requirement>

    /**
     * 更新需求
     */
    @PUT("requirements/{id}")
    suspend fun updateRequirement(
        @Path("id") id: Int,
        @Body dto: UpdateRequirementDTO
    ): Response<Requirement>

    /**
     * 删除需求
     */
    @DELETE("requirements/{id}")
    suspend fun deleteRequirement(
        @Path("id") id: Int
    ): Response<Unit>

    /**
     * 提交需求评审
     */
    @POST("requirements/{id}/submit")
    suspend fun submitRequirement(
        @Path("id") id: Int
    ): Response<Requirement>

    /**
     * 批准需求
     */
    @POST("requirements/{id}/approve")
    suspend fun approveRequirement(
        @Path("id") id: Int,
        @Body request: ApproveRequest
    ): Response<Requirement>

    /**
     * 拒绝需求
     */
    @POST("requirements/{id}/reject")
    suspend fun rejectRequirement(
        @Path("id") id: Int,
        @Body request: RejectRequest
    ): Response<Requirement>

    /**
     * 关联任务到需求
     */
    @POST("requirements/{id}/tasks")
    suspend fun linkTasks(
        @Path("id") id: Int,
        @Body taskIds: List<Int>
    ): Response<Unit>

    /**
     * 获取需求关联的任务列表
     */
    @GET("requirements/{id}/tasks")
    suspend fun getRequirementTasks(
        @Path("id") id: Int,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20
    ): Response<TaskListResponse>
}
```

### 2. 请求数据类

```kotlin
/**
 * 批准需求请求
 */
data class ApproveRequest(
    val comment: String? = null
)

/**
 * 拒绝需求请求
 */
data class RejectRequest(
    val reason: String
)
```

### 3. 响应数据类

```kotlin
data class RequirementListResponse(
    val data: List<Requirement>,
    val pagination: Pagination
)

data class TaskListResponse(
    val data: List<Task>,
    val pagination: Pagination
)

data class Pagination(
    val page: Int,
    val page_size: Int,
    val total: Int,
    val total_pages: Int
)
```

**注意**: `Task` 数据模型将在任务 #3660 - Task数据模型 中定义。

## 依赖关系

**前置依赖**:
- #3658 - Requirement数据模型（接口中需要使用）

**后续依赖**:
- #3659 - RequirementRepository（将使用此API接口）

## 验证标准

- [ ] API接口完整定义所有CRUD操作
- [ ] 支持分页查询
- [ ] 支持筛选（状态、优先级、项目）
- [ ] 支持搜索功能
- [ ] 包含需求评审相关接口
- [ ] 包含任务关联接口
- [ ] 所有方法使用suspend关键字
- [ ] 使用Retrofit注解正确标注

## 注意事项

1. 所有API方法必须使用`suspend`关键字支持协程
2. 返回类型使用`Response<T>`以便处理HTTP状态码
3. 查询参数使用可选类型（nullable）
4. 遵循RESTful API设计规范
5. 接口中使用相对路径（如 `requirements`），需要在 Retrofit 配置中设置 base URL 为 `https://your-domain.com/api/v1/`
6. `@Body` 参数必须使用数据类，不能直接使用基本类型（如 String）

## 完成标记

完成后在此任务下评论："✅ RequirementApi接口定义完成"
