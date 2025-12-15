# Dev.sh 脚本使用指南 v2.0

## 📋 概述

`dev.sh` 脚本是AI项目的统一开发环境管理工具，支持两种运行模式：

- **Docker模式** (推荐) - 使用Docker Compose运行完整的本地开发环境
- **Legacy模式** (备选) - 通过SSH隧道连接远程数据库 + 本地运行服务

## 🚀 快速开始

### Docker模式（推荐）

```bash
# 启动完整开发环境（数据库+后端+前端）
./scripts/dev.sh docker

# 或者简化命令（自动检测Docker）
./scripts/dev.sh

# 仅启动后端
./scripts/dev.sh docker backend

# 仅启动前端
./scripts/dev.sh docker frontend

# 查看状态
./scripts/dev.sh docker status

# 停止所有服务
./scripts/dev.sh docker stop

# 重启服务
./scripts/dev.sh docker restart
```

### Legacy模式

```bash
# 启动完整开发环境（SSH隧道+本地运行）
./scripts/dev.sh legacy

# 仅启动后端（需要隧道）
./scripts/dev.sh legacy backend

# 仅启动前端
./scripts/dev.sh legacy frontend

# 查看状态
./scripts/dev.sh legacy status

# 停止所有服务
./scripts/dev.sh legacy stop
```

## 📊 两种模式对比

| 特性 | Docker模式 | Legacy模式 |
|------|-----------|-----------|
| 数据库 | 本地Docker容器 | 远程生产数据库（SSH隧道） |
| 后端运行 | Docker容器 | 本地进程 |
| 前端运行 | Docker容器 | 本地进程 |
| 环境隔离 | ✅ 完全隔离 | ❌ 依赖本机环境 |
| 启动速度 | 中等（首次较慢） | 快（依赖网络） |
| 数据安全 | ✅ 本地测试数据 | ⚠️ 使用生产数据 |
| 网络依赖 | ❌ 无需外网 | ✅ 需要SSH连接 |
| 适用场景 | 日常开发、测试 | 需要生产数据调试 |

## 🎯 使用场景

### 什么时候使用Docker模式？

✅ **日常开发** - 功能开发、Bug修复
✅ **单元测试** - 运行测试套件
✅ **数据库迁移测试** - 测试迁移脚本
✅ **新功能开发** - 不污染生产数据
✅ **多人协作** - 环境一致性

### 什么时候使用Legacy模式？

✅ **生产数据调试** - 需要查看真实数据
✅ **数据迁移** - 执行生产数据迁移
✅ **性能测试** - 使用真实数据量测试
✅ **快速验证** - 已有环境快速启动
⚠️ **注意：慎重操作生产数据**

## 🔧 命令详解

### 通用命令格式

```bash
./scripts/dev.sh [模式] [命令]
```

### 模式选项

- `docker` - 强制使用Docker模式
- `legacy` - 强制使用Legacy模式
- `auto` - 自动检测（默认，有Docker优先使用Docker）

### 命令选项

- `backend` - 仅启动后端服务
- `frontend` - 仅启动前端服务
- `both` - 启动后端和前端（默认）
- `stop` - 停止所有服务
- `restart` - 重启所有服务
- `status` - 查看服务状态
- `help` - 显示帮助信息

## 📦 Docker模式详解

### 服务架构

Docker模式会启动以下服务：

```
┌─────────────────────────────────────┐
│  postgres-master (PostgreSQL 16)    │  → localhost:5433
├─────────────────────────────────────┤
│  backend (Go + Gin)                 │  → localhost:8080
├─────────────────────────────────────┤
│  frontend (React + TypeScript)      │  → localhost:3000
├─────────────────────────────────────┤
│  redis (Redis 7)                    │  → localhost:6379
├─────────────────────────────────────┤
│  mcp-server (Node.js)               │  → localhost:3100
└─────────────────────────────────────┘
```

### 常用Docker命令

```bash
# 查看所有服务日志
docker compose -f docker-compose.dev.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend

# 进入后端容器
docker exec -it ai_backend sh

# 进入数据库容器
docker exec -it ai_postgres_master psql -U dev_user -d ai_project_db

# 重建容器（代码更改需要重建）
docker compose -f docker-compose.dev.yml up -d --build backend

# 清理所有数据（危险操作！）
docker compose -f docker-compose.dev.yml down -v

# 查看容器状态
docker compose -f docker-compose.dev.yml ps
```

### 数据库访问

**Docker模式数据库连接信息：**

```
Host:     localhost
Port:     5433
Database: ai_project_db
User:     dev_user
Password: dev_password_2024
```

**使用psql连接：**

```bash
psql -h localhost -p 5433 -U dev_user -d ai_project_db
```

**使用DBeaver/TablePlus等工具：**

- Host: `localhost`
- Port: `5433`
- Database: `ai_project_db`
- Username: `dev_user`
- Password: `dev_password_2024`

### 故障排查

#### 端口占用

```bash
# 检查端口占用
lsof -i :8080  # 后端
lsof -i :3000  # 前端
lsof -i :5433  # 数据库

# 停止占用进程
./scripts/dev.sh docker stop
```

#### 容器启动失败

```bash
# 查看详细日志
docker compose -f docker-compose.dev.yml logs backend

# 重建容器
docker compose -f docker-compose.dev.yml up -d --build

# 完全重置
docker compose -f docker-compose.dev.yml down -v
./scripts/dev.sh docker
```

#### 数据库连接失败

```bash
# 检查数据库容器状态
docker exec ai_postgres_master pg_isready -U dev_user

# 重启数据库
docker compose -f docker-compose.dev.yml restart postgres-master

# 查看数据库日志
docker compose -f docker-compose.dev.yml logs postgres-master
```

## 🔌 Legacy模式详解

### SSH隧道

Legacy模式使用SSH隧道连接远程生产数据库：

```
本地 :5433 ←→ SSH隧道 ←→ 远程服务器 :5432
```

### 隧道管理

```bash
# 手动管理隧道
./scripts/tunnel.sh start   # 启动隧道
./scripts/tunnel.sh stop    # 停止隧道
./scripts/tunnel.sh status  # 查看状态
./scripts/tunnel.sh check   # 健康检查
```

### 环境变量

Legacy模式需要配置环境变量：

```bash
# 创建配置文件
cp scripts/.ai-proj-tunnel.env.example ~/.ai-proj-tunnel.env

# 编辑配置
vim ~/.ai-proj-tunnel.env

# 设置数据库密码
export DB_PASSWORD="your_password"
```

### 本地服务管理

Legacy模式的服务以本地进程运行：

```bash
# 查看进程
ps aux | grep backend
ps aux | grep "npm start"

# 查看日志
tail -f /tmp/ai-proj-backend.log
tail -f /tmp/ai-proj-frontend.log

# 手动停止
kill $(cat /tmp/ai-proj-backend.pid)
kill $(cat /tmp/ai-proj-frontend.pid)
```

## 🔄 模式切换

### 从Legacy切换到Docker

```bash
# 1. 停止Legacy模式
./scripts/dev.sh legacy stop

# 2. 启动Docker模式
./scripts/dev.sh docker
```

### 从Docker切换到Legacy

```bash
# 1. 停止Docker模式
./scripts/dev.sh docker stop

# 2. 启动Legacy模式
./scripts/dev.sh legacy
```

## 📝 最佳实践

### 开发流程建议

1. **日常开发** → 使用Docker模式
2. **需要生产数据** → 临时切换到Legacy模式
3. **功能开发完成** → 在Docker模式下测试
4. **提交代码前** → 运行测试确保通过

### 数据管理

**Docker模式：**
- 数据持久化在Docker volume中
- 可以安全清理和重建：`docker compose down -v`
- 测试数据隔离，不影响生产

**Legacy模式：**
- 直接操作生产数据库
- ⚠️ 谨慎执行删除/更新操作
- 建议只读操作，修改需要确认

### 性能优化

**Docker模式：**
```bash
# 清理未使用的镜像和容器
docker system prune -a

# 查看资源占用
docker stats

# 调整资源限制（编辑docker-compose.dev.yml）
```

**Legacy模式：**
```bash
# 使用go run而非编译（开发时）
cd backend && go run main.go

# 或使用air热重载
cd backend && air
```

## 🆘 常见问题

### Q: Docker模式启动很慢？

**A:** 首次启动需要下载镜像，后续启动会快很多。可以使用：
```bash
docker compose -f docker-compose.dev.yml pull
```
提前拉取镜像。

### Q: 修改代码后没有生效？

**A:**
- **前端**：Docker模式支持热重载，保存即生效
- **后端**：需要重启容器：
  ```bash
  docker compose -f docker-compose.dev.yml restart backend
  ```

### Q: 数据库数据丢失了？

**A:** Docker模式数据在volume中：
```bash
# 查看volume
docker volume ls | grep postgres

# 不要使用 -v 参数停止
docker compose -f docker-compose.dev.yml down  # ✅ 保留数据
docker compose -f docker-compose.dev.yml down -v  # ❌ 删除数据
```

### Q: Legacy模式SSH隧道连接失败？

**A:** 检查以下几点：
1. 网络连接：`ping <your-server-ip>`
2. SSH密钥：`ssh ubuntu@<your-server-ip>`
3. 端口占用：`lsof -i :5433`
4. 查看日志：`tail -f /tmp/ai-proj-tunnel.log`
5. 确保已配置：`~/.ai-proj-tunnel.env`

### Q: 能同时运行两种模式吗？

**A:** ❌ 不建议，因为端口会冲突（8080, 3000）。如果确实需要，可以修改端口配置。

## 📚 相关文档

- [Docker Compose配置](../docker-compose.dev.yml)
- [隧道脚本说明](./tunnel.sh)
- [项目开发指南](../CLAUDE.md)
- [CI/CD部署文档](../.github/workflows/deploy-cicd.yml)

## 🔗 快速链接

### 服务访问

- **后端API**: http://localhost:8080
- **Swagger文档**: http://localhost:8080/docs
- **前端界面**: http://localhost:3000
- **健康检查**: http://localhost:8080/health

### 管理命令

```bash
# 快捷启动（推荐）
./scripts/dev.sh

# 查看状态
./scripts/dev.sh status

# 停止服务
./scripts/dev.sh stop

# 查看帮助
./scripts/dev.sh help
```

---

**版本**: v2.0
**更新时间**: 2025-11-19
**维护者**: AI Project Team
