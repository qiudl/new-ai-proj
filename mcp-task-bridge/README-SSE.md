# MCP Task Bridge - SSE模式远程访问

AI项目管理系统的MCP (Model Context Protocol) 服务器，支持SSE (Server-Sent Events) 模式的远程访问。

## 📑 目录

- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [系统架构](#系统架构)
- [文档索引](#文档索引)
- [工具脚本](#工具脚本)
- [部署指南](#部署指南)
- [使用示例](#使用示例)
- [故障排查](#故障排查)
- [贡献指南](#贡献指南)

## 🚀 快速开始

### 1. 客户端配置（5分钟）

编辑Claude Code配置文件 `~/.config/claude/mcp-servers.json`:

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

或复制示例配置：
```bash
cp claude-code-config.example.json ~/.config/claude/mcp-servers.json
```

### 2. 测试连接

```bash
# 使用Python测试脚本
python3 test-mcp-sse.py

# 或使用Bash脚本
./test-sse-connection.sh
```

### 3. 开始使用

重启Claude Code，MCP服务器将自动连接，您可以开始使用任务管理工具！

详细步骤请参考：[QUICKSTART.md](./QUICKSTART.md)

## ✨ 功能特性

### MCP服务器特性

- ✅ **SSE长连接**: 支持Server-Sent Events协议，实时通信
- ✅ **多客户端支持**: 同时支持多个Claude Code客户端连接
- ✅ **Session管理**: 自动管理客户端会话
- ✅ **API认证**: 基于X-API-Key的安全认证
- ✅ **健康检查**: 提供健康检查端点便于监控
- ✅ **CORS支持**: 允许跨域访问

### 可用工具

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

> 完整工具列表请参考 [QUICKSTART.md](./QUICKSTART.md#可用工具)

## 🏗️ 系统架构

```
┌─────────────────┐
│ Claude Code     │  远程客户端
│ 客户端          │
└────────┬────────┘
         │ HTTPS
         │ (X-API-Key)
         ↓
┌─────────────────┐
│ Nginx           │  反向代理
│ (SSL终止)       │  端口: 443
└────────┬────────┘
         │ HTTP
         │ (内网)
         ↓
┌─────────────────┐
│ MCP SSE服务     │  Node.js + Express
│ (Docker容器)    │  端口: 3100 (主机) → 3000 (容器)
└────────┬────────┘
         │ HTTP
         │ (Docker网络)
         ↓
┌─────────────────┐
│ 后端API         │  Go + Gin
│ (Docker容器)    │  端口: 8080
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ PostgreSQL      │  数据库
│ (Docker容器)    │  端口: 5432
└─────────────────┘
```

## 📚 文档索引

### 用户文档

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [QUICKSTART.md](./QUICKSTART.md) | 快速入门指南，5分钟配置完成 | 所有用户 |
| [REMOTE_ACCESS.md](./REMOTE_ACCESS.md) | 详细的远程访问配置文档 | 系统管理员 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 故障排查指南 | 所有用户 |

### 配置文件

| 文件 | 描述 |
|------|------|
| [claude-code-config.example.json](./claude-code-config.example.json) | Claude Code客户端配置示例 |
| [.env.production](./.env.production) | MCP服务生产环境配置 |
| [Dockerfile.sse](./Dockerfile.sse) | SSE模式Docker镜像构建文件 |

## 🛠️ 工具脚本

### 客户端测试工具

| 脚本 | 语言 | 功能 | 使用方法 |
|------|------|------|----------|
| [test-mcp-sse.py](./test-mcp-sse.py) | Python | 完整的MCP连接测试工具 | `python3 test-mcp-sse.py` |
| [test-sse-connection.sh](./test-sse-connection.sh) | Bash | SSE连接和健康检查测试 | `./test-sse-connection.sh` |

**功能对比**:

| 功能 | Python脚本 | Bash脚本 |
|------|-----------|----------|
| 健康检查 | ✅ | ✅ |
| SSE连接测试 | ✅ | ✅ |
| 网络诊断 | ✅ | ✅ |
| 彩色输出 | ✅ | ✅ |
| 结果汇总 | ✅ | ❌ |
| 端口扫描 | ✅ | ✅ |
| SSL证书检查 | ✅ | ✅ |

### 服务器端工具

| 脚本 | 功能 | 使用方法 |
|------|------|----------|
| [diagnose-mcp.sh](./diagnose-mcp.sh) | 服务器端全面诊断工具 | `./diagnose-mcp.sh` |
| [deploy-mcp.sh](./deploy-mcp.sh) | MCP服务部署和管理工具 | `./deploy-mcp.sh <命令>` |

**diagnose-mcp.sh** 检查项目：
- ✅ 系统信息和运行时长
- ✅ Docker服务状态
- ✅ MCP容器状态和健康检查
- ✅ 端口监听状态（3000, 3100, 80, 443, 8080）
- ✅ 本地连接测试
- ✅ Nginx配置验证
- ✅ 防火墙规则
- ✅ SSL证书有效期
- ✅ 容器日志和资源使用
- ✅ 环境变量
- ✅ 外部访问测试

**deploy-mcp.sh** 支持的命令：
```bash
./deploy-mcp.sh deploy    # 部署MCP服务
./deploy-mcp.sh start     # 启动服务
./deploy-mcp.sh stop      # 停止服务
./deploy-mcp.sh restart   # 重启服务
./deploy-mcp.sh rebuild   # 重新构建
./deploy-mcp.sh logs      # 查看日志
./deploy-mcp.sh status    # 查看状态
./deploy-mcp.sh health    # 健康检查
```

## 🚀 部署指南

### 服务器端部署

#### 方法1: 使用部署脚本（推荐）

```bash
# 部署MCP服务
./deploy-mcp.sh deploy

# 查看服务状态
./deploy-mcp.sh status

# 检查健康状态
./deploy-mcp.sh health
```

#### 方法2: 手动部署

```bash
# 进入项目目录
cd /path/to/new-ai-proj

# 停止现有服务
docker-compose -f docker-compose.prod.yml stop mcp-server-prod

# 重新构建
docker-compose -f docker-compose.prod.yml build mcp-server-prod

# 启动服务
docker-compose -f docker-compose.prod.yml up -d mcp-server-prod

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f mcp-server-prod
```

### 环境变量

关键环境变量（在docker-compose.prod.yml中配置）：

```yaml
environment:
  # API基础地址
  TASK_API_BASE: http://backend-prod:8080/api/v1
  # SSE服务端口
  MCP_PORT: 3000
  # 环境
  NODE_ENV: production
  # 权限系统（建议禁用以简化远程访问）
  MCP_ENABLE_PERMISSIONS: "false"
```

## 💡 使用示例

### 在Claude Code中使用

连接成功后，您可以在Claude Code中直接使用自然语言：

```
你：请帮我创建一个新任务"实现用户登录功能"

Claude: 我来帮您创建任务...
[调用create_task工具]
✅ 任务已创建：#123 - 实现用户登录功能
```

```
你：列出所有进行中的任务

Claude: 让我查看进行中的任务...
[调用list_tasks工具]
找到3个进行中的任务：
1. #123 - 实现用户登录功能
2. #124 - 修复导航栏bug
3. #125 - 优化数据库查询
```

### 使用curl直接测试

```bash
# 健康检查
curl -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  https://152.136.104.251/mcp/health

# SSE连接
curl -N -H "Accept: text/event-stream" \
  -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  https://152.136.104.251/mcp/sse
```

## 🔧 故障排查

### 快速诊断

```bash
# 客户端测试
python3 test-mcp-sse.py

# 服务器端诊断
./diagnose-mcp.sh
```

### 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| Connection timeout | 防火墙或网络问题 | 检查防火墙规则，开放443端口 |
| SSL handshake failure | SSL证书问题 | 临时使用`-k`忽略证书或重新配置证书 |
| 401 Unauthorized | API Key错误 | 验证API Key是否正确 |
| Access denied | 网络限制 | 从服务器本地或内网测试 |
| SSE连接断开 | 超时设置 | 检查Nginx超时配置 |

详细故障排查请参考：[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 📊 监控和维护

### 日志位置

```bash
# MCP服务日志
docker logs ai_mcp_server_prod

# Nginx访问日志
tail -f ./logs/nginx/access.log | grep '/mcp/'

# Nginx错误日志
tail -f ./logs/nginx/error.log
```

### 健康检查

```bash
# 本地检查
curl http://localhost:3100/health

# 远程检查
curl https://152.136.104.251/mcp/health
```

### 性能监控

```bash
# 资源使用
docker stats ai_mcp_server_prod

# 连接数
netstat -an | grep :3100 | wc -l
```

## 🔐 安全建议

1. **保护API Key**: 不要在公开仓库中提交真实的API Key
2. **使用HTTPS**: 生产环境始终使用HTTPS
3. **定期轮换密钥**: 定期更新API Key
4. **限制访问**: 配置防火墙规则限制访问来源
5. **监控日志**: 定期检查访问日志，发现异常访问

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

### 开发环境设置

```bash
# 克隆仓库
git clone <repository-url>
cd mcp-task-bridge

# 安装依赖
npm install

# 编译TypeScript
npm run build

# 运行测试
npm test
```

### 提交规范

提交消息格式：
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型（type）：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具相关

## 📝 版本历史

### v1.1.0 (2025-10-21)
- ✨ 添加SSE模式支持
- ✨ 添加API Key认证
- 📝 完善文档和测试工具
- 🐛 修复多项已知问题

### v1.0.0 (2025-10-15)
- 🎉 初始版本发布
- ✨ 基础MCP功能
- ✨ 任务管理工具

## 📞 获取帮助

- **文档**: 查看 [docs](./docs) 目录
- **问题**: 提交 [Issue](https://github.com/qiudl/new-ai-proj/issues)
- **讨论**: 参与 [Discussions](https://github.com/qiudl/new-ai-proj/discussions)

## 📄 许可证

[MIT License](../LICENSE)

---

**服务器**: 152.136.104.251
**API Key**: `mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06`
**最后更新**: 2025-10-21

---

Made with ❤️ by AI项目管理系统团队
