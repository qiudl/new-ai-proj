# 任务文档关联修复方案

## 问题诊断

✅ **已确认问题**：任务详情页的文档功能与保存的md文件之间**没有建立关联关系**

### 问题根源
1. **文档存储路径不一致**：
   - 前端API调用：`GET /projects/{projectId}/tasks/{taskId}/document`
   - 后端Handler存储：`./docs/tasks/{taskId}.md`
   - 实际文件位置：`./docs/tasks/projects/project-1/task-{taskId}.md`

2. **存在双重文档系统**：
   - 简单系统：TaskDocumentHandler → `./docs/tasks/{taskId}.md`
   - 项目系统：自动生成 → `./docs/tasks/projects/project-{projectId}/task-{taskId}.md`

## 修复方案

### 方案一：修改TaskDocumentHandler路径映射（推荐）

修改 `backend/handlers/task_document_handler.go` 中的路径生成逻辑：

```go
// 修改 getDocumentPath 方法
func (h *TaskDocumentHandler) getDocumentPath(projectID, taskID string) string {
    return filepath.Join(h.docsBasePath, "projects", fmt.Sprintf("project-%s", projectID), fmt.Sprintf("task-%s.md", taskID))
}

// 修改对应的处理函数
func (h *TaskDocumentHandler) GetTaskDocument(c *gin.Context) {
    projectID := c.Param("id")
    taskID := c.Param("taskId")
    
    // 验证参数...
    
    h.getDocumentGin(c, projectID, taskID)
}
```

### 方案二：统一使用TaskDocumentFileHandler

将前端API路由改为使用已有的文件处理器：

```go
// 修改 main.go 中的路由
projects.GET("/:id/tasks/:taskId/document", app.taskDocumentFileHandler.GetTaskDocument)
projects.PUT("/:id/tasks/:taskId/document", app.taskDocumentFileHandler.UpdateTaskDocument)
```

### 方案三：创建统一文档桥接器

创建新的处理器来桥接两个系统：

```go
type UnifiedDocumentHandler struct {
    simpleHandler *TaskDocumentHandler
    fileHandler   *TaskDocumentFileHandler
}

func (h *UnifiedDocumentHandler) GetTaskDocument(c *gin.Context) {
    projectID := c.Param("id")
    taskID := c.Param("taskId")
    
    // 优先检查项目文档系统
    projectDocPath := fmt.Sprintf("./docs/tasks/projects/project-%s/task-%s.md", projectID, taskID)
    if _, err := os.Stat(projectDocPath); err == nil {
        // 使用文件处理器
        h.fileHandler.GetTaskDocument(c)
        return
    }
    
    // 回退到简单处理器
    h.simpleHandler.GetTaskDocument(c)
}
```

## 实施步骤

### 第一步：诊断验证
```bash
# 检查任务105的文档文件
ls -la ./backend/docs/tasks/105.md
ls -la ./backend/docs/tasks/projects/project-1/task-105.md

# 测试当前API
curl -X GET "http://localhost:8080/api/v1/projects/1/tasks/105/document"
```

### 第二步：选择并实施方案
推荐**方案一**，因为：
- 代码改动最小
- 保持现有API不变
- 直接解决路径映射问题

### 第三步：验证修复
1. 修改后重启后端
2. 在任务详情页测试文档编辑
3. 验证内容能正确保存和读取
4. 确认与项目md文件的一致性

## MCP集成增强

一旦文档关联修复，可以为MCP添加文档管理功能：

```typescript
// 在task-mcp.ts中添加
async createTaskDocument(taskId: number, projectId: number, content: string) {
  try {
    const response = await axios.put(
      `${API_BASE}/projects/${projectId}/tasks/${taskId}/document`,
      { content }
    );
    return {
      taskId,
      projectId,
      saved: true,
      message: `✅ 任务 #${taskId} 文档已保存`
    };
  } catch (error) {
    return {
      error: `保存任务文档失败: ${error.message}`
    };
  }
}

async getTaskDocument(taskId: number, projectId: number) {
  try {
    const response = await axios.get(
      `${API_BASE}/projects/${projectId}/tasks/${taskId}/document`
    );
    return {
      taskId,
      projectId,
      content: response.data.content,
      message: `📄 任务 #${taskId} 文档内容已获取`
    };
  } catch (error) {
    return {
      error: `获取任务文档失败: ${error.message}`
    };
  }
}
```

## 测试验证命令

```bash
# 启动开发环境
cd /Users/johnqiu/coding/www/projects/new-ai-proj
docker-compose up -d

# 测试任务105的文档功能
curl -X GET "http://localhost:8080/api/v1/projects/1/tasks/105/document"

# 保存测试内容
curl -X PUT "http://localhost:8080/api/v1/projects/1/tasks/105/document" \
  -H "Content-Type: application/json" \
  -d '{"content":"# 测试文档\n\n这是测试内容"}'

# 验证文件是否正确保存
cat ./backend/docs/tasks/projects/project-1/task-105.md
```

修复完成后，用户就能在任务详情页的"任务文档"标签页中编辑和查看与保存的md文件内容一致的文档了。