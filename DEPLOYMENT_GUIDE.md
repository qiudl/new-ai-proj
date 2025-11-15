# 生产环境部署指南

## 快速开始

### Docker Compose 统一管理 (最推荐) 🆕

```bash
# 使用docker-compose管理脚本
./scripts/docker-compose-manage.sh status        # 查看状态
./scripts/docker-compose-manage.sh restart-backend  # 重启后端
./scripts/docker-compose-manage.sh logs -f       # 查看日志
./scripts/docker-compose-manage.sh deploy        # 部署更新

# 详细文档
cat DOCKER_COMPOSE_GUIDE.md
```

**优势**:
- ✅ 统一配置文件管理所有服务
- ✅ 自动资源限制（CPU、内存）
- ✅ 自动日志轮转（防止磁盘满）
- ✅ 一键启动/停止所有服务
- ✅ 健康检查和自动重启

### 使用部署脚本 (自动化)

```bash
# 使用Docker Compose部署所有服务 (最推荐) 🆕
./scripts/deploy-to-production.sh --use-compose

# 仅使用Compose部署后端
./scripts/deploy-to-production.sh --use-compose --backend-only

# 仅使用Compose部署前端
./scripts/deploy-to-production.sh --use-compose --frontend-only
```

### 单服务容器化部署 (旧方式)

```bash
# 仅部署后端 (容器化)
./scripts/deploy-to-production.sh --backend-only --use-containers

# 仅部署前端
./scripts/deploy-to-production.sh --frontend-only

# 完整部署 (容器化)
./scripts/deploy-to-production.sh --use-containers
```

### 传统宿主机部署 (已废弃)

```bash
# 仅部署后端 (宿主机)
./scripts/deploy-to-production.sh --backend-only

# 完整部署 (宿主机)
./scripts/deploy-to-production.sh
```

---

## 部署架构

### 容器化架构 (当前生产环境)

```
外网HTTPS请求 (443)
    ↓
Nginx容器 (ai_nginx:172.20.0.3)
    ├─→ /api/* → Backend容器 (ai_backend_prod:172.20.0.5)
    │              ↓
    │           PostgreSQL容器 (ai_postgres_prod:172.20.0.4)
    │
    └─→ /* → Frontend容器 (ai_frontend_prod:172.20.0.2)
```

**优势**:
- ✅ 统一架构 - 所有服务容器化
- ✅ 易于管理 - 使用docker命令统一管理
- ✅ 环境一致 - 开发、测试、生产完全一致
- ✅ 快速回滚 - 容器版本切换秒级完成
- ✅ 资源隔离 - 容器级别的资源限制

---

## 部署脚本选项

### 基本选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `--backend-only` | 仅部署后端 | `--backend-only --use-containers` |
| `--frontend-only` | 仅部署前端 | `--frontend-only` |
| `--use-containers` | 使用Docker容器部署 (推荐) | `--backend-only --use-containers` |
| `--no-build` | 跳过构建步骤 | `--backend-only --no-build` |
| `--no-restart` | 跳过服务重启 | `--backend-only --no-restart` |
| `--dry-run` | 模拟运行，不实际部署 | `--dry-run` |
| `--help` | 显示帮助信息 | `--help` |

### 组合使用

```bash
# 仅同步代码,不构建不重启 (调试用)
./scripts/deploy-to-production.sh --backend-only --no-build --no-restart

# 模拟容器化部署
./scripts/deploy-to-production.sh --backend-only --use-containers --dry-run

# 前端热更新 (不创建新release)
./scripts/deploy-to-production.sh --frontend-only
```

---

## 容器化部署详解

### 后端容器部署流程

1. **构建Docker镜像**
   ```bash
   docker build --target production -t ai-backend-prod:latest /opt/ai-project/current/backend
   ```

2. **停止旧容器**
   ```bash
   docker stop ai_backend_prod
   docker rm ai_backend_prod
   ```

3. **启动新容器**
   ```bash
   docker run -d \
     --name ai_backend_prod \
     --network ai_prod_network \
     --env-file /home/ubuntu/apps/new-ai-proj/.env \
     -e DB_HOST=ai_postgres_prod \
     -e DB_PORT=5432 \
     -e APP_ENV=production \
     -e GIN_MODE=release \
     -e HTTP_PROXY= \
     -e HTTPS_PROXY= \
     -e NO_PROXY='*' \
     -p 127.0.0.1:8080:8080 \
     --restart always \
     ai-backend-prod:latest
   ```

4. **健康检查**
   - 等待15次，每次间隔3秒
   - 检查 `/health` 端点
   - 验证容器健康状态

### 环境变量说明

| 变量 | 值 | 说明 |
|------|-----|------|
| `DB_HOST` | `ai_postgres_prod` | PostgreSQL容器名 |
| `DB_PORT` | `5432` | 数据库端口 |
| `APP_ENV` | `production` | 应用环境 |
| `GIN_MODE` | `release` | Gin框架生产模式 |
| `HTTP_PROXY` | (空) | 禁用HTTP代理 |
| `HTTPS_PROXY` | (空) | 禁用HTTPS代理 |
| `NO_PROXY` | `*` | 禁用所有代理 |

**为什么禁用代理?**
- 防止容器内healthcheck受宿主机代理环境影响
- 确保容器内网络通信正常

---

## 容器管理命令

### 查看状态

```bash
# 查看后端容器状态
ssh ubuntu@152.136.104.251 'docker ps --filter name=ai_backend_prod'

# 查看所有AI项目容器
ssh ubuntu@152.136.104.251 'docker ps --filter name=ai_'

# 查看容器健康状态
ssh ubuntu@152.136.104.251 'docker inspect ai_backend_prod --format="{{.State.Health.Status}}"'
```

### 查看日志

```bash
# 实时查看后端日志
ssh ubuntu@152.136.104.251 'docker logs -f ai_backend_prod'

# 查看最近100行日志
ssh ubuntu@152.136.104.251 'docker logs ai_backend_prod --tail 100'

# 查看特定时间段日志
ssh ubuntu@152.136.104.251 'docker logs ai_backend_prod --since 2025-11-15T08:00:00'
```

### 容器操作

```bash
# 重启容器
ssh ubuntu@152.136.104.251 'docker restart ai_backend_prod'

# 停止容器
ssh ubuntu@152.136.104.251 'docker stop ai_backend_prod'

# 启动容器
ssh ubuntu@152.136.104.251 'docker start ai_backend_prod'

# 进入容器
ssh ubuntu@152.136.104.251 'docker exec -it ai_backend_prod sh'
```

### 调试命令

```bash
# 从Nginx容器测试后端连接
ssh ubuntu@152.136.104.251 'docker exec ai_nginx wget -O- -q http://ai_backend_prod:8080/health'

# 从后端容器测试数据库连接
ssh ubuntu@152.136.104.251 'docker exec ai_backend_prod nc -zv ai_postgres_prod 5432'

# 检查容器网络
ssh ubuntu@152.136.104.251 'docker network inspect ai_prod_network'
```

---

## 部署检查清单

### 部署前检查

- [ ] 本地代码已提交到Git
- [ ] 数据库迁移脚本已准备
- [ ] 环境变量配置正确 (`.env`)
- [ ] 生产服务器磁盘空间充足 (至少10GB可用)
- [ ] 备份了当前生产数据

### 部署后验证

```bash
# 1. 检查容器状态
ssh ubuntu@152.136.104.251 'docker ps --filter name=ai_backend_prod'
# 期望: Up X minutes (healthy)

# 2. 测试健康检查
ssh ubuntu@152.136.104.251 'curl -s http://localhost:8080/health | jq .'
# 期望: {"status":"ok","service":"ai-project-backend"}

# 3. 测试API认证
ssh ubuntu@152.136.104.251 'curl -s -w "\nHTTP: %{http_code}\n" https://152.136.104.251/api/v1/tasks'
# 期望: HTTP: 401 (未授权)

# 4. 测试HTTPS访问
curl -k https://152.136.104.251/api/v1/health
# 期望: {"status":"ok"}

# 5. 检查容器日志
ssh ubuntu@152.136.104.251 'docker logs ai_backend_prod --tail 50'
# 期望: 无ERROR日志，看到"服务启动成功"
```

---

## 常见问题

### 1. 容器启动失败

**症状**: 容器状态为 `Restarting` 或立即退出

**排查步骤**:
```bash
# 查看容器日志
ssh ubuntu@152.136.104.251 'docker logs ai_backend_prod --tail 100'

# 检查容器退出代码
ssh ubuntu@152.136.104.251 'docker inspect ai_backend_prod --format="{{.State.ExitCode}}"'

# 查看最近的容器事件
ssh ubuntu@152.136.104.251 'docker events --since 5m --filter container=ai_backend_prod'
```

**常见原因**:
- 数据库连接失败 → 检查 `DB_HOST` 和网络连接
- 配置文件错误 → 检查 `.env` 文件
- 端口冲突 → 检查8080端口是否被占用

---

### 2. 健康检查失败

**症状**: 容器状态为 `Up (unhealthy)`

**排查步骤**:
```bash
# 查看健康检查日志
ssh ubuntu@152.136.104.251 'docker inspect ai_backend_prod --format="{{range .State.Health.Log}}{{.Output}}{{end}}" | tail -200'

# 手动执行健康检查
ssh ubuntu@152.136.104.251 'docker exec ai_backend_prod wget -O- -q --no-proxy http://localhost:8080/health'
```

**常见原因**:
- 代理环境变量干扰 → 确保 `HTTP_PROXY=` `NO_PROXY='*'`
- 应用启动慢 → 增加 `start_period` 时间
- 健康检查端点异常 → 检查应用日志

---

### 3. Nginx无法访问后端

**症状**: API返回502 Bad Gateway

**排查步骤**:
```bash
# 从Nginx容器测试后端
ssh ubuntu@152.136.104.251 'docker exec ai_nginx wget -O- -q http://ai_backend_prod:8080/health'

# 检查Nginx错误日志
ssh ubuntu@152.136.104.251 'docker logs ai_nginx --tail 50 | grep error'

# 检查Nginx配置
ssh ubuntu@152.136.104.251 'docker exec ai_nginx nginx -t'
```

**常见原因**:
- DNS解析失败 → 检查nginx.conf中的 `resolver 127.0.0.11`
- 容器名错误 → 确保使用 `ai_backend_prod` 而不是 `backend-prod`
- 网络不通 → 检查两个容器是否在同一网络 `ai_prod_network`

---

### 4. 部署锁无法释放

**症状**: 提示"另一个部署正在进行中"

**解决方案**:
```bash
# 手动释放锁（确认没有其他部署在运行）
ssh ubuntu@152.136.104.251 'rm -f /opt/ai-project/.deploy.lock'
```

---

## 回滚方案

### 快速回滚

如果新部署出现问题，可以快速回滚:

```bash
# 容器化部署回滚
ssh ubuntu@152.136.104.251 << 'EOF'
  # 停止当前容器
  docker stop ai_backend_prod
  docker rm ai_backend_prod

  # 使用之前的镜像
  docker run -d \
    --name ai_backend_prod \
    --network ai_prod_network \
    --env-file /home/ubuntu/apps/new-ai-proj/.env \
    -e DB_HOST=ai_postgres_prod \
    -e HTTP_PROXY= \
    -e NO_PROXY='*' \
    -p 127.0.0.1:8080:8080 \
    --restart always \
    ai-backend-prod:previous  # 使用previous标签
EOF
```

### 版本管理

建议在部署前打标签:

```bash
# 部署前备份当前镜像
ssh ubuntu@152.136.104.251 << 'EOF'
  docker tag ai-backend-prod:latest ai-backend-prod:backup-$(date +%Y%m%d-%H%M%S)
  docker tag ai-backend-prod:latest ai-backend-prod:previous
EOF
```

---

## 性能优化

### 容器资源限制

在生产环境建议添加资源限制:

```bash
docker run -d \
  --name ai_backend_prod \
  --memory="512m" \
  --memory-swap="1g" \
  --cpus="1.0" \
  --restart always \
  ai-backend-prod:latest
```

### 日志轮转

防止日志占满磁盘:

```bash
docker run -d \
  --name ai_backend_prod \
  --log-driver json-file \
  --log-opt max-size=100m \
  --log-opt max-file=5 \
  ai-backend-prod:latest
```

---

## 监控建议

### 关键指标

1. **容器健康状态**: `docker inspect ai_backend_prod --format='{{.State.Health.Status}}'`
2. **CPU使用率**: `docker stats ai_backend_prod --no-stream`
3. **内存使用**: `docker stats ai_backend_prod --no-stream`
4. **API响应时间**: 监控 `/health` 端点
5. **错误日志**: `docker logs ai_backend_prod | grep ERROR`

### 告警设置

建议设置以下告警:
- 容器状态非healthy超过2分钟
- CPU使用率持续超过80%
- 内存使用率超过90%
- API响应时间超过500ms
- 错误日志频率超过10次/分钟

---

## 相关文档

- **容器化迁移文档**: `backend/docs/dev-plans/session-2025-11-15-containerized-backend-migration.md`
- **故障排除指南**: `PRODUCTION_TROUBLESHOOTING.md`
- **API验证脚本**: `scripts/verify-production-api.sh`
- **部署脚本**: `scripts/deploy-to-production.sh`

---

## 联系与支持

- **部署问题**: 查看 `PRODUCTION_TROUBLESHOOTING.md`
- **容器问题**: 查看 `backend/docs/dev-plans/session-2025-11-15-containerized-backend-migration.md`
- **紧急回滚**: 参考本文档"回滚方案"章节

---

**最后更新**: 2025-11-15
**生产环境**: 152.136.104.251
**域名**: proj.joylodging.com
**部署模式**: Docker容器化 (推荐)
