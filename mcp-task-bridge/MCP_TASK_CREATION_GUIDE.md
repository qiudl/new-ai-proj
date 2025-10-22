# MCP任务创建完整指南

本指南介绍如何通过MCP (Model Context Protocol) 连接并创建任务。

## 📋 目录

- [快速开始](#快速开始)
- [方法概览](#方法概览)
- [方法1: 直接API调用](#方法1-直接api调用)
- [方法2: 远程MCP服务器](#方法2-远程mcp服务器)
- [方法3: Claude Code集成](#方法3-claude-code集成)
- [故障排查](#故障排查)
- [示例脚本](#示例脚本)

## 🚀 快速开始

### 前置要求

- Node.js 18+ 或 Python 3.8+
- 网络访问权限（用于远程MCP）
- 有效的API Token或MCP API Key

### 5分钟快速测试

```bash
# 进入MCP bridge目录
cd /path/to/new-ai-proj/mcp-task-bridge

# 方式1: 使用演示脚本（本地API）
node create-task-demo.mjs local

# 方式2: 使用演示脚本（远程MCP）
node create-task-demo.mjs remote

# 方式3: 使用Python测试脚本
python3 test-mcp-sse.py
```

## 🔧 方法概览

### 对比表

| 方法 | 适用场景 | 网络要求 | 难度 | 推荐度 |
|------|---------|---------|------|--------|
| 直接API调用 | 本地开发 | 本地网络 | ⭐ 简单 | ⭐⭐⭐ |
| 远程MCP | 生产环境 | 外网访问 | ⭐⭐ 中等 | ⭐⭐⭐⭐⭐ |
| Claude Code集成 | AI辅助开发 | 外网访问 | ⭐⭐⭐ 复杂 | ⭐⭐⭐⭐⭐ |

## 方法1: 直接API调用

### 适用场景
- 后端服务在本地运行
- 快速测试和开发
- 直接集成到应用中

### 前置条件

```bash
# 检查后端服务是否运行
curl http://localhost:8080/api/v1/health

# 设置API Token
export API_TOKEN="your_jwt_token_here"
```

### 使用cURL创建任务

```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "title": "我的第一个任务",
    "description": "这是任务描述",
    "project_id": 1,
    "priority": "high",
    "status": "pending"
  }'
```

### 使用Node.js

```javascript
import http from 'http';

const taskData = {
  title: "我的任务",
  description: "任务描述",
  project_id: 1,
  priority: "medium"
};

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/tasks',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('任务已创建:', JSON.parse(data)));
});

req.write(JSON.stringify(taskData));
req.end();
```

### 使用Python

```python
import requests
import os

url = 'http://localhost:8080/api/v1/tasks'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {os.getenv("API_TOKEN")}'
}

task_data = {
    'title': '我的任务',
    'description': '任务描述',
    'project_id': 1,
    'priority': 'medium'
}

response = requests.post(url, json=task_data, headers=headers)
print('任务已创建:', response.json())
```

## 方法2: 远程MCP服务器

### 适用场景
- 生产环境
- 远程访问
- 多客户端共享

### 服务器信息

```
URL: https://152.136.104.251/mcp
API Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06
```

### 步骤1: 测试连接

```bash
# 健康检查
curl -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  https://152.136.104.251/mcp/health

# SSE连接测试
curl -N \
  -H "Accept: text/event-stream" \
  -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  https://152.136.104.251/mcp/sse
```

### 步骤2: 创建任务

使用提供的演示脚本：

```bash
node create-task-demo.mjs remote
```

或者手动调用MCP API：

```bash
# 创建会话ID
SESSION_ID="session-$(date +%s)"

# 发送MCP消息
curl -X POST "https://152.136.104.251/mcp/message?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_task",
      "arguments": {
        "title": "通过MCP创建的任务",
        "description": "这是描述",
        "project_id": 1,
        "priority": "high"
      }
    }
  }'
```

### MCP可用工具

创建任务后，您可以使用以下工具：

```bash
# 列出所有可用工具
curl -X POST "https://152.136.104.251/mcp/message?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

常用工具：
- `create_task` - 创建任务
- `start_task` - 开始任务
- `complete_task` - 完成任务
- `pause_task` - 暂停任务
- `list_tasks` - 列出任务
- `find_task` - 查找任务
- `update_task` - 更新任务
- `delete_task` - 删除任务
- `create_subtask` - 创建子任务

## 方法3: Claude Code集成

### 适用场景
- AI辅助开发
- 自然语言交互
- 最佳用户体验

### 步骤1: 配置Claude Code

编辑配置文件 `~/.config/claude/mcp-servers.json`：

```json
{
  "mcpServers": {
    "ai-proj": {
      "type": "sse",
      "url": "https://152.136.104.251/mcp/sse",
      "headers": {
        "X-API-Key": "mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06"
      }
    }
  }
}
```

或者复制示例配置：

```bash
cp /path/to/mcp-task-bridge/claude-code-config.example.json \
   ~/.config/claude/mcp-servers.json
```

### 步骤2: 重启Claude Code

```bash
# 如果Claude Code正在运行，先关闭
# 然后重新启动
claude-code
```

### 步骤3: 验证连接

在Claude Code中输入：

```
你好，请帮我列出所有可用的MCP工具
```

Claude应该能够看到并列出所有MCP工具。

### 步骤4: 创建任务

使用自然语言：

```
请帮我创建一个任务：
标题：实现用户登录功能
描述：需要支持邮箱和手机号登录
优先级：高
```

Claude会自动调用 `create_task` 工具并创建任务。

### 高级用法

```
# 创建带子任务的任务
请创建一个主任务"开发用户模块"，并添加以下子任务：
1. 设计数据库表结构
2. 实现用户注册API
3. 实现用户登录API
4. 编写单元测试

# 批量操作
请将项目1中所有优先级为"high"的待办任务开始执行

# 搜索和更新
找到标题包含"登录"的任务，并将其优先级设为"urgent"
```

## 🔍 故障排查

### 问题1: 连接超时

**症状**: `Connection timeout` 或 `ECONNREFUSED`

**可能原因**:
- 服务未运行
- 防火墙阻止
- 网络不通

**解决方案**:
```bash
# 检查本地服务
curl http://localhost:8080/api/v1/health

# 检查远程服务
curl https://152.136.104.251/mcp/health

# 检查防火墙
sudo ufw status
```

### 问题2: SSL握手失败

**症状**: `SSL handshake failure`

**解决方案**:
```bash
# 临时忽略SSL验证（仅测试用）
curl -k https://152.136.104.251/mcp/health

# 或在脚本中设置
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 问题3: 401 Unauthorized

**症状**: `401 Unauthorized` 或 `Access denied`

**可能原因**:
- API Key错误
- Token过期

**解决方案**:
```bash
# 验证API Key
echo $MCP_API_KEY

# 重新设置
export MCP_API_KEY="mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06"

# 或重新获取Token
# (联系系统管理员)
```

### 问题4: 403 Forbidden

**症状**: HTTP 403错误

**可能原因**:
- IP被限制
- 权限不足

**解决方案**:
```bash
# 从服务器本地测试
ssh user@152.136.104.251
curl http://localhost:3100/health
```

### 问题5: MCP工具未显示

**症状**: Claude Code中看不到MCP工具

**解决方案**:
1. 检查配置文件路径：`~/.config/claude/mcp-servers.json`
2. 验证JSON格式正确
3. 重启Claude Code
4. 查看日志：`~/.config/claude/logs/`

## 📝 示例脚本

### 完整的任务创建示例

```bash
#!/bin/bash
# complete-task-example.sh

# 配置
API_BASE="http://localhost:8080/api/v1"
TOKEN="your_jwt_token"

# 创建主任务
MAIN_TASK=$(curl -s -X POST "$API_BASE/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "开发新功能",
    "description": "实现完整的用户管理模块",
    "project_id": 1,
    "priority": "high"
  }')

MAIN_TASK_ID=$(echo $MAIN_TASK | jq -r '.id')
echo "主任务已创建: ID=$MAIN_TASK_ID"

# 创建子任务
for subtask in "设计数据库" "实现API" "编写测试"
do
  curl -s -X POST "$API_BASE/tasks" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"title\": \"$subtask\",
      \"parent_id\": $MAIN_TASK_ID,
      \"project_id\": 1
    }"
  echo "子任务已创建: $subtask"
done

# 开始主任务
curl -s -X PUT "$API_BASE/tasks/$MAIN_TASK_ID/start" \
  -H "Authorization: Bearer $TOKEN"
echo "主任务已开始"
```

### Python批量创建示例

```python
#!/usr/bin/env python3
# batch-create-tasks.py

import requests
import os

API_BASE = 'http://localhost:8080/api/v1'
TOKEN = os.getenv('API_TOKEN')

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {TOKEN}'
}

# 任务列表
tasks = [
    {'title': '需求分析', 'priority': 'high'},
    {'title': '技术设计', 'priority': 'high'},
    {'title': '编码实现', 'priority': 'medium'},
    {'title': '单元测试', 'priority': 'medium'},
    {'title': '集成测试', 'priority': 'low'},
]

# 批量创建
for task in tasks:
    task['project_id'] = 1
    response = requests.post(
        f'{API_BASE}/tasks',
        json=task,
        headers=headers
    )
    if response.status_code in [200, 201]:
        print(f'✓ 已创建: {task["title"]}')
    else:
        print(f'✗ 失败: {task["title"]} - {response.text}')
```

## 📚 相关文档

- [QUICKSTART.md](./QUICKSTART.md) - 快速入门
- [README-SSE.md](./README-SSE.md) - SSE模式详细文档
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查指南
- [REMOTE_ACCESS.md](./REMOTE_ACCESS.md) - 远程访问配置

## 🔐 安全建议

1. **保护敏感信息**
   - 不要在代码中硬编码Token
   - 使用环境变量存储密钥
   - 不要提交密钥到版本控制

2. **使用HTTPS**
   - 生产环境始终使用HTTPS
   - 验证SSL证书

3. **权限控制**
   - 使用最小权限原则
   - 定期轮换密钥
   - 监控异常访问

## 💡 最佳实践

1. **任务命名**
   - 使用清晰的标题
   - 包含足够的上下文
   - 遵循团队规范

2. **任务层级**
   - 合理使用父子任务
   - 避免层级过深（建议≤3层）
   - 保持任务粒度适中

3. **优先级设置**
   - urgent: 紧急且重要
   - high: 重要但不紧急
   - medium: 正常优先级
   - low: 可以延后

4. **状态管理**
   - pending: 待开始
   - in_progress: 进行中
   - completed: 已完成
   - paused: 已暂停
   - blocked: 被阻塞

## 🆘 获取帮助

- **文档**: 查看项目文档目录
- **测试工具**: 使用提供的测试脚本
- **日志**: 查看服务日志了解详情
- **社区**: 提交Issue或讨论

---

**最后更新**: 2025-10-22
**版本**: 1.0.0
**作者**: AI项目管理系统团队
