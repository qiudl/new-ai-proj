# MCP连接问题诊断报告

**诊断时间**：2025-10-01 13:45  
**问题**：MCP工具无法创建任务

## 问题现象

调用`ai-proj:create_task`工具时返回：
```json
{
  "success": false,
  "error": "服务器内部错误: 创建任务失败"
}
```

## 诊断结果

### ✅ 已验证正常的部分

1. **后端服务**
   - 端口8080正常监听
   - 健康检查接口返回正常
   - 进程ID: 13155

2. **前端服务**
   - 端口3000正常监听
   - 进程ID: 43669

3. **数据库连接**
   - PostgreSQL服务正常
   - 数据库包含2198条任务记录
   - 表结构完整，包含所有必需字段

4. **MCP服务器**
   - 构建成功（`npm run build`）
   - 可以正常启动
   - 能够连接到后端API
   - 显示正确的初始化信息

5. **API认证**
   - Token已刷新并正常工作
   - 可以成功调用其他API（如list_projects, dev_quick_login）

6. **用户数据**
   - ai-pm用户存在（ID: 111）
   - admin用户存在（ID: 1）
   - guoym用户存在（ID: 110）

### ❌ 发现的问题

1. **创建任务API失败**
   - 直接调用`POST /api/v1/projects/1/tasks`返回"创建任务失败"
   - 无论是否包含custom_fields都失败
   - 无论用简单还是复杂的请求体都失败

2. **缺少详细错误日志**
   - `/backend/logs/app.log`不存在
   - 无法查看后端的详细错误信息

3. **数据库写入限制**
   - psql连接显示"read-only transaction"
   - 这可能只是psql客户端的默认设置

## 可能的原因

1. **后端代码问题**
   - 创建任务的逻辑中可能存在未捕获的错误
   - 可能是数据验证失败
   - 可能是某个触发器或约束失败

2. **数据库约束**
   - 某个CHECK约束可能失败
   - 某个TRIGGER可能抛出异常

3. **环境配置**
   - 后端可能处于某种只读模式
   - 数据库连接配置可能有问题

## 下一步行动建议

### 方案A：查看后端日志（推荐）
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
# 如果后端使用air热重载
kill -9 13155
air  # 重启并观察日志输出
```

### 方案B：启用详细日志
编辑`.env`文件，确保：
```
LOG_LEVEL=debug
GIN_MODE=debug
```

### 方案C：直接测试数据库
```bash
# 使用非只读连接测试插入
psql -h localhost -p 5432 -U dev_user -d ai_project_db << 'EOF'
BEGIN;
INSERT INTO tasks (project_id, title, description, status, priority, assignee_id) 
VALUES (1, 'DB测试任务', '测试', 'todo', 'low', 111) 
RETURNING id, title;
COMMIT;
EOF
```

### 方案D：检查Go代码
查看`/backend/handlers/task_handler.go`中CreateTask方法的具体实现，特别是：
- 第259-450行左右的创建逻辑
- 数据验证部分
- 错误处理部分

## MCP配置

**Claude Desktop配置位置**：
```
/Users/johnqiu/Library/Application Support/Claude/claude_desktop_config.json
```

**当前配置**：
```json
{
  "mcpServers": {
    "ai-proj": {
      "command": "/Users/johnqiu/.nvm/versions/node/v22.15.0/bin/node",
      "args": [
        "/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

**建议更新的配置**（添加环境变量）：
```json
{
  "mcpServers": {
    "ai-proj": {
      "command": "/Users/johnqiu/.nvm/versions/node/v22.15.0/bin/node",
      "args": [
        "/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "development",
        "API_BASE_URL": "http://localhost:8080/api/v1",
        "TASK_API_BASE": "http://localhost:8080/api/v1",
        "APP_ENV": "development"
      },
      "working_directory": "/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge"
    }
  }
}
```

## 临时解决方案

在问题解决之前，可以使用以下方法创建任务：

1. **通过前端UI创建**  
   访问 http://localhost:3000 使用Web界面创建

2. **直接通过数据库**  
   使用pgAdmin或其他数据库工具直接插入

3. **使用其他MCP工具**  
   其他工具（如list_projects）工作正常，可以继续使用

## 总结

MCP基础设施运行正常，问题出在**后端创建任务的业务逻辑**上。需要：
1. 重启后端服务并观察日志
2. 检查是否有特定的数据验证失败
3. 确认数据库连接是否有写入权限

**优先级**：立即重启后端服务查看详细错误信息
