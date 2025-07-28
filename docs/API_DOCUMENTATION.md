# 任务文档系统 API 文档

## 概述

本文档描述了升级后的任务文档系统的完整API接口。系统采用MVP架构设计，提供了向后兼容的API以及增强的新功能。

## 基本信息

- **Base URL**: `http://localhost:8080/api/v1`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`
- **响应格式**: JSON

## 认证

所有API请求都需要在Header中包含JWT Token：

```http
Authorization: Bearer <your-jwt-token>
```

## API 接口

### 1. 任务文档管理 (基础API - 向后兼容)

#### 1.1 获取任务文档
```http
GET /projects/{projectId}/tasks/{taskId}/document
```

##### 响应
```json
{
  "content": "文档内容",
  "lastModified": "2024-01-01T12:00:00Z",
  "exists": true
}
```

#### 1.2 保存任务文档
```http
PUT /projects/{projectId}/tasks/{taskId}/document
```

##### 请求体
```json
{
  "content": "更新的文档内容"
}
```

##### 响应
```json
{
  "success": true,
  "message": "文档保存成功",
  "lastModified": "2024-01-01T12:00:00Z"
}
```

#### 1.3 检查文档存在性
```http
HEAD /projects/{projectId}/tasks/{taskId}/document
```

##### 响应头
```http
Document-Exists: true
Last-Modified: Mon, 01 Jan 2024 12:00:00 GMT
```

### 2. 任务文档管理 (增强API)

#### 2.1 获取任务文档 (增强版)
```http
GET /projects/{projectId}/tasks/{taskId}/document/advanced
```

##### 响应
```json
{
  "id": 123,
  "task_id": 456,
  "project_id": 789,
  "title": "任务文档标题",
  "content": "文档内容",
  "type": "task_document",
  "status": "draft",
  "version": 1,
  "metadata": {
    "tags": ["重要", "紧急"],
    "category": "开发任务"
  },
  "owner_id": 100,
  "created_by": 100,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z",
  "can_edit": true,
  "can_delete": true,
  "relations": []
}
```

#### 2.2 更新任务文档 (增强版)
```http
PATCH /projects/{projectId}/tasks/{taskId}/document/advanced
```

##### 请求体
```json
{
  "content": "更新的文档内容",
  "title": "新标题",
  "status": "published",
  "metadata": {
    "tags": ["更新", "完成"],
    "priority": "high"
  }
}
```

#### 2.3 删除任务文档
```http
DELETE /projects/{projectId}/tasks/{taskId}/document
```

##### 响应
```json
{
  "success": true,
  "message": "文档删除成功",
  "deleted_at": "2024-01-01T12:00:00Z"
}
```

### 3. 智能模板系统

#### 3.1 获取模板推荐
```http
GET /projects/{projectId}/tasks/{taskId}/templates/recommendations
```

##### 查询参数
- `category` (可选): 模板分类
- `priority` (可选): 任务优先级

##### 响应
```json
{
  "recommendations": [
    {
      "template": {
        "id": 1,
        "name": "需求分析模板",
        "description": "标准的需求分析文档模板",
        "type": "task",
        "category": "需求分析",
        "content": "# {{task_title}} - 需求分析\n\n## 需求概述...",
        "variables": [
          {
            "name": "task_title",
            "type": "string",
            "required": true,
            "description": "任务标题"
          }
        ],
        "usage_count": 25
      },
      "score": 0.85,
      "reason": "高度匹配您的任务类型",
      "variables": {
        "task_title": "用户登录功能开发",
        "current_date": "2024-01-01"
      }
    }
  ],
  "count": 1
}
```

#### 3.2 获取所有模板
```http
GET /templates
```

##### 响应
```json
{
  "templates": [...],
  "grouped": {
    "需求分析": [...],
    "技术设计": [...],
    "开发任务": [...]
  },
  "total": 15
}
```

#### 3.3 根据模板生成文档
```http
POST /templates/{templateId}/generate
```

##### 请求体
```json
{
  "variables": {
    "task_title": "用户登录功能",
    "task_description": "实现用户登录和认证功能",
    "assignee_name": "张三",
    "current_date": "2024-01-01"
  }
}
```

##### 响应
```json
{
  "content": "# 用户登录功能 - 需求分析\n\n## 需求概述\n实现用户登录和认证功能...",
  "template_id": 1,
  "variables": {...}
}
```

#### 3.4 创建自定义模板
```http
POST /templates
```

##### 请求体
```json
{
  "name": "自定义任务模板",
  "description": "我的自定义模板",
  "type": "custom",
  "category": "开发任务",
  "content": "# {{title}}\n\n## 描述\n{{description}}",
  "variables": [
    {
      "name": "title",
      "type": "string",
      "required": true,
      "description": "标题"
    }
  ]
}
```

#### 3.5 获取模板统计
```http
GET /templates/stats
```

##### 响应
```json
{
  "total_templates": 15,
  "categories": {
    "需求分析": 5,
    "技术设计": 4,
    "开发任务": 6
  },
  "types": {
    "task": 10,
    "project": 3,
    "custom": 2
  },
  "most_used": [...],
  "recent": [...]
}
```

### 4. 文档协作功能

#### 4.1 添加评论
```http
POST /projects/{projectId}/documents/{docId}/comments
```

##### 请求体
```json
{
  "content": "这里需要补充更多细节",
  "comment_type": "suggestion",
  "position_info": "{\"line\": 10, \"column\": 5}",
  "parent_comment_id": null
}
```

##### 响应
```json
{
  "id": 1,
  "document_id": 123,
  "user_id": 100,
  "content": "这里需要补充更多细节",
  "comment_type": "suggestion",
  "position_info": "{\"line\": 10, \"column\": 5}",
  "is_resolved": false,
  "created_at": "2024-01-01T12:00:00Z",
  "user_name": "张三"
}
```

#### 4.2 获取评论列表
```http
GET /projects/{projectId}/documents/{docId}/comments
```

##### 查询参数
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20

##### 响应
```json
{
  "comments": [...],
  "total": 25,
  "page": 1,
  "limit": 20,
  "has_next_page": true,
  "has_prev_page": false
}
```

#### 4.3 更新评论
```http
PUT /comments/{commentId}
```

##### 请求体
```json
{
  "content": "更新后的评论内容"
}
```

#### 4.4 删除评论
```http
DELETE /comments/{commentId}
```

#### 4.5 标记评论为已解决
```http
PATCH /comments/{commentId}/resolve
```

#### 4.6 添加协作者
```http
POST /projects/{projectId}/documents/{docId}/collaborators
```

##### 请求体
```json
{
  "user_id": 200,
  "permission_level": "edit",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

#### 4.7 获取协作者列表
```http
GET /projects/{projectId}/documents/{docId}/collaborators
```

##### 响应
```json
{
  "collaborators": [
    {
      "id": 1,
      "document_id": 123,
      "user_id": 200,
      "permission_level": "edit",
      "granted_by": 100,
      "granted_at": "2024-01-01T12:00:00Z",
      "expires_at": "2024-12-31T23:59:59Z",
      "user_name": "李四",
      "granted_by_name": "张三"
    }
  ],
  "total": 1
}
```

#### 4.8 更新协作者权限
```http
PUT /projects/{projectId}/documents/{docId}/collaborators/{userId}
```

##### 请求体
```json
{
  "permission_level": "admin",
  "expires_at": "2025-12-31T23:59:59Z"
}
```

#### 4.9 移除协作者
```http
DELETE /projects/{projectId}/documents/{docId}/collaborators/{userId}
```

#### 4.10 获取文档变更历史
```http
GET /projects/{projectId}/documents/{docId}/history
```

##### 查询参数
- `page` (可选): 页码
- `limit` (可选): 每页数量

##### 响应
```json
{
  "changes": [
    {
      "id": 1,
      "document_id": 123,
      "user_id": 100,
      "change_type": "content_updated",
      "field_name": "content",
      "old_value": "旧内容...",
      "new_value": "新内容...",
      "change_summary": "更新了文档内容",
      "created_at": "2024-01-01T12:00:00Z",
      "user_name": "张三"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50,
  "has_next_page": false,
  "has_prev_page": false
}
```

#### 4.11 开始协作会话
```http
POST /projects/{projectId}/documents/{docId}/collaboration/start
```

##### 响应
```json
{
  "document_id": 123,
  "user_id": 100,
  "started_at": "2024-01-01T12:00:00Z",
  "is_active": true
}
```

#### 4.12 获取活跃协作者
```http
GET /projects/{projectId}/documents/{docId}/collaboration/active
```

##### 响应
```json
{
  "active_collaborators": [
    {
      "user_id": 100,
      "username": "张三",
      "permission_level": "edit",
      "last_active_at": "2024-01-01T12:00:00Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T12:05:00Z"
}
```

#### 4.13 获取协作统计
```http
GET /projects/{projectId}/documents/{docId}/collaboration/stats
```

##### 响应
```json
{
  "document_id": 123,
  "collaborator_count": 5,
  "comment_count": 12,
  "unresolved_comments": 3,
  "change_count": 25
}
```

#### 4.14 获取用户协作仪表板
```http
GET /collaboration/dashboard
```

##### 响应
```json
{
  "user_id": 100,
  "collaborated_documents": 15,
  "comments_made": 45,
  "comments_resolved": 12,
  "documents_edited": 8
}
```

### 5. 任务文档管理 (全局)

#### 5.1 获取任务文档列表
```http
GET /task-documents
```

##### 查询参数
- `project_id` (可选): 项目ID
- `status` (可选): 文档状态
- `page` (可选): 页码
- `limit` (可选): 每页数量

##### 响应
```json
{
  "documents": [
    {
      "task_id": 123,
      "project_id": 456,
      "task_title": "用户登录功能",
      "project_name": "电商平台",
      "task_status": "in_progress",
      "document_id": 789,
      "document_exists": true,
      "last_modified": "2024-01-01T12:00:00Z",
      "content_size": 2048,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### 5.2 获取任务文档统计
```http
GET /task-documents/stats
```

##### 响应
```json
{
  "total_tasks": 100,
  "with_document": 65,
  "without_document": 35,
  "recently_updated": 12
}
```

### 6. 系统管理 (迁移相关)

#### 6.1 获取迁移状态
```http
GET /system/task-documents/migration/status
```

##### 响应
```json
{
  "migration_status": "completed",
  "total_files": 150,
  "migrated_files": 150,
  "failed_files": 0,
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T10:30:00Z",
  "details": {
    "batch_size": 50,
    "current_batch": 3,
    "total_batches": 3
  }
}
```

#### 6.2 切换到统一系统
```http
POST /system/task-documents/migration/switch
```

##### 请求体
```json
{
  "enable_unified_system": true,
  "migrate_existing_files": true,
  "backup_before_migration": true
}
```

##### 响应
```json
{
  "success": true,
  "message": "系统切换成功",
  "migration_job_id": "mig_123456",
  "estimated_completion": "2024-01-01T11:00:00Z"
}
```

## 错误处理

所有API都遵循统一的错误响应格式：

```json
{
  "error": "错误简要描述",
  "message": "详细错误信息",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/api/v1/projects/123/tasks/456/document"
}
```

### 常见HTTP状态码

- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未认证
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `409 Conflict` - 资源冲突
- `422 Unprocessable Entity` - 请求数据验证失败
- `500 Internal Server Error` - 服务器内部错误

## 权限级别

文档协作系统支持以下权限级别：

- `read` - 只读权限，可以查看文档和评论
- `comment` - 评论权限，可以添加评论和查看
- `edit` - 编辑权限，可以修改文档内容
- `admin` - 管理权限，可以管理协作者和所有操作

## 限制和配额

- 单个文档大小：最大 10MB
- 评论长度：最大 2000 字符
- 协作者数量：每个文档最多 100 个协作者
- API请求频率：每分钟最多 1000 次请求
- 模板变量数量：每个模板最多 50 个变量

## SDK 示例

### JavaScript/TypeScript

参考提供的前端服务文件：
- `smartTemplateService.ts`
- `collaborationService.ts`
- `taskDocumentService.ts`

### 使用示例

```typescript
import { taskDocumentService } from './services/taskDocumentService';
import { smartTemplateService } from './services/smartTemplateService';
import { collaborationService } from './services/collaborationService';

// 获取任务文档
const document = await taskDocumentService.getAdvanced(projectId, taskId);

// 获取模板推荐
const recommendations = await smartTemplateService.getRecommendations(projectId, taskId);

// 添加评论
const comment = await collaborationService.addComment(projectId, taskId, {
  content: "很好的文档！",
  comment_type: "approval"
});
```

## 版本历史

- `v1.0.0` - 基础任务文档API
- `v1.1.0` - 增加智能模板系统
- `v1.2.0` - 增加文档协作功能
- `v1.3.0` - 增加实时协作和统计功能

## 支持

如有问题或建议，请联系开发团队或提交Issue。