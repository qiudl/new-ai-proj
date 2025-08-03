# 31-02-01：创建兄弟任务接口

## 🎯 功能需求分析

### 核心功能定义
☐ 在指定任务的同级别创建新任务（兄弟任务）
☐ 保持与原任务相同的父级关系和层级结构
☐ 支持自定义任务标题、描述、优先级等属性
☐ 自动继承项目ID和部分默认属性

### 输入输出规格
**输入参数:**
☐ referenceTaskId (number): 参考任务ID，新任务将创建为其兄弟
☐ title (string): 新任务标题
☐ description (string, optional): 任务描述
☐ priority (string, optional): 优先级 (low/medium/high)
☐ assigneeId (number, optional): 指派用户ID
☐ dueDate (string, optional): 截止日期

**输出格式:**
```json
{
  "success": true/false,
  "data": {
    "id": "新任务ID",
    "title": "任务标题",
    "parent_id": "父任务ID（与参考任务相同）",
    "project_id": "项目ID",
    "status": "pending",
    "sibling_of": "参考任务ID"
  },
  "message": "✅ 兄弟任务已创建"
}
```

### 业务逻辑梳理
☐ 查询参考任务的详细信息
☐ 获取参考任务的父级ID和项目ID
☐ 验证用户是否有在该项目创建任务的权限
☐ 创建新任务并设置正确的层级关系
☐ 返回创建结果和关系信息

## 🛠 技术实现方案

### API设计
**端点:** POST /api/v1/projects/{projectId}/tasks/{referenceTaskId}/sibling
☐ 设计RESTful风格的API端点
☐ 实现参数验证中间件
☐ 添加权限检查逻辑
☐ 实现错误处理和状态码

**数据库操作:**
☐ 查询参考任务信息: SELECT * FROM tasks WHERE id = ?
☐ 获取父级信息验证层级关系
☐ 插入新任务记录，parent_id与参考任务相同
☐ 更新相关统计信息（如子任务数量）

### 数据结构设计
```typescript
interface CreateSiblingTaskRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: number;
  dueDate?: string;
}

interface SiblingTaskResponse {
  id: number;
  title: string;
  parent_id: number | null;
  project_id: number;
  status: string;
  created_at: string;
  sibling_of: number;
}
```

### 错误处理
☐ 参考任务不存在: 404 Not Found
☐ 权限不足: 403 Forbidden  
☐ 参数验证失败: 400 Bad Request
☐ 数据库操作失败: 500 Internal Server Error
☐ 循环依赖检查: 409 Conflict

### 参数验证
☐ 验证referenceTaskId为有效数字
☐ 验证title非空且长度在限制范围内
☐ 验证priority枚举值正确性
☐ 验证dueDate格式符合ISO 8601
☐ 验证assigneeId对应用户存在

## 🔌 MCP集成要求

### MCP Server方法实现
☐ 实现 createSiblingTask(referenceTaskId, taskData) 方法
☐ 添加到TaskMCPServer类中
☐ 实现错误处理和响应格式化
☐ 添加调试日志输出

### 工具注册
☐ 在MCP Server的tools/list中注册新工具
☐ 定义工具描述: "创建兄弟任务"
☐ 配置输入参数schema
☐ 设置工具分类和权限

```javascript
{
  name: 'create_sibling_task',
  description: '在指定任务的同级别创建兄弟任务',
  inputSchema: {
    type: 'object',
    properties: {
      referenceTaskId: { type: 'number', description: '参考任务ID' },
      title: { type: 'string', description: '新任务标题' },
      description: { type: 'string', description: '任务描述（可选）' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] }
    },
    required: ['referenceTaskId', 'title']
  }
}
```

### 请求响应处理
☐ 实现tools/call处理逻辑
☐ 参数解析和验证
☐ 调用后端API
☐ 格式化返回结果

## 🧪 测试计划

### 单元测试
☐ 测试参考任务查询逻辑
☐ 测试参数验证功能
☐ 测试权限检查机制
☐ 测试错误处理覆盖率

### 集成测试  
☐ 测试完整的创建兄弟任务流程
☐ 测试与前端的API集成
☐ 测试数据库事务完整性
☐ 测试并发操作安全性

### 端到端测试
☐ 通过Claude Code自然语言创建兄弟任务
☐ 验证前端界面正确显示新任务
☐ 测试任务层级关系正确性
☐ 验证权限控制有效性

### 测试用例
☐ 正常场景: 成功创建兄弟任务
☐ 边界场景: 参考任务为根任务
☐ 异常场景: 参考任务不存在
☐ 权限场景: 无权限创建任务

## ⏱ 预计工期

### 开发时间估算
☐ API设计和数据库schema: 2小时
☐ 后端接口实现: 4小时
☐ MCP集成开发: 2小时
☐ 单元测试编写: 2小时
☐ 集成测试和调试: 2小时
☐ **总计: 12小时 (1.5工作日)**

### 关键里程碑
☐ 8月2日下午: API设计完成
☐ 8月3日上午: 后端实现完成
☐ 8月3日下午: MCP集成完成
☐ 8月3日晚: 测试完成

## ✅ 验收标准
☐ 能够通过Claude Code执行: "为任务#50创建兄弟任务：前端优化"
☐ 新创建的任务与参考任务在同一层级
☐ 任务关系在前端界面正确显示
☐ 所有测试用例通过
☐ API文档完整准确

## 🔗 依赖关系
- 需要现有的任务CRUD API
- 依赖用户权限管理系统
- 前端任务树显示组件
- MCP协议基础设施