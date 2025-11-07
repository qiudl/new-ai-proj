# Requirement Service API 使用指南

完整的需求管理 API 服务层封装，包括 CRUD、评论、状态管理和任务关联功能。

## 📦 导入方式

```typescript
// 方式1: 导入所有需求服务
import { requirementServices } from '../services/requirementService';

// 方式2: 导入特定服务
import {
  requirementApi,           // 基础 CRUD
  requirementCommentApi,    // 评论管理
  requirementStatusApi,     // 状态管理
  linkTaskToRequirement,    // 任务关联
} from '../services/requirementService';

// 方式3: 导入类型
import type {
  Requirement,
  RequirementComment,
  RequirementPermissions
} from '../types';
```

## 🔧 基础 CRUD 操作

### 获取需求列表

```typescript
import { requirementApi } from '../services/requirementService';

// 获取所有需求
const response = await requirementApi.getRequirements({
  page: 1,
  page_size: 20,
  status: ['pending_review', 'approved'],
  priority: ['high', 'urgent'],
  search: '登录功能',
  project_id: 123,
  sort_by: 'created_at',
  sort_order: 'desc',
});

console.log(response.data);  // 需求列表
console.log(response.total); // 总数
```

### 获取单个需求详情

```typescript
const requirement = await requirementApi.getRequirement(123);
console.log(requirement.title);
console.log(requirement.status);
```

### 创建需求

```typescript
const newRequirement = await requirementApi.createRequirement({
  title: '添加用户登录功能',
  description: '实现用户名密码登录',
  priority: 'high',
  project_id: 123,
  category: 'feature',
  business_value: '提升用户体验',
  expected_outcome: '用户可以安全登录系统',
  acceptance_criteria: '1. 用户输入正确凭据可登录\n2. 错误凭据提示错误信息',
  due_date: '2025-12-31',
});
```

### 更新需求

```typescript
const updatedRequirement = await requirementApi.updateRequirement(123, {
  title: '更新后的标题',
  description: '更新后的描述',
  priority: 'urgent',
});
```

### 删除需求

```typescript
await requirementApi.deleteRequirement(123);
```

## 📊 统计和批量操作

### 获取需求统计

```typescript
const stats = await requirementApi.getStats({
  project_id: 123,
  enterprise_id: 456,
});

console.log(stats.total_requirements);       // 总需求数
console.log(stats.by_status);                // 按状态分组
console.log(stats.pending_review);           // 待评审数量
console.log(stats.conversion_rate);          // 转换率
console.log(stats.average_review_time_hours); // 平均评审时间
```

### 批量删除需求

```typescript
await requirementApi.batchDeleteRequirements([123, 456, 789]);
```

### 批量更新状态

```typescript
await requirementApi.batchUpdateStatus([123, 456], 'approved');
```

## 🔄 需求状态管理

### 提交需求（草稿 → 待评审）

```typescript
import { requirementStatusApi } from '../services/requirementService';

const requirement = await requirementStatusApi.submitRequirement(123);
console.log(requirement.status); // 'pending_review'
```

### 批准需求

```typescript
const requirement = await requirementStatusApi.approveRequirement(
  123,
  '需求清晰，可以开始开发'
);
console.log(requirement.status); // 'approved'
```

### 拒绝需求

```typescript
const requirement = await requirementStatusApi.rejectRequirement(
  123,
  '需求描述不够清晰，请补充'
);
console.log(requirement.status); // 'rejected'
```

### 撤回需求

```typescript
const requirement = await requirementStatusApi.withdrawRequirement(123);
console.log(requirement.status); // 'draft'
```

### 归档需求

```typescript
const requirement = await requirementStatusApi.archiveRequirement(123);
console.log(requirement.status); // 'archived'
```

### 获取需求权限

```typescript
const permissions = await requirementStatusApi.getRequirementPermissions(123);

console.log(permissions.can_view);            // 可以查看
console.log(permissions.can_edit);            // 可以编辑
console.log(permissions.can_approve);         // 可以批准
console.log(permissions.available_transitions); // 可用的状态转换
```

## 💬 评论管理

### 创建评论

```typescript
import { requirementCommentApi } from '../services/requirementService';

const comment = await requirementCommentApi.createComment({
  requirement_id: 123,
  content: '这个需求很有价值 @张三',
  comment_type: 'general',
  mentioned_user_ids: [456], // @张三的用户ID
  is_internal: false,
});
```

### 创建回复评论

```typescript
const reply = await requirementCommentApi.createComment({
  requirement_id: 123,
  parent_comment_id: 789, // 父评论ID
  content: '我同意你的观点',
  comment_type: 'general',
});
```

### 获取评论列表

```typescript
const response = await requirementCommentApi.getComments({
  requirement_id: 123,
  page: 1,
  page_size: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
  is_pinned: false,      // 过滤置顶评论
  comment_type: ['general', 'question'],
});

console.log(response.data);  // 评论列表
console.log(response.total); // 总评论数
```

### 获取@我的评论

```typescript
const mentionedComments = await requirementCommentApi.getMentionedComments({
  page: 1,
  page_size: 10,
});

console.log(mentionedComments.data); // 提到我的评论
```

### 更新评论

```typescript
const updatedComment = await requirementCommentApi.updateComment(789, {
  content: '更新后的评论内容',
  comment_type: 'suggestion',
});
```

### 删除评论

```typescript
await requirementCommentApi.deleteComment(789);
```

### 置顶/取消置顶评论

```typescript
const comment = await requirementCommentApi.togglePin(789);
console.log(comment.is_pinned); // true or false
```

## 🔗 需求-任务关联

### 关联任务到需求

```typescript
import { linkTaskToRequirement, RequirementTaskLinkType } from '../services/requirementService';

const link = await linkTaskToRequirement(
  123,                              // 需求ID
  456,                              // 任务ID
  RequirementTaskLinkType.Manual,   // 关联类型
  '这个任务与需求相关'              // 关联备注（可选）
);

console.log(link.id);              // 关联ID
console.log(link.link_type);       // 'manual'
```

### 取消关联

```typescript
import { unlinkTaskFromRequirement } from '../services/requirementService';

await unlinkTaskFromRequirement(123, 456);
```

### 获取需求关联的任务列表

```typescript
import { getRequirementTasks } from '../services/requirementService';

const response = await getRequirementTasks(123, {
  page: 1,
  page_size: 10,
  link_type: RequirementTaskLinkType.Converted, // 过滤转换的任务
});

console.log(response.data);  // 关联的任务列表
console.log(response.total); // 总数
```

### 获取任务关联的需求列表

```typescript
import { getTaskRequirements } from '../services/requirementService';

const response = await getTaskRequirements(456, {
  page: 1,
  page_size: 10,
});

console.log(response.data);  // 关联的需求列表
```

## 🎯 完整示例：需求生命周期

```typescript
import {
  requirementApi,
  requirementStatusApi,
  requirementCommentApi,
  linkTaskToRequirement,
  RequirementTaskLinkType
} from '../services/requirementService';

async function requirementLifecycle() {
  // 1. 创建需求（草稿状态）
  const requirement = await requirementApi.createRequirement({
    title: '添加用户登录功能',
    description: '实现用户名密码登录',
    priority: 'high',
    project_id: 123,
  });
  console.log('创建需求:', requirement.id, requirement.status); // 'draft'

  // 2. 提交审核
  const submitted = await requirementStatusApi.submitRequirement(requirement.id);
  console.log('提交审核:', submitted.status); // 'pending_review'

  // 3. 添加评审意见
  await requirementCommentApi.createComment({
    requirement_id: requirement.id,
    content: '需求描述清晰，可以通过',
    comment_type: 'approval',
  });

  // 4. 批准需求
  const approved = await requirementStatusApi.approveRequirement(
    requirement.id,
    '批准，可以开始开发'
  );
  console.log('批准需求:', approved.status); // 'approved'

  // 5. 转换为任务
  const convertResult = await requirementApi.convertToTask(requirement.id, {
    project_id: 123,
    task_title: requirement.title,
    priority: 'high',
    create_subtasks: true,
    link_requirement: true,
  });
  console.log('转换任务:', convertResult.task_id);

  // 6. 获取关联的任务
  const tasks = await getRequirementTasks(requirement.id);
  console.log('关联任务:', tasks.data.length);

  // 7. 获取需求统计
  const stats = await requirementApi.getStats({ project_id: 123 });
  console.log('项目统计:', stats);
}
```

## 🔒 权限检查示例

```typescript
import { requirementStatusApi } from '../services/requirementService';

async function checkAndApprove(requirementId: number) {
  // 1. 获取权限
  const permissions = await requirementStatusApi.getRequirementPermissions(requirementId);

  // 2. 检查权限
  if (!permissions.can_approve) {
    console.error('您没有批准权限');
    return;
  }

  // 3. 检查可用的状态转换
  if (!permissions.available_transitions.includes('approved')) {
    console.error('当前状态不能转换为批准');
    return;
  }

  // 4. 执行批准操作
  const requirement = await requirementStatusApi.approveRequirement(
    requirementId,
    '批准通过'
  );
  console.log('批准成功:', requirement.status);
}
```

## 🚀 统一服务接口

```typescript
import { requirementServices } from '../services/requirementService';

// 使用统一接口访问所有功能
async function useUnifiedServices() {
  // CRUD
  const requirements = await requirementServices.getRequirements({ page: 1 });

  // 评论
  const comments = await requirementServices.comment.getComments({
    requirement_id: 123
  });

  // 状态管理
  const permissions = await requirementServices.status.getRequirementPermissions(123);

  // 任务关联
  const tasks = await requirementServices.getRequirementTasks(123);
}
```

## 🎨 React Hook 使用示例

```typescript
import { useState, useEffect } from 'react';
import { requirementApi, requirementCommentApi } from '../services/requirementService';

function RequirementDetailPage({ requirementId }: { requirementId: number }) {
  const [requirement, setRequirement] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [requirementId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 并行加载需求和评论
      const [req, commentRes] = await Promise.all([
        requirementApi.getRequirement(requirementId),
        requirementCommentApi.getComments({
          requirement_id: requirementId
        }),
      ]);

      setRequirement(req);
      setComments(commentRes.data);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string) => {
    await requirementCommentApi.createComment({
      requirement_id: requirementId,
      content,
      comment_type: 'general',
    });

    // 重新加载评论
    loadData();
  };

  // ...
}
```

## 📝 注意事项

1. **错误处理**: 所有 API 调用都会在失败时抛出错误，使用 try-catch 捕获
2. **缓存**: 权限查询使用 5 分钟缓存，避免频繁请求
3. **类型安全**: 所有 API 都有完整的 TypeScript 类型定义
4. **日志**: 所有错误会自动记录到 logApiError
5. **分页**: 默认分页参数为 page=1, page_size=20

## 🔍 API 端点对照表

| 功能 | 前端方法 | 后端端点 |
|------|---------|---------|
| 获取需求列表 | `requirementApi.getRequirements()` | `GET /api/v1/requirements` |
| 创建需求 | `requirementApi.createRequirement()` | `POST /api/v1/requirements` |
| 获取需求详情 | `requirementApi.getRequirement(id)` | `GET /api/v1/requirements/:id` |
| 更新需求 | `requirementApi.updateRequirement(id, data)` | `PUT /api/v1/requirements/:id` |
| 删除需求 | `requirementApi.deleteRequirement(id)` | `DELETE /api/v1/requirements/:id` |
| 提交需求 | `requirementStatusApi.submitRequirement(id)` | `POST /api/v1/requirements/:id/submit` |
| 批准需求 | `requirementStatusApi.approveRequirement(id)` | `POST /api/v1/requirements/:id/approve` |
| 拒绝需求 | `requirementStatusApi.rejectRequirement(id)` | `POST /api/v1/requirements/:id/reject` |
| 撤回需求 | `requirementStatusApi.withdrawRequirement(id)` | `POST /api/v1/requirements/:id/withdraw` |
| 归档需求 | `requirementStatusApi.archiveRequirement(id)` | `POST /api/v1/requirements/:id/archive` |
| 获取权限 | `requirementStatusApi.getRequirementPermissions(id)` | `GET /api/v1/requirements/:id/permissions` |
| 创建评论 | `requirementCommentApi.createComment(data)` | `POST /api/v1/requirements/comments` |
| 获取评论 | `requirementCommentApi.getComments(filters)` | `GET /api/v1/requirements/comments` |
| 获取@我 | `requirementCommentApi.getMentionedComments()` | `GET /api/v1/requirements/comments/mentions/me` |
| 更新评论 | `requirementCommentApi.updateComment(id, data)` | `PUT /api/v1/requirements/comments/:id` |
| 删除评论 | `requirementCommentApi.deleteComment(id)` | `DELETE /api/v1/requirements/comments/:id` |
| 置顶评论 | `requirementCommentApi.togglePin(id)` | `PUT /api/v1/requirements/comments/:id/pin` |
| 关联任务 | `linkTaskToRequirement(reqId, taskId)` | `POST /api/v1/requirements/:id/tasks` |
| 取消关联 | `unlinkTaskFromRequirement(reqId, taskId)` | `DELETE /api/v1/requirements/:id/tasks/:task_id` |

---

*最后更新: 2025-11-06*
*版本: 1.0.0*
