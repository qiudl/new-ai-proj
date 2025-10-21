# MCP远程访问快速入门

本指南帮助您快速配置Claude Code客户端以连接到AI项目管理系统的MCP服务器。

## 前置条件

- 已安装Claude Code客户端
- 拥有有效的API Key: `mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06`
- 能够访问服务器 `152.136.104.251`

## 步骤1: 配置Claude Code

### 方法A: 使用提供的配置文件

1. 复制配置示例文件：
   ```bash
   cp claude-code-config.example.json ~/.config/claude/mcp-servers.json
   ```

2. 或者手动编辑您的Claude Code配置文件（通常在 `~/.config/claude/mcp-servers.json`）

### 方法B: 手动配置

在Claude Code配置文件中添加以下内容：

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

## 步骤2: 测试连接

### 使用提供的测试脚本

```bash
cd /home/user/new-ai-proj/mcp-task-bridge
./test-sse-connection.sh
```

### 手动测试

#### 测试健康检查
```bash
curl -k -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  https://152.136.104.251/mcp/health
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

#### 测试SSE连接
```bash
curl -k -N -H "Accept: text/event-stream" \
  -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  https://152.136.104.251/mcp/sse
```

您应该能看到SSE事件流开始传输。

## 步骤3: 在Claude Code中使用

重启Claude Code后，您应该能看到 `ai-proj` 服务器出现在可用的MCP服务器列表中。

### 可用工具

连接成功后，您可以使用以下工具：

#### 任务管理
- `create_task` - 创建新任务
- `start_task` - 开始执行任务
- `complete_task` - 完成任务
- `pause_task` - 暂停任务
- `list_tasks` - 查看任务列表
- `find_task` - 搜索任务
- `update_task` - 更新任务信息
- `delete_task` - 删除任务
- `create_subtask` - 创建子任务

#### 文档管理
- `create-and-attach` - 创建并关联任务文档

### 使用示例

在Claude Code中，您可以这样使用工具：

```
请帮我创建一个新任务"实现用户登录功能"
```

Claude Code将自动调用 `create_task` 工具。

```
列出所有进行中的任务
```

Claude Code将调用 `list_tasks` 工具并过滤状态。

## 常见问题

### 问题1: 连接超时

**症状**: 无法连接到MCP服务器

**解决方案**:
1. 检查服务器是否可访问：
   ```bash
   ping 152.136.104.251
   ```

2. 检查端口是否开放：
   ```bash
   nc -zv 152.136.104.251 443
   ```

3. 检查防火墙设置

### 问题2: SSL证书错误

**症状**: SSL handshake failure

**解决方案**:
1. 使用 `-k` 参数临时忽略证书验证（仅用于测试）
2. 检查服务器SSL证书配置
3. 如果在内网，可以使用HTTP端点（不推荐用于生产）

### 问题3: 认证失败

**症状**: 401 Unauthorized

**解决方案**:
1. 确认API Key正确
2. 检查API Key是否在 `X-API-Key` header中
3. 验证API Key是否已激活且未过期

### 问题4: Access denied

**症状**: 返回 "Access denied" 消息

**可能原因**:
1. IP地址被限制
2. Nginx配置问题
3. 需要从服务器本地或内网访问

**解决方案**:
1. 检查Nginx配置中的访问控制规则
2. 尝试从服务器本地测试：
   ```bash
   ssh user@152.136.104.251
   curl http://localhost:3100/health
   ```
3. 联系系统管理员调整访问控制规则

## 服务器端诊断

如果遇到问题，可以在服务器端检查：

### 查看MCP服务日志
```bash
docker-compose -f docker-compose.prod.yml logs -f mcp-server-prod
```

### 查看Nginx日志
```bash
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### 检查容器状态
```bash
docker-compose -f docker-compose.prod.yml ps
```

### 检查服务健康状态
```bash
docker inspect ai_mcp_server_prod | grep -A 10 Health
```

## 配置选项说明

### URL配置

- **HTTPS（生产环境推荐）**: `https://152.136.104.251/mcp/sse`
  - 安全加密传输
  - 需要有效的SSL证书

- **HTTP（仅用于开发/测试）**: `http://152.136.104.251/mcp/sse`
  - 不加密传输
  - 仅在受信任网络中使用

- **本地开发**: `http://localhost:3100/sse`
  - 直接连接到MCP服务
  - 绕过Nginx
  - 需要在服务器本地运行

### Headers配置

必需的headers：
- `X-API-Key`: 服务账号API密钥
- `Accept`: `text/event-stream` (SSE连接时)

可选的headers：
- `User-Agent`: 客户端标识

## 环境变量

测试脚本支持以下环境变量：

```bash
export MCP_API_KEY="mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06"
export MCP_SERVER_URL="https://152.136.104.251"
export MCP_HTTP_SERVER_URL="http://152.136.104.251"
```

## 进阶配置

### 配置多个环境

您可以在Claude Code中配置多个MCP服务器：

```json
{
  "mcpServers": {
    "ai-proj-prod": {
      "type": "sse",
      "url": "https://152.136.104.251/mcp/sse",
      "headers": {
        "X-API-Key": "mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06"
      },
      "description": "生产环境"
    },
    "ai-proj-staging": {
      "type": "sse",
      "url": "https://staging.example.com/mcp/sse",
      "headers": {
        "X-API-Key": "your-staging-api-key"
      },
      "description": "测试环境"
    },
    "ai-proj-local": {
      "type": "sse",
      "url": "http://localhost:3100/sse",
      "description": "本地开发"
    }
  }
}
```

## 安全建议

1. **保护API Key**: 不要在公开仓库中提交包含真实API Key的配置文件
2. **使用HTTPS**: 生产环境始终使用HTTPS
3. **定期轮换密钥**: 定期更新API Key
4. **限制访问**: 配置防火墙规则限制访问来源
5. **监控使用**: 定期检查API访问日志

## 相关文档

- [完整配置指南](./REMOTE_ACCESS.md)
- [MCP协议文档](https://github.com/modelcontextprotocol/protocol)
- [故障排查指南](./REMOTE_ACCESS.md#故障排查)

## 获取帮助

如果仍然遇到问题：

1. 运行测试脚本收集诊断信息：
   ```bash
   ./test-sse-connection.sh > diagnostic.log 2>&1
   ```

2. 查看服务日志并查找错误信息

3. 联系系统管理员并提供：
   - 错误消息
   - 诊断日志
   - 您尝试的配置

---

**最后更新**: 2025-10-21
**API Key**: `mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06`
**服务器**: `152.136.104.251`
