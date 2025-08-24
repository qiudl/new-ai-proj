# MCP接口修复方案

## 1. 文档路径问题修复

### 问题
MCP的文档创建功能报错：
```
ENOENT: no such file or directory, mkdir './.mcp-documents'
```

### 原因分析
MCP服务在运行时的工作目录可能不是项目根目录，导致相对路径创建失败。

### 修复方案

#### 方案A：使用项目绝对路径（推荐）
在 `task-mcp.ts` 中修改文档保存路径：

```typescript
import path from 'path';
import fs from 'fs';

class TaskMCPServer {
  private docsPath: string;
  
  constructor() {
    // 使用项目根目录的绝对路径
    this.docsPath = path.join('/Users/johnqiu/coding/www/projects/new-ai-proj', 'mcp-documents');
    
    // 确保目录存在
    if (!fs.existsSync(this.docsPath)) {
      fs.mkdirSync(this.docsPath, { recursive: true });
    }
  }
  
  // 在需要保存文档的地方使用 this.docsPath
}
```

#### 方案B：通过环境变量配置
创建 `.env.mcp` 文件：
```env
MCP_DOCS_PATH=/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-documents
```

在代码中使用：
```typescript
const docsPath = process.env.MCP_DOCS_PATH || path.join(process.cwd(), 'mcp-documents');
```

## 2. 任务状态映射差异

### 后端实际支持的状态
根据数据库schema分析，系统支持的任务状态包括：

#### 标准状态（数据库默认）
- `todo` - 待办（默认）
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

#### MCP文档中提到的扩展状态
- `draft` - 草稿
- `planning` - 规划中
- `testing` - 测试中
- `on_hold` - 暂停
- `suspended` - 挂起
- `blocked` - 阻塞
- `archived` - 已归档

### 状态映射建议

创建状态映射配置：
```typescript
const STATUS_MAPPING = {
  // MCP状态 -> 后端实际状态
  'draft': 'todo',
  'planning': 'todo',
  'todo': 'todo',
  'in_progress': 'in_progress',
  'testing': 'in_progress',
  'completed': 'completed',
  'cancelled': 'cancelled',
  'on_hold': 'todo',
  'suspended': 'todo',
  'blocked': 'todo',
  'archived': 'completed'
};

// 在更新任务状态时使用映射
function mapStatus(mcpStatus: string): string {
  return STATUS_MAPPING[mcpStatus] || 'todo';
}
```

## 3. 修复批量文档创建功能

### 实现 create_batch_documents
```typescript
async createBatchDocuments(documents: Array<{
  taskId: number,
  title: string,
  content: string,
  projectId?: number
}>): Promise<ApiResponse> {
  const results = [];
  const errors = [];
  
  for (const doc of documents) {
    try {
      const result = await this.createAndAttachTaskDocument(
        doc.taskId,
        doc.content,
        doc.projectId || 1,
        doc.title
      );
      results.push(result);
    } catch (error) {
      errors.push({
        taskId: doc.taskId,
        error: error.message
      });
    }
  }
  
  return {
    success: errors.length === 0,
    created: results.length,
    failed: errors.length,
    results,
    errors,
    message: `✅ 成功创建 ${results.length} 个文档${errors.length > 0 ? `，${errors.length} 个失败` : ''}`
  };
}
```

## 4. 添加文档检查功能

### 实现 has_task_document
```typescript
async hasTaskDocument(taskId: number, projectId: number = 1): Promise<ApiResponse> {
  try {
    const task = await this.findTaskById(taskId);
    const actualProjectId = task.project_id || projectId;
    
    const response = await axios.get(
      `${this.apiBase}/projects/${actualProjectId}/tasks/${taskId}/documents/has`,
      { headers: this.getHeaders() }
    );
    
    return {
      success: true,
      task_id: taskId,
      project_id: actualProjectId,
      has_document: response.data?.has_document || false,
      message: response.data?.has_document ? 
        `✅ 任务 #${taskId} 有文档` : 
        `❌ 任务 #${taskId} 无文档`
    };
  } catch (error) {
    // 如果接口不存在，回退到list判断
    try {
      const listResp = await axios.get(
        `${this.apiBase}/projects/${actualProjectId}/tasks/${taskId}/documents/list`,
        { headers: this.getHeaders() }
      );
      const hasDoc = (listResp.data?.data?.documents || []).length > 0;
      
      return {
        success: true,
        task_id: taskId,
        project_id: actualProjectId,
        has_document: hasDoc,
        message: hasDoc ? 
          `✅ 任务 #${taskId} 有文档` : 
          `❌ 任务 #${taskId} 无文档`
      };
    } catch (listError) {
      return {
        success: false,
        error: `检查文档失败: ${error.message}`
      };
    }
  }
}
```

## 5. 优化错误处理

### 添加重试机制
```typescript
async retryableRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // 指数退避
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
}

// 使用示例
async createTask(title: string, projectId: number) {
  return await this.retryableRequest(() => 
    axios.post(`${this.apiBase}/tasks`, { title, project_id: projectId })
  );
}
```

## 6. 测试计划

### 单元测试
1. 测试状态映射正确性
2. 测试文档路径创建
3. 测试错误处理和重试

### 集成测试
1. 创建任务并关联文档
2. 批量创建文档
3. 状态更新流程
4. 文档检查功能

### 端到端测试
1. 通过Claude Code创建任务
2. 添加文档
3. 更新状态
4. 验证前端显示

## 7. 实施步骤

1. **第一步**：修复文档路径问题（30分钟）
   - 更新 task-mcp.ts 使用绝对路径
   - 创建必要的目录
   - 测试文档创建功能

2. **第二步**：实现状态映射（30分钟）
   - 添加状态映射配置
   - 更新状态更新方法
   - 测试各种状态转换

3. **第三步**：完善缺失功能（1小时）
   - 实现批量文档创建
   - 实现文档检查功能
   - 添加错误重试机制

4. **第四步**：测试验证（30分钟）
   - 运行所有测试用例
   - 验证与前端的集成
   - 修复发现的问题
