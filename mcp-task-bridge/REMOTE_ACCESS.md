# MCP服务远程访问配置指南

本文档说明如何配置MCP (Model Context Protocol) 服务以支持远程访问，让其他用户能够通过SSE (Server-Sent Events) 模式连接到您的MCP服务器。

## 架构概览

```
远程客户端 (Claude Code)
    ↓ HTTPS
Nginx (反向代理 + SSL终止)
    ↓ HTTP (内网)
MCP SSE服务 (Node.js + Express)
    ↓ HTTP (内网)
后端API (Go + Gin)
    ↓
数据库 (PostgreSQL)
```

## 已配置的功能

### 1. SSE模式服务器

MCP服务已配置为SSE模式，支持：
- ✅ 多客户端并发连接
- ✅ Session管理
- ✅ 长连接支持（10分钟超时）
- ✅ 健康检查端点
- ✅ CORS跨域支持

### 2. Nginx反向代理

Nginx已配置以下端点：

| 端点 | 用途 | 访问方式 |
|------|------|----------|
| `/mcp/sse` | SSE连接端点 | GET请求 |
| `/mcp/message` | 消息发送端点 | POST请求 |
| `/mcp/health` | 健康检查 | GET请求 |

**配置特点**：
- SSE长连接超时：10分钟
- 禁用缓冲和压缩（实时传输）
- CORS：允许所有来源（`Access-Control-Allow-Origin: *`）
- 支持`X-API-Key`认证头

### 3. Docker容器配置

- **容器名**: `ai_mcp_server_prod`
- **内部端口**: 3000
- **主机端口**: 127.0.0.1:3100 (仅本地，通过Nginx暴露)
- **健康检查**: `/health`端点每30秒检查一次

## 远程访问配置步骤

### 步骤1: 获取服务器信息

您需要知道以下信息：
- **服务器域名/IP**: 例如 `152.136.104.251` 或您的域名
- **协议**: `https://` (生产环境) 或 `http://` (开发环境)

### 步骤2: 配置Claude Code客户端

在您的Claude Code配置中（通常是 `~/.config/claude/config.json` 或类似路径），添加MCP服务器配置：

```json
{
  "mcpServers": {
    "ai-proj": {
      "type": "sse",
      "url": "https://152.136.104.251/mcp/sse",
      "headers": {
        "X-API-Key": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

**配置说明**：
- `type`: 必须是 `"sse"`
- `url`: MCP SSE端点的完整URL
- `headers`: 包含API认证密钥（如果启用了认证）

### 步骤3: 验证连接

测试健康检查端点：

```bash
curl https://152.136.104.251/mcp/health
```

预期响应：
```json
{
  "status": "ok",
  "service": "mcp-bridge-sse",
  "backend": "http://backend-prod:8080/api/v1",
  "timestamp": "2025-10-21T14:30:00.000Z"
}
```

### 步骤4: 测试SSE连接

使用curl测试SSE连接：

```bash
curl -N -H "Accept: text/event-stream" \
  https://152.136.104.251/mcp/sse
```

您应该能看到SSE事件流开始传输。

## API认证（可选但推荐）

### 服务账号认证

后端支持基于`X-API-Key`的服务账号认证。如需启用：

1. **创建服务API Key**（通过后端管理界面或数据库）:
   - 在`service_api_keys`表中创建记录
   - 生成唯一的API Key（建议使用强随机字符串）
   - 关联到特定用户账号

2. **使用API Key**:
   ```bash
   curl -H "X-API-Key: your-secure-api-key" \
     https://152.136.104.251/mcp/sse
   ```

3. **在Claude Code中配置**:
   ```json
   {
     "mcpServers": {
       "ai-proj": {
         "type": "sse",
         "url": "https://152.136.104.251/mcp/sse",
         "headers": {
           "X-API-Key": "your-secure-api-key"
         }
       }
     }
   }
   ```

## 可用工具列表

MCP服务提供以下工具（部分列表）：

### 任务管理
- `create_task` - 创建新任务
- `start_task` - 开始执行任务
- `complete_task` - 完成任务
- `pause_task` - 暂停任务
- `list_tasks` - 查看任务列表
- `find_task` - 搜索任务
- `update_task` - 更新任务信息
- `delete_task` - 删除任务
- `create_subtask` - 创建子任务

### 文档管理
- `create-and-attach` - 创建并关联任务文档

## 环境变量配置

MCP服务的环境变量配置（`docker-compose.prod.yml`）：

```yaml
environment:
  # API基础地址（Docker内部访问）
  API_BASE_URL: http://backend-prod:8080/api/v1
  TASK_API_BASE: http://backend-prod:8080/api/v1
  # SSE服务端口配置
  MCP_PORT: 3000
  PORT: 3000
  NODE_ENV: production
  # MCP权限系统配置
  MCP_ENABLE_PERMISSIONS: "false"
  MCP_STRICT_PERMISSIONS: "false"
  MCP_DEBUG_PERMISSIONS: "false"
  # 开发登录用户（自动刷新token）
  DEV_LOGIN_USERNAME: admin
```

## 网络安全配置

### Nginx安全头

已配置的安全头：
- `Strict-Transport-Security` - 强制HTTPS
- `X-Frame-Options` - 防止点击劫持
- `X-Content-Type-Options` - 防止MIME嗅探
- `X-XSS-Protection` - XSS保护
- `Content-Security-Policy` - 内容安全策略

### CORS配置

当前配置为允许所有来源（`Access-Control-Allow-Origin: *`）。

**生产环境建议**：限制允许的来源
```nginx
add_header 'Access-Control-Allow-Origin' 'https://trusted-domain.com' always;
```

## 部署和重启

### 重新构建MCP服务

```bash
# 停止当前服务
docker-compose -f docker-compose.prod.yml stop mcp-server-prod

# 重新构建镜像
docker-compose -f docker-compose.prod.yml build mcp-server-prod

# 启动服务
docker-compose -f docker-compose.prod.yml up -d mcp-server-prod
```

### 查看日志

```bash
# 查看MCP服务日志
docker-compose -f docker-compose.prod.yml logs -f mcp-server-prod

# 查看Nginx日志
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 故障排查

### 问题1: 连接超时

**检查**:
1. 确认防火墙允许443端口（HTTPS）
2. 确认Nginx服务正在运行
3. 确认MCP服务健康检查通过

```bash
# 检查容器状态
docker ps | grep mcp

# 检查健康状态
docker inspect ai_mcp_server_prod | grep -A 10 Health
```

### 问题2: 401 Unauthorized

**原因**: API Key认证失败

**解决**:
1. 检查是否正确传递`X-API-Key`头
2. 验证API Key是否有效
3. 查看后端日志确认认证详情

### 问题3: SSE连接断开

**原因**: 可能的超时或网络问题

**解决**:
1. 检查Nginx SSE超时配置（当前为10分钟）
2. 确认客户端定期发送消息保持连接
3. 检查网络稳定性

## 监控和维护

### 健康检查

定期监控以下端点：
- `/mcp/health` - MCP服务健康状态
- `/health` - 后端API健康状态

### 日志监控

关键日志位置：
- MCP服务日志: `docker logs ai_mcp_server_prod`
- Nginx访问日志: `./logs/nginx/access.log`
- Nginx错误日志: `./logs/nginx/error.log`

### 性能监控

监控指标：
- 并发连接数
- 响应时间
- 错误率
- 资源使用（CPU、内存）

## 示例：使用Python客户端

```python
import sseclient
import requests
import json

# SSE连接
url = 'https://152.136.104.251/mcp/sse'
headers = {
    'Accept': 'text/event-stream',
    'X-API-Key': 'your-api-key'
}

response = requests.get(url, headers=headers, stream=True)
client = sseclient.SSEClient(response)

for event in client.events():
    print(f'Event: {event.event}')
    print(f'Data: {event.data}')
```

## 相关文档

- [MCP协议规范](https://github.com/modelcontextprotocol/protocol)
- [SSE (Server-Sent Events) 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Nginx反向代理配置](../nginx/sites/ai-project.conf)

## 联系和支持

如有问题，请：
1. 查看服务日志
2. 检查本文档的故障排查部分
3. 联系系统管理员

---

**最后更新**: 2025-10-21
**文档版本**: 1.0
