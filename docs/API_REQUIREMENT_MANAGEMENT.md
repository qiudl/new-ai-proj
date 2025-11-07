# 需求管理系统 API 参考文档

完整的需求管理系统 REST API 文档，包括所有端点、请求/响应格式、权限要求和使用示例。

---

## 📋 目录

- [认证](#认证)
- [需求CRUD操作](#需求crud操作)
- [需求状态管理](#需求状态管理)
- [评论功能](#评论功能)
- [任务关联](#任务关联)
- [统计和报告](#统计和报告)
- [错误处理](#错误处理)

---

## 🔐 认证

所有API请求需要在HTTP头中包含JWT token:

```http
Authorization: Bearer <your_jwt_token>
```

### 获取Token

```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

---

## 📝 需求CRUD操作

### 1. 获取需求列表

**端点**: `GET /api/v1/requirements`

**权限**: 已认证用户

**查询参数**:
| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|-------|
| page | integer | 否 | 页码 | 1 |
| page_size | integer | 否 | 每页数量 (1-100) | 20 |
| search | string | 否 | 搜索关键词 (标题/描述) | - |
| status | string | 否 | 状态过滤 | - |
| priority | string | 否 | 优先级过滤 | - |
| category | string | 否 | 分类过滤 | - |
| submitter_id | integer | 否 | 提交者ID | - |
| reviewer_id | integer | 否 | 评审者ID | - |
| project_id | integer | 否 | 项目ID | - |
| sort_by | string | 否 | 排序字段 | created_at |
| sort_order | string | 否 | 排序方向 (asc/desc) | desc |

**状态值**:
- `draft` - 草稿
- `pending_review` - 待评审
- `approved` - 已批准
- `rejected` - 已拒绝
- `in_development` - 开发中
- `implemented` - 已实现
- `archived` - 已归档

**优先级值**:
- `low` - 低
- `medium` - 中
- `high` - 高
- `urgent` - 紧急

**示例请求**:
```bash
curl -X GET "https://api.example.com/api/v1/requirements?page=1&page_size=20&status=pending_review&priority=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "用户登录功能",
      "description": "实现用户名密码登录",
      "status": "pending_review",
      "priority": "high",
      "category": "feature",
      "submitter_id": 10,
      "submitter_name": "张三",
      "project_id": 5,
      "project_name": "电商平台",
      "business_value": "提升用户体验",
      "expected_outcome": "用户可以安全登录",
      "acceptance_criteria": "1. 正确凭据可登录\n2. 错误凭据显示提示",
      "due_date": "2025-12-31T00:00:00Z",
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-06T08:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 20
}
```

---

### 2. 获取需求详情

**端点**: `GET /api/v1/requirements/:id`

**权限**: 已认证用户

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 需求ID |

**示例请求**:
```bash
curl -X GET https://api.example.com/api/v1/requirements/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "用户登录功能",
    "description": "实现用户名密码登录...",
    "status": "pending_review",
    "priority": "high",
    "category": "feature",
    "submitter_id": 10,
    "submitter": {
      "id": 10,
      "username": "zhangsan",
      "display_name": "张三"
    },
    "reviewer_id": 5,
    "reviewer": {
      "id": 5,
      "username": "lisi",
      "display_name": "李四"
    },
    "project_id": 5,
    "project": {
      "id": 5,
      "name": "电商平台",
      "code": "ECOM"
    },
    "business_value": "提升用户体验",
    "expected_outcome": "用户可以安全登录",
    "acceptance_criteria": "1. 正确凭据可登录\n2. 错误凭据显示提示",
    "attachments": [
      {
        "id": 1,
        "filename": "login-mockup.png",
        "url": "/uploads/login-mockup.png",
        "size": 102400
      }
    ],
    "linked_tasks": [
      {
        "task_id": 456,
        "task_title": "实现登录API",
        "link_type": "converted",
        "linked_at": "2025-11-05T14:00:00Z"
      }
    ],
    "comment_count": 5,
    "due_date": "2025-12-31T00:00:00Z",
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-06T08:30:00Z"
  }
}
```

---

### 3. 创建需求

**端点**: `POST /api/v1/requirements`

**权限**: 已认证用户

**请求体**:
```json
{
  "title": "用户登录功能",
  "description": "实现用户名密码登录功能，支持记住我、找回密码等",
  "priority": "high",
  "category": "feature",
  "project_id": 5,
  "business_value": "提升用户体验，降低流失率",
  "expected_outcome": "用户可以安全便捷地登录系统",
  "acceptance_criteria": "1. 用户输入正确凭据可成功登录\n2. 错误凭据显示友好的错误提示\n3. 支持找回密码功能\n4. 支持记住登录状态",
  "due_date": "2025-12-31"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 需求标题 (1-200字符) |
| description | string | 是 | 需求详细描述 |
| priority | string | 否 | 优先级 (默认: medium) |
| category | string | 否 | 分类 (feature/bug/improvement) |
| project_id | integer | 是 | 所属项目ID |
| business_value | string | 否 | 商业价值说明 |
| expected_outcome | string | 否 | 预期成果 |
| acceptance_criteria | string | 否 | 验收标准 |
| due_date | string | 否 | 截止日期 (YYYY-MM-DD) |

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "用户登录功能",
    "description": "实现用户名密码登录",
    "priority": "high",
    "project_id": 5,
    "category": "feature"
  }'
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 124,
    "title": "用户登录功能",
    "status": "draft",
    "created_at": "2025-11-06T09:00:00Z"
  },
  "message": "需求创建成功"
}
```

---

### 4. 更新需求

**端点**: `PUT /api/v1/requirements/:id`

**权限**: 需求提交者或管理员

**请求体**: (所有字段可选)
```json
{
  "title": "更新后的标题",
  "description": "更新后的描述",
  "priority": "urgent",
  "business_value": "更新的商业价值",
  "expected_outcome": "更新的预期成果",
  "acceptance_criteria": "更新的验收标准",
  "due_date": "2025-12-15"
}
```

**示例请求**:
```bash
curl -X PUT https://api.example.com/api/v1/requirements/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "用户登录和注册功能",
    "priority": "urgent"
  }'
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "用户登录和注册功能",
    "priority": "urgent",
    "updated_at": "2025-11-06T09:15:00Z"
  },
  "message": "需求更新成功"
}
```

---

### 5. 删除需求

**端点**: `DELETE /api/v1/requirements/:id`

**权限**: 需求提交者或管理员

**示例请求**:
```bash
curl -X DELETE https://api.example.com/api/v1/requirements/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "message": "需求已删除"
}
```

---

## 🔄 需求状态管理

### 1. 提交需求评审

**端点**: `POST /api/v1/requirements/:id/submit`

**权限**: 需求提交者

**说明**: 将草稿状态的需求提交审核 (draft → pending_review)

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/123/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "pending_review",
    "submitted_at": "2025-11-06T09:20:00Z"
  },
  "message": "需求已提交评审"
}
```

---

### 2. 批准需求

**端点**: `POST /api/v1/requirements/:id/approve`

**权限**: 评审者或管理员

**请求体**:
```json
{
  "comment": "需求清晰，可以开始开发"
}
```

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/123/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "需求清晰，可以开始开发"
  }'
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "approved",
    "approved_by": 5,
    "approved_at": "2025-11-06T09:25:00Z"
  },
  "message": "需求已批准"
}
```

---

### 3. 拒绝需求

**端点**: `POST /api/v1/requirements/:id/reject`

**权限**: 评审者或管理员

**请求体**:
```json
{
  "reason": "需求描述不够清晰，请补充详细信息"
}
```

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/123/reject \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "需求描述不够清晰"
  }'
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "rejected",
    "rejected_by": 5,
    "rejected_at": "2025-11-06T09:30:00Z",
    "rejection_reason": "需求描述不够清晰"
  },
  "message": "需求已拒绝"
}
```

---

### 4. 撤回需求

**端点**: `POST /api/v1/requirements/:id/withdraw`

**权限**: 需求提交者

**说明**: 撤回待评审的需求，恢复为草稿状态

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/123/withdraw \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "draft"
  },
  "message": "需求已撤回"
}
```

---

### 5. 归档需求

**端点**: `POST /api/v1/requirements/:id/archive`

**权限**: 管理员

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/123/archive \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "archived",
    "archived_at": "2025-11-06T09:35:00Z"
  },
  "message": "需求已归档"
}
```

---

### 6. 获取需求权限

**端点**: `GET /api/v1/requirements/:id/permissions`

**权限**: 已认证用户

**说明**: 获取当前用户对该需求的操作权限

**示例请求**:
```bash
curl -X GET https://api.example.com/api/v1/requirements/123/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "can_view": true,
    "can_edit": true,
    "can_delete": false,
    "can_approve": true,
    "can_reject": true,
    "can_submit": true,
    "can_withdraw": false,
    "can_archive": false,
    "available_transitions": [
      "pending_review",
      "approved",
      "rejected"
    ]
  }
}
```

---

## 💬 评论功能

### 1. 创建评论

**端点**: `POST /api/v1/requirements/comments`

**权限**: 已认证用户

**请求体**:
```json
{
  "requirement_id": 123,
  "content": "这个需求很有价值 @zhangsan",
  "comment_type": "general",
  "mentioned_user_ids": [10],
  "parent_comment_id": null,
  "is_internal": false
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| requirement_id | integer | 是 | 需求ID |
| content | string | 是 | 评论内容 |
| comment_type | string | 否 | 评论类型 (默认: general) |
| mentioned_user_ids | array | 否 | @提及的用户ID列表 |
| parent_comment_id | integer | 否 | 父评论ID (回复时使用) |
| is_internal | boolean | 否 | 是否内部评论 (默认: false) |

**评论类型**:
- `general` - 一般评论
- `question` - 提问
- `suggestion` - 建议
- `approval` - 批准意见
- `rejection` - 拒绝意见

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirement_id": 123,
    "content": "这个需求很重要，建议优先处理",
    "comment_type": "suggestion"
  }'
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 456,
    "requirement_id": 123,
    "content": "这个需求很重要，建议优先处理",
    "comment_type": "suggestion",
    "author_id": 10,
    "author_name": "张三",
    "mentioned_users": [],
    "is_pinned": false,
    "created_at": "2025-11-06T09:40:00Z"
  },
  "message": "评论创建成功"
}
```

---

### 2. 获取评论列表

**端点**: `GET /api/v1/requirements/comments`

**权限**: 已认证用户

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| requirement_id | integer | 是 | 需求ID |
| page | integer | 否 | 页码 (默认: 1) |
| page_size | integer | 否 | 每页数量 (默认: 20) |
| sort_by | string | 否 | 排序字段 (默认: created_at) |
| sort_order | string | 否 | 排序方向 (默认: desc) |
| is_pinned | boolean | 否 | 过滤置顶评论 |
| comment_type | string | 否 | 评论类型过滤 |

**示例请求**:
```bash
curl -X GET "https://api.example.com/api/v1/requirements/comments?requirement_id=123&page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "requirement_id": 123,
      "content": "这个需求很重要",
      "comment_type": "suggestion",
      "author": {
        "id": 10,
        "username": "zhangsan",
        "display_name": "张三",
        "avatar_url": "/avatars/zhangsan.png"
      },
      "mentioned_users": [],
      "replies": [
        {
          "id": 457,
          "content": "我同意",
          "author_name": "李四",
          "created_at": "2025-11-06T09:45:00Z"
        }
      ],
      "reply_count": 1,
      "is_pinned": false,
      "created_at": "2025-11-06T09:40:00Z",
      "updated_at": "2025-11-06T09:40:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20
}
```

---

### 3. 获取@我的评论

**端点**: `GET /api/v1/requirements/comments/mentions/me`

**权限**: 已认证用户

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码 (默认: 1) |
| page_size | integer | 每页数量 (默认: 10) |
| is_read | boolean | 是否已读 |

**示例请求**:
```bash
curl -X GET "https://api.example.com/api/v1/requirements/comments/mentions/me?page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 458,
      "requirement_id": 124,
      "requirement_title": "支付功能优化",
      "content": "@lisi 请帮忙审核一下这个需求",
      "author_name": "张三",
      "is_read": false,
      "created_at": "2025-11-06T09:50:00Z"
    }
  ],
  "total": 3,
  "unread_count": 2
}
```

---

### 4. 更新评论

**端点**: `PUT /api/v1/requirements/comments/:id`

**权限**: 评论作者

**请求体**:
```json
{
  "content": "更新后的评论内容",
  "comment_type": "question"
}
```

**示例请求**:
```bash
curl -X PUT https://api.example.com/api/v1/requirements/comments/456 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "更新后的评论内容"
  }'
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 456,
    "content": "更新后的评论内容",
    "updated_at": "2025-11-06T09:55:00Z"
  },
  "message": "评论更新成功"
}
```

---

### 5. 删除评论

**端点**: `DELETE /api/v1/requirements/comments/:id`

**权限**: 评论作者或管理员

**示例请求**:
```bash
curl -X DELETE https://api.example.com/api/v1/requirements/comments/456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "message": "评论已删除"
}
```

---

### 6. 置顶/取消置顶评论

**端点**: `PUT /api/v1/requirements/comments/:id/pin`

**权限**: 管理员或需求提交者

**示例请求**:
```bash
curl -X PUT https://api.example.com/api/v1/requirements/comments/456/pin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 456,
    "is_pinned": true
  },
  "message": "评论已置顶"
}
```

---

## 🔗 任务关联

### 1. 将需求转换为任务

**端点**: `POST /api/v1/requirements/:id/convert-to-task`

**权限**: 项目经理或管理员

**请求体**:
```json
{
  "project_id": 5,
  "task_title": "实现用户登录功能",
  "task_description": "根据需求123实现登录功能",
  "priority": "high",
  "assignee_id": 15,
  "due_date": "2025-12-15",
  "create_subtasks": true,
  "link_requirement": true
}
```

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/123/convert-to-task \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 5,
    "task_title": "实现用户登录功能",
    "priority": "high"
  }'
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "requirement_id": 123,
    "task_id": 789,
    "task_title": "实现用户登录功能",
    "link_type": "converted",
    "subtasks": [
      {
        "id": 790,
        "title": "实现登录API"
      },
      {
        "id": 791,
        "title": "实现前端登录页面"
      }
    ]
  },
  "message": "需求已转换为任务"
}
```

---

### 2. 关联现有任务

**端点**: `POST /api/v1/requirements/:id/tasks`

**权限**: 已认证用户

**请求体**:
```json
{
  "task_id": 456,
  "link_type": "manual",
  "notes": "这个任务与需求相关"
}
```

**链接类型**:
- `converted` - 从需求转换而来
- `manual` - 手动关联
- `related` - 相关任务

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/123/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 456,
    "link_type": "related"
  }'
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 100,
    "requirement_id": 123,
    "task_id": 456,
    "link_type": "related",
    "linked_by": 10,
    "created_at": "2025-11-06T10:00:00Z"
  },
  "message": "任务关联成功"
}
```

---

### 3. 取消任务关联

**端点**: `DELETE /api/v1/requirements/:id/tasks/:task_id`

**权限**: 关联创建者或管理员

**示例请求**:
```bash
curl -X DELETE https://api.example.com/api/v1/requirements/123/tasks/456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "message": "任务关联已取消"
}
```

---

### 4. 获取需求关联的任务

**端点**: `GET /api/v1/requirements/:id/tasks`

**权限**: 已认证用户

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码 (默认: 1) |
| page_size | integer | 每页数量 (默认: 10) |
| link_type | string | 链接类型过滤 |

**示例请求**:
```bash
curl -X GET "https://api.example.com/api/v1/requirements/123/tasks?page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "link_id": 100,
      "task_id": 456,
      "task_title": "实现登录API",
      "task_status": "in_progress",
      "link_type": "converted",
      "linked_at": "2025-11-05T14:00:00Z"
    }
  ],
  "total": 2
}
```

---

## 📊 统计和报告

### 1. 获取需求统计

**端点**: `GET /api/v1/requirements/stats`

**权限**: 已认证用户

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| project_id | integer | 项目ID过滤 |
| enterprise_id | integer | 企业ID过滤 |
| start_date | string | 起始日期 (YYYY-MM-DD) |
| end_date | string | 结束日期 (YYYY-MM-DD) |

**示例请求**:
```bash
curl -X GET "https://api.example.com/api/v1/requirements/stats?project_id=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_requirements": 150,
    "by_status": {
      "draft": 20,
      "pending_review": 15,
      "approved": 80,
      "rejected": 10,
      "in_development": 15,
      "implemented": 10
    },
    "by_priority": {
      "low": 30,
      "medium": 70,
      "high": 40,
      "urgent": 10
    },
    "by_category": {
      "feature": 100,
      "bug": 30,
      "improvement": 20
    },
    "pending_review": 15,
    "approval_rate": 88.9,
    "conversion_rate": 53.3,
    "average_review_time_hours": 24.5,
    "trend_last_7_days": [
      {"date": "2025-11-01", "count": 5},
      {"date": "2025-11-02", "count": 3},
      {"date": "2025-11-03", "count": 7}
    ]
  }
}
```

---

### 2. 批量删除需求

**端点**: `POST /api/v1/requirements/batch-delete`

**权限**: 管理员

**请求体**:
```json
{
  "requirement_ids": [123, 124, 125]
}
```

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/batch-delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirement_ids": [123, 124, 125]
  }'
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "deleted_count": 3,
    "failed_ids": []
  },
  "message": "批量删除完成"
}
```

---

### 3. 批量更新状态

**端点**: `POST /api/v1/requirements/batch-update-status`

**权限**: 管理员

**请求体**:
```json
{
  "requirement_ids": [123, 124],
  "status": "approved"
}
```

**示例请求**:
```bash
curl -X POST https://api.example.com/api/v1/requirements/batch-update-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirement_ids": [123, 124],
    "status": "approved"
  }'
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "updated_count": 2,
    "failed_ids": []
  },
  "message": "批量更新完成"
}
```

---

## ⚠️ 错误处理

### 标准错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "REQUIREMENT_NOT_FOUND",
    "message": "需求不存在",
    "details": "Requirement with ID 999 not found"
  }
}
```

### HTTP状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|---------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或token无效 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 422 | Unprocessable Entity | 数据验证失败 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |

### 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `INVALID_TOKEN` | 401 | Token无效或过期 |
| `PERMISSION_DENIED` | 403 | 无权限执行操作 |
| `REQUIREMENT_NOT_FOUND` | 404 | 需求不存在 |
| `INVALID_STATUS_TRANSITION` | 400 | 无效的状态转换 |
| `VALIDATION_ERROR` | 422 | 数据验证失败 |
| `DUPLICATE_TASK_LINK` | 400 | 任务已关联 |
| `COMMENT_NOT_FOUND` | 404 | 评论不存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |

### 错误处理示例

```bash
# 处理错误响应
response=$(curl -s -w "\n%{http_code}" -X GET https://api.example.com/api/v1/requirements/999 \
  -H "Authorization: Bearer YOUR_TOKEN")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
  echo "Error: $body"
  exit 1
fi

echo "Success: $body"
```

---

## 📌 最佳实践

### 1. 分页查询

总是使用分页避免一次性加载过多数据:

```bash
# 推荐
curl "https://api.example.com/api/v1/requirements?page=1&page_size=20"

# 不推荐 (不使用分页)
curl "https://api.example.com/api/v1/requirements"
```

### 2. 错误处理

始终检查响应状态和错误:

```javascript
try {
  const response = await fetch('/api/v1/requirements', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data;
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

### 3. 批量操作

使用批量接口而不是循环调用单个接口:

```javascript
// 推荐
await api.batchUpdateStatus([1, 2, 3], 'approved');

// 不推荐
for (const id of [1, 2, 3]) {
  await api.updateRequirement(id, { status: 'approved' });
}
```

### 4. 缓存权限查询

权限查询结果默认缓存5分钟，避免频繁查询:

```javascript
// 框架已实现缓存，无需手动处理
const permissions = await api.getRequirementPermissions(123);
```

---

## 🔧 开发工具

### Postman Collection

可以导入以下 Postman Collection 快速测试 API:

```bash
# 下载 Collection
curl -o requirement-api.postman_collection.json \
  https://api.example.com/docs/postman/requirement-api.json
```

### cURL 脚本示例

完整的需求生命周期测试脚本:

```bash
#!/bin/bash

TOKEN="YOUR_JWT_TOKEN"
API_BASE="https://api.example.com/api/v1"

# 1. 创建需求
REQUIREMENT_ID=$(curl -s -X POST "$API_BASE/requirements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试需求",
    "description": "这是一个测试需求",
    "priority": "high",
    "project_id": 5
  }' | jq -r '.data.id')

echo "Created requirement: $REQUIREMENT_ID"

# 2. 提交评审
curl -s -X POST "$API_BASE/requirements/$REQUIREMENT_ID/submit" \
  -H "Authorization: Bearer $TOKEN"

# 3. 批准需求
curl -s -X POST "$API_BASE/requirements/$REQUIREMENT_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "批准通过"}'

# 4. 转换为任务
TASK_ID=$(curl -s -X POST "$API_BASE/requirements/$REQUIREMENT_ID/convert-to-task" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 5,
    "task_title": "实现测试需求"
  }' | jq -r '.data.task_id')

echo "Converted to task: $TASK_ID"
```

---

**文档版本**: 1.0.0
**最后更新**: 2025-11-06
**维护者**: AI Project Team
**反馈**: api-feedback@example.com
