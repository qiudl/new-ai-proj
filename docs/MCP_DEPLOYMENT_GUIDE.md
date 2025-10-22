# MCP服务部署指南

## 概述

本文档描述了如何在生产环境中部署和配置MCP (Model Context Protocol) 服务，用于与Claude Code客户端集成。

**部署日期**: 2025-10-22
**服务模式**: SSE (Server-Sent Events)
**服务器**: 152.136.104.251

## 架构

```
┌─────────────────┐
│  Claude Code    │
│    Client       │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Nginx Reverse  │
│     Proxy       │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  MCP Server     │
│  (Docker)       │
│  Port: 3100     │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Backend API    │
│  (Host Process) │
│  Port: 8080     │
└─────────────────┘
```

## 部署步骤

### 1. 准备环境

确保服务器上已安装：
- Docker & Docker Compose
- Git
- Nginx

### 2. 上传配置文件

```bash
# 本地操作
cd /path/to/project

# 上传docker-compose配置
scp docker-compose.prod.yml ubuntu@152.136.104.251:/opt/ai-project/

# 上传nginx配置（如果更新了）
scp nginx/sites/ai-project.conf ubuntu@152.136.104.251:/opt/ai-project/nginx/sites/
```

### 3. 构建MCP镜像

```bash
# SSH到服务器
ssh ubuntu@152.136.104.251

# 进入项目目录
cd /opt/ai-project

# 构建MCP服务镜像
docker compose -p ai-project -f docker-compose.prod.yml build mcp-server-prod
```

### 4. 启动MCP服务

```bash
# 使用docker-compose启动（推荐）
docker compose -p ai-project -f docker-compose.prod.yml up -d mcp-server-prod

# 或者使用docker run命令
docker run -d \
  --name ai_mcp_server_prod \
  --network ai-project_ai_prod_network \
  -p 0.0.0.0:3100:3000 \
  -e API_BASE_URL=http://172.30.0.1:8080/api/v1 \
  -e TASK_API_BASE=http://172.30.0.1:8080/api/v1 \
  -e MCP_PORT=3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e APP_ENV=production \
  -e API_KEY=mcpsk_prod_fa6daea54c87dae43e37de30d7295d27 \
  -e MCP_ENABLE_PERMISSIONS=false \
  -e MCP_STRICT_PERMISSIONS=false \
  -e MCP_DEBUG_PERMISSIONS=false \
  --restart always \
  new-ai-proj-mcp-server-prod \
  node dist/index-sse.js
```

### 5. 验证部署

```bash
# 检查容器状态
docker ps | grep mcp

# 检查容器健康状态
docker inspect ai_mcp_server_prod --format='{{.State.Health.Status}}'

# 查看日志
docker logs ai_mcp_server_prod --tail 50

# 测试健康检查
curl http://localhost:3100/health

# 测试SSE连接
curl -N http://localhost:3100/sse

# 测试公网访问
curl -k https://152.136.104.251/mcp/health
```

## 配置详解

### Docker Compose配置

位置: `/opt/ai-project/docker-compose.prod.yml`

关键配置项：

```yaml
mcp-server-prod:
  build:
    context: ./mcp-task-bridge
    dockerfile: Dockerfile.sse
  container_name: ai_mcp_server_prod
  environment:
    # API地址（访问主机上的后端）
    API_BASE_URL: http://172.30.0.1:8080/api/v1
    TASK_API_BASE: http://172.30.0.1:8080/api/v1

    # 服务端口
    MCP_PORT: 3000
    PORT: 3000

    # 环境
    NODE_ENV: production
    APP_ENV: production

    # API认证
    API_KEY: ${MCP_API_KEY:-mcpsk_prod_fa6daea54c87dae43e37de30d7295d27}

    # 权限配置
    MCP_ENABLE_PERMISSIONS: "false"
    MCP_STRICT_PERMISSIONS: "false"
    MCP_DEBUG_PERMISSIONS: "false"
  ports:
    - "0.0.0.0:3100:3000"
  networks:
    - ai_prod_network
  restart: always
```

### Nginx配置

位置: `/opt/ai-project/nginx/sites/ai-project.conf`

关键路由：

```nginx
# SSE端点 - 长连接
location /mcp/sse {
    proxy_pass http://127.0.0.1:3100/sse;
    proxy_http_version 1.1;

    # SSE必需配置
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;

    # 超时配置
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
}

# 消息端点
location /mcp/message {
    proxy_pass http://127.0.0.1:3100/message;
    proxy_http_version 1.1;
}

# 健康检查
location /mcp/health {
    proxy_pass http://127.0.0.1:3100/health;
    access_log off;
}

# Metrics监控
location /mcp/metrics {
    proxy_pass http://127.0.0.1:3100/metrics;
    access_log off;
}
```

## 服务端点

| 端点 | 用途 | URL |
|------|------|-----|
| SSE连接 | 建立实时连接 | `https://152.136.104.251/mcp/sse` |
| 消息发送 | 发送MCP消息 | `https://152.136.104.251/mcp/message` |
| 健康检查 | 服务状态 | `https://152.136.104.251/mcp/health` |
| Metrics | 监控指标 | `https://152.136.104.251/mcp/metrics` |

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| API_BASE_URL | 后端API基础地址 | http://172.30.0.1:8080/api/v1 |
| TASK_API_BASE | 任务API地址 | http://172.30.0.1:8080/api/v1 |
| MCP_PORT | MCP服务端口 | 3000 |
| NODE_ENV | Node环境 | production |
| APP_ENV | 应用环境 | production |
| API_KEY | API认证密钥 | mcpsk_prod_* |
| MCP_ENABLE_PERMISSIONS | 启用权限系统 | false |

## 常见操作

### 重启服务

```bash
# 使用docker-compose
docker compose -p ai-project -f docker-compose.prod.yml restart mcp-server-prod

# 或使用docker命令
docker restart ai_mcp_server_prod
```

### 查看日志

```bash
# 实时日志
docker logs -f ai_mcp_server_prod

# 最近50行
docker logs ai_mcp_server_prod --tail 50

# 过滤错误
docker logs ai_mcp_server_prod 2>&1 | grep -i error
```

### 更新服务

```bash
# 1. 拉取最新代码
cd /opt/ai-project
git pull

# 2. 重新构建镜像
docker compose -p ai-project -f docker-compose.prod.yml build mcp-server-prod

# 3. 重启服务
docker compose -p ai-project -f docker-compose.prod.yml up -d mcp-server-prod
```

### 重新加载Nginx配置

```bash
# 测试配置
docker exec ai_nginx nginx -t

# 重新加载
docker exec ai_nginx nginx -s reload
```

## 监控和维护

### 健康检查

MCP服务内置健康检查：

```bash
# 本地检查
curl http://localhost:3100/health

# 公网检查
curl -k https://152.136.104.251/mcp/health
```

预期响应：
```json
{
  "status": "ok",
  "service": "mcp-bridge-sse",
  "backend": "http://172.30.0.1:8080/api/v1",
  "timestamp": "2025-10-22T00:00:00.000Z"
}
```

### Prometheus Metrics

访问 `https://152.136.104.251/mcp/metrics` 获取监控指标。

关键指标：
- `process_cpu_user_seconds_total` - CPU使用时间
- `process_resident_memory_bytes` - 内存使用
- `mcp_*` - MCP特定指标（如有）

### 日志级别

默认日志级别：INFO

查看详细日志需要修改环境变量：
```yaml
environment:
  LOG_LEVEL: debug
```

## 故障排除

### 问题1: 容器无法启动

**症状**: `docker ps` 看不到容器

**检查**:
```bash
docker logs ai_mcp_server_prod
docker inspect ai_mcp_server_prod
```

**常见原因**:
- 端口冲突（3100已被占用）
- 网络问题
- 环境变量配置错误

### 问题2: SSE连接失败

**症状**: 客户端无法建立SSE连接

**检查**:
```bash
# 测试本地SSE
curl -N http://localhost:3100/sse

# 测试Nginx代理
curl -k -N https://152.136.104.251/mcp/sse

# 查看Nginx错误日志
docker exec ai_nginx tail -f /var/log/nginx/error.log
```

### 问题3: 401权限错误

**症状**: 日志显示 `HTTP 401` 错误

**说明**: 这是权限刷新失败，不影响核心功能

**解决方案**:
1. 检查API_KEY配置
2. 确保后端服务正常运行
3. 验证后端认证配置

### 问题4: 后端连接失败

**症状**: 日志显示无法连接到后端

**检查**:
```bash
# 检查后端服务
curl http://172.30.0.1:8080/api/v1/health

# 检查网络连通性
docker exec ai_mcp_server_prod ping 172.30.0.1
```

## 安全考虑

1. **API Key**: 定期更换API密钥
2. **HTTPS**: 所有公网访问强制HTTPS
3. **端口**: MCP端口仅绑定到0.0.0.0（通过Nginx代理）
4. **日志**: 不记录敏感信息

## 性能优化

1. **连接池**: SSE连接数限制（如需要）
2. **缓存**: 适当配置响应缓存
3. **日志轮转**: 限制日志文件大小

当前配置：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "5m"
    max-file: "3"
```

## 备份和恢复

### 备份配置

```bash
# 备份docker-compose配置
cp /opt/ai-project/docker-compose.prod.yml \
   /opt/ai-project/backup/docker-compose.prod.yml.$(date +%Y%m%d)

# 备份nginx配置
cp /opt/ai-project/nginx/sites/ai-project.conf \
   /opt/ai-project/backup/ai-project.conf.$(date +%Y%m%d)
```

### 恢复服务

```bash
# 1. 恢复配置
cp /opt/ai-project/backup/docker-compose.prod.yml.YYYYMMDD \
   /opt/ai-project/docker-compose.prod.yml

# 2. 重新部署
docker compose -p ai-project -f docker-compose.prod.yml up -d mcp-server-prod
```

## 附录

### A. 完整的测试脚本

参见: `/tmp/test-mcp-complete.js`

### B. 网络拓扑

- Docker网络: `ai-project_ai_prod_network`
- 子网: `172.30.0.0/16`
- 网关: `172.30.0.1`

### C. 相关文档

- [MCP协议规范](https://modelcontextprotocol.io/)
- [Claude Code文档](https://docs.claude.com/claude-code)
- [SSE规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## 变更历史

| 日期 | 版本 | 变更 |
|------|------|------|
| 2025-10-22 | 1.0.0 | 初始部署 |
| 2025-10-22 | 1.0.1 | 修复Nginx http2警告 |
| 2025-10-22 | 1.0.2 | 优化docker-compose配置 |

---

**维护人员**: DevOps Team
**紧急联系**: [email/slack]
**最后更新**: 2025-10-22
