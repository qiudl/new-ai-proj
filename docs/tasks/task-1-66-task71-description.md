# 31-02-02：手工批量创建子任务接口

## 🎯 功能需求分析

### 核心功能定义
☐ 支持一次性为指定父任务创建多个子任务
☐ 允许手工指定每个子任务的详细属性
☐ 提供批量操作的事务性保证（全部成功或全部失败）
☐ 支持任务模板和快速批量创建模式

### 输入输出规格
**输入参数:**
☐ parentTaskId (number): 父任务ID
☐ tasks (array): 子任务列表
  - title (string): 任务标题
  - description (string, optional): 任务描述
  - priority (string, optional): 优先级
  - assigneeId (number, optional): 指派用户
  - dueDate (string, optional): 截止日期
  - estimatedHours (number, optional): 预估工时
  - tags (array, optional): 标签列表
☐ options (object, optional): 批量创建选项
  - autoAssign (boolean): 是否自动分配
  - inheritSettings (boolean): 是否继承父任务设置
  - startStatus (string): 初始状态

**输出格式:**
```json
{
  "success": true/false,
  "data": {
    "parent_id": "父任务ID",
    "created_count": "成功创建数量",
    "failed_count": "失败数量",
    "tasks": [
      {
        "id": "任务ID",
        "title": "任务标题",
        "status": "pending",
        "order": "排序位置"
      }
    ],
    "errors": ["错误信息列表"]
  },
  "message": "✅ 批量创建完成：成功X个，失败Y个"
}
```

### 业务逻辑梳理
☐ 验证父任务存在性和权限
☐ 批量验证所有子任务数据格式
☐ 检查任务标题重复性
☐ 计算子任务排序顺序
☐ 使用数据库事务确保原子性
☐ 处理部分成功的情况

## 🛠 技术实现方案

### API设计
**端点:** POST /api/v1/projects/{projectId}/tasks/{parentTaskId}/bulk-subtasks
☐ 设计支持批量操作的RESTful接口
☐ 实现请求体大小限制（避免过大批量操作）
☐ 添加批量操作专用的验证逻辑
☐ 实现进度回调机制（用于大批量操作）

**数据库操作:**
☐ 开启数据库事务 BEGIN TRANSACTION
☐ 批量插入子任务记录 INSERT INTO tasks
☐ 更新父任务的子任务计数
☐ 创建任务关系记录
☐ 提交事务 COMMIT 或回滚 ROLLBACK

### 数据结构设计
```typescript
interface BulkSubTaskRequest {
  parentTaskId: number;
  tasks: SubTaskData[];
  options?: BulkCreateOptions;
}

interface SubTaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: number;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
}

interface BulkCreateOptions {
  autoAssign?: boolean;
  inheritSettings?: boolean;
  startStatus?: 'pending' | 'todo' | 'in_progress';
  maxBatchSize?: number;
}

interface BulkCreateResult {
  parent_id: number;
  created_count: number;
  failed_count: number;
  tasks: CreatedTask[];
  errors: string[];
}
```

### 错误处理
☐ 父任务不存在: 404 Not Found
☐ 批量大小超限: 413 Payload Too Large
☐ 数据验证失败: 400 Bad Request
☐ 数据库事务失败: 500 Internal Server Error
☐ 部分创建失败: 207 Multi-Status

### 参数验证
☐ 验证parentTaskId有效性
☐ 验证tasks数组不为空且不超过限制
☐ 逐一验证每个子任务数据格式
☐ 检查assigneeId用户存在性
☐ 验证日期格式和逻辑合理性

### 性能优化
☐ 使用批量INSERT语句而非逐个插入
☐ 实现分批处理避免超时
☐ 添加操作进度反馈
☐ 优化数据库索引查询

## 🔌 MCP集成要求

### MCP Server方法实现
☐ 实现 bulkCreateSubTasks(parentTaskId, tasksData, options) 方法
☐ 支持简化的批量创建: createMultipleSubTasks(parentId, titles[])
☐ 添加进度回调支持
☐ 实现错误聚合和报告

### 工具注册
☐ 注册 bulk_create_subtasks 工具
☐ 注册 quick_create_subtasks 工具（简化版）
☐ 配置合理的输入参数限制
☐ 添加使用示例和文档

```javascript
{
  name: 'bulk_create_subtasks',
  description: '批量创建子任务，支持详细配置',
  inputSchema: {
    type: 'object',
    properties: {
      parentTaskId: { type: 'number', description: '父任务ID' },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '任务标题' },
            description: { type: 'string', description: '任务描述' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['title']
        },
        maxItems: 20,
        description: '子任务列表（最多20个）'
      }
    },
    required: ['parentTaskId', 'tasks']
  }
},
{
  name: 'quick_create_subtasks',
  description: '快速批量创建子任务，仅需标题',
  inputSchema: {
    type: 'object',
    properties: {
      parentTaskId: { type: 'number', description: '父任务ID' },
      titles: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 10,
        description: '任务标题列表（最多10个）'
      }
    },
    required: ['parentTaskId', 'titles']
  }
}
```

### 请求响应处理
☐ 实现两种批量模式的处理逻辑
☐ 添加操作进度信息
☐ 格式化批量操作结果
☐ 处理部分成功的复杂情况

## 🧪 测试计划

### 单元测试
☐ 测试批量数据验证逻辑
☐ 测试数据库事务处理
☐ 测试错误聚合机制
☐ 测试性能边界情况

### 集成测试  
☐ 测试大批量创建操作（100个子任务）
☐ 测试并发批量创建
☐ 测试事务回滚机制
☐ 测试内存使用情况

### 端到端测试
☐ 通过Claude Code执行批量创建
☐ 验证前端批量显示效果
☐ 测试用户体验流畅性
☐ 验证权限和安全性

### 压力测试
☐ 测试最大批量大小限制
☐ 测试数据库连接池压力
☐ 测试内存泄漏情况
☐ 测试超时处理机制

## ⏱ 预计工期

### 开发时间估算
☐ API设计和数据结构: 3小时
☐ 后端批量处理逻辑: 6小时
☐ 数据库事务优化: 2小时
☐ MCP集成和工具注册: 3小时
☐ 单元测试和集成测试: 4小时
☐ 性能测试和优化: 2小时
☐ **总计: 20小时 (2.5工作日)**

### 关键里程碑
☐ 8月2日: API设计和数据结构完成
☐ 8月3日: 后端核心逻辑实现
☐ 8月4日: MCP集成和基础测试
☐ 8月5日: 性能优化和压力测试

## ✅ 验收标准
☐ 支持一次创建最多20个子任务
☐ 批量操作事务性保证
☐ 响应时间在5秒内（20个任务）
☐ 内存使用合理，无泄漏
☐ 错误处理覆盖所有场景
☐ Claude Code集成测试通过

### 性能指标
☐ 10个子任务创建时间 < 2秒
☐ 20个子任务创建时间 < 5秒
☐ 内存峰值 < 100MB
☐ 数据库连接及时释放

### 用户体验
☐ 操作进度实时反馈
☐ 错误信息清晰明确
☐ 部分失败时的合理处理
☐ 前端界面响应流畅

## 🔗 依赖关系
- 数据库事务处理机制
- 任务权限验证系统
- 前端批量显示组件
- MCP协议基础设施
- 性能监控和日志系统

## 📝 使用示例
**Claude Code自然语言:**
- "为任务#66批量创建5个子任务：前端开发、后端开发、测试、部署、文档"
- "在项目管理任务下快速创建：需求分析、UI设计、开发实现、测试验证"

**MCP调用示例:**
```javascript
// 详细模式
bulkCreateSubTasks(66, [
  { title: "前端开发", priority: "high", assigneeId: 1 },
  { title: "后端开发", priority: "high", assigneeId: 2 },
  { title: "测试验证", priority: "medium", assigneeId: 3 }
]);

// 快速模式  
quickCreateSubTasks(66, [
  "需求分析", "UI设计", "开发实现", "测试验证"
]);
```