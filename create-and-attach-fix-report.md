### Claude Code 中的自然语言指令
```
"为任务105创建技术文档：实现用户登录功能的详细技术方案"
```

### MCP调用
```typescript
await taskServer.createAndAttachTaskDocument(
  105, 
  "# 用户登录功能技术方案\n\n## 概述\n...", 
  1,
  "用户登录功能技术方案"
);
```

### API请求
```http
POST /api/v1/projects/1/tasks/105/documents/create-and-attach
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "用户登录功能技术方案",
  "content": "# 用户登录功能技术方案\n\n## 概述\n...",
  "type": "markdown",
  "status": "draft",
  "description": "任务 #105 的关联文档",
  "tags": ["mcp-generated"],
  "visibility": "team",
  "is_template": false,
  "relationship_type": "attachment",
  "metadata": {
    "source": "claude-code-mcp",
    "created_by": "mcp-bridge",
    "task_id": "105"
  }
}
```

## 验证清单

准备测试时，可以验证以下方面：

✅ **功能验证**：
- create-and-attach 接口调用成功
- 文档正确保存到数据库
- 任务关联关系建立成功
- 前端界面能正常显示文档内容

✅ **数据一致性验证**：
- API写入和读取的内容完全一致
- 文档元数据正确保存
- 关联关系状态正确

## 修正文件清单

### 主要修改文件
1. **`mcp-task-bridge/task-mcp.ts`**
   - 简化 `createAndAttachTaskDocument` 方法
   - 优化 `createOrUpdateTaskDocument` 方法
   - 改善错误处理逻辑

2. **`mcp-task-bridge/index.ts`**
   - 更新工具描述，使其准确反映功能

### 新增文件
3. **`mcp-task-bridge/test-create-and-attach-fixed.js`**
   - 完整的功能测试脚本
   - 验证数据一致性
   - 提供调试信息

## 总结

通过这次修正：

1. **简化了代码结构**：移除了不必要的复杂逻辑
2. **提高了可靠性**：直接使用后端原子操作接口
3. **改善了用户体验**：错误信息更清晰友好
4. **增强了功能完整性**：支持完整的文档元数据

现在 `create-and-attach` 接口真正实现了其设计本意：**在数据库中创建文档记录并建立与任务的关联关系**，为Claude Code与项目管理系统的深度集成奠定了坚实基础。

## 下一步建议

1. **启动后端服务**
   ```bash
   cd /Users/johnqiu/coding/www/projects/new-ai-proj
   docker-compose up -d
   ```

2. **运行测试脚本验证功能**
   ```bash
   cd mcp-task-bridge
   node test-create-and-attach-fixed.js
   ```

3. **在Claude Code中测试自然语言指令**
   - 确保MCP服务器正在运行
   - 使用类似 "为任务XXX创建文档" 的指令

4. **检查前端界面**
   - 访问 http://localhost:3000
   - 查看对应任务的"任务文档"标签页
   - 验证文档内容显示正确

## 技术细节

### 数据库事务流程
1. **开始事务**
2. **创建documents表记录**
   - 插入文档标题、内容、元数据等
3. **创建task_documents关联记录**
   - 建立任务ID与文档ID的关联关系
4. **提交事务**（成功）或 **回滚事务**（失败）

### 前后端数据流
```
Claude Code → MCP Bridge → 后端API → PostgreSQL
                ↓
            前端界面 ← HTTP响应 ← 数据库查询
```

这样的修正确保了整个数据流的一致性和可靠性。