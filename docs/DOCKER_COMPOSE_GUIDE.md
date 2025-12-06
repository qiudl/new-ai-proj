# Docker Compose 生产环境管理指南

## 概述

本项目已全面迁移到Docker Compose管理，实现了统一的容器化部署架构。所有服务（Backend、Frontend、Nginx、PostgreSQL、Redis、MCP）都通过docker-compose.prod.yml统一管理。

---

## 快速开始

### 使用管理脚本（推荐）

```bash
# 查看帮助
./scripts/docker-compose-manage.sh --help

# 查看服务状态
./scripts/docker-compose-manage.sh status

# 重启后端
./scripts/docker-compose-manage.sh restart-backend

# 查看日志
./scripts/docker-compose-manage.sh logs -f backend-prod

# 部署更新
./scripts/docker-compose-manage.sh deploy
```

### 直接使用docker-compose

```bash
# SSH到生产服务器
ssh ubuntu@152.136.104.251

# 进入项目目录
cd /opt/ai-project/current

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f backend-prod

# 重启服务
docker-compose -f docker-compose.prod.yml restart backend-prod
```

---

## 服务架构

### 服务列表

| 服务 | 容器名 | 端口 | 资源限制 | 日志大小 |
|------|--------|------|----------|----------|
| PostgreSQL | ai_postgres_prod | 127.0.0.1:5432 | 2CPU/2GB | 250MB |
| Backend | ai_backend_prod | 127.0.0.1:8080 | 2CPU/1GB | 500MB |
| Frontend | ai_frontend_prod | 127.0.0.1:3000 | 1CPU/512MB | 150MB |
| Nginx | ai_nginx | 80,443 | 1CPU/256MB | 1GB |
| Redis | ai_redis_prod | 127.0.0.1:6379 | 0.5CPU/256MB | 60MB |
| MCP Server | ai_mcp_server_prod | 0.0.0.0:3100 | 0.5CPU/256MB | 60MB |

### 网络配置

- **网络名称**: ai_prod_network
- **网段**: 172.30.0.0/16
- **类型**: bridge
- **DNS**: Docker内置DNS (127.0.0.11)

### 数据卷

- **postgres_prod_data**: PostgreSQL数据持久化
- **redis_prod_data**: Redis数据持久化

---

## 资源限制配置

### 为什么需要资源限制？

1. **防止资源耗尽**: 单个容器不会占用所有系统资源
2. **性能隔离**: 确保每个服务有保底资源
3. **稳定性**: 防止OOM (Out of Memory) 杀死容器
4. **可预测性**: 资源使用可预测和监控

### 资源限制详情

**Backend (ai_backend_prod)**:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # 最多2个CPU核心
      memory: 1024M    # 最大1GB内存
    reservations:
      cpus: '0.5'      # 保留0.5个CPU核心
      memory: 256M     # 保留256MB内存
```

**PostgreSQL (ai_postgres_prod)**:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # 最多2个CPU核心
      memory: 2048M    # 最大2GB内存
    reservations:
      cpus: '1.0'      # 保留1个CPU核心
      memory: 512M     # 保留512MB内存
```

**Frontend (ai_frontend_prod)**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # 最多1个CPU核心
      memory: 512M     # 最大512MB内存
    reservations:
      cpus: '0.25'     # 保留0.25个CPU核心
      memory: 128M     # 保留128MB内存
```

**总计**:
- **CPU limits总计**: 7.0个核心
- **内存limits总计**: 4.5GB
- **适用于**: 4核8GB或以上的服务器

---

## 日志轮转配置

### 为什么需要日志轮转？

1. **防止磁盘满**: 日志文件无限增长会占满磁盘
2. **性能优化**: 小文件读写更快
3. **管理方便**: 压缩旧日志节省空间
4. **合规要求**: 保留一定期限的日志

### 日志配置详情

**Backend**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "100m"   # 单文件最大100MB
    max-file: "5"      # 保留5个文件
    compress: "true"   # 压缩旧文件
# 总计: 500MB（压缩后约100MB）
```

**PostgreSQL**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"    # 单文件最大50MB
    max-file: "5"      # 保留5个文件
    compress: "true"   # 压缩旧文件
# 总计: 250MB（压缩后约50MB）
```

**Nginx**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "100m"   # 单文件最大100MB
    max-file: "10"     # 保留10个文件
    compress: "true"   # 压缩旧文件
# 总计: 1GB（压缩后约200MB）
```

**所有服务日志总计**: 约2GB（压缩后约500MB）

### 日志查看

```bash
# 查看实时日志
docker-compose -f docker-compose.prod.yml logs -f backend-prod

# 查看最近100行日志
docker-compose -f docker-compose.prod.yml logs --tail=100 backend-prod

# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定时间段日志
docker logs ai_backend_prod --since 2025-11-15T08:00:00

# 查看压缩的旧日志
ls -lh /var/lib/docker/containers/*/
```

---

## 管理脚本使用

### 脚本功能

`scripts/docker-compose-manage.sh` 提供以下功能：

1. **服务控制**:
   - `up` - 启动所有服务
   - `down` - 停止所有服务
   - `restart` - 重启所有服务
   - `restart-backend` - 仅重启后端
   - `restart-frontend` - 仅重启前端
   - `restart-nginx` - 仅重启Nginx

2. **监控查看**:
   - `status` - 查看服务状态和资源使用
   - `logs` - 查看日志
   - `ps` - 查看容器列表
   - `stats` - 查看实时资源统计

3. **部署操作**:
   - `deploy` - 部署更新（同步代码+重建+重启）
   - `validate` - 验证配置文件

4. **维护清理**:
   - `clean` - 清理未使用的容器和镜像

### 使用示例

```bash
# 重启后端服务
./scripts/docker-compose-manage.sh restart-backend

# 查看后端实时日志
./scripts/docker-compose-manage.sh logs -f backend-prod

# 查看所有服务状态
./scripts/docker-compose-manage.sh status

# 部署更新
./scripts/docker-compose-manage.sh deploy

# 清理未使用资源
./scripts/docker-compose-manage.sh clean
```

---

## 常见操作

### 1. 启动所有服务

```bash
# 方式1: 使用管理脚本
./scripts/docker-compose-manage.sh up

# 方式2: 直接使用docker-compose
ssh ubuntu@152.136.104.251
cd /opt/ai-project/current
docker-compose -f docker-compose.prod.yml up -d
```

### 2. 停止所有服务

```bash
# 方式1: 使用管理脚本
./scripts/docker-compose-manage.sh down

# 方式2: 直接使用docker-compose
ssh ubuntu@152.136.104.251
cd /opt/ai-project/current
docker-compose -f docker-compose.prod.yml down
```

### 3. 重启单个服务

```bash
# 后端
./scripts/docker-compose-manage.sh restart-backend

# 前端
./scripts/docker-compose-manage.sh restart-frontend

# Nginx
./scripts/docker-compose-manage.sh restart-nginx

# 或者直接使用docker-compose
docker-compose -f docker-compose.prod.yml restart backend-prod
```

### 4. 查看日志

```bash
# 实时查看后端日志
./scripts/docker-compose-manage.sh logs -f backend-prod

# 查看最近日志
docker-compose -f docker-compose.prod.yml logs --tail=100 backend-prod

# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. 查看资源使用

```bash
# 查看服务状态和资源使用
./scripts/docker-compose-manage.sh status

# 查看实时资源统计
./scripts/docker-compose-manage.sh stats

# 或者直接使用docker命令
docker stats $(docker ps --filter "name=ai_" -q)
```

### 6. 更新部署

```bash
# 使用管理脚本（推荐）
./scripts/docker-compose-manage.sh deploy

# 手动步骤
./scripts/docker-compose-manage.sh validate  # 验证配置
ssh ubuntu@152.136.104.251
cd /opt/ai-project/current
docker-compose -f docker-compose.prod.yml pull  # 拉取镜像
docker-compose -f docker-compose.prod.yml up -d --build  # 重建并启动
```

---

## 健康检查

### 配置的健康检查

所有关键服务都配置了健康检查：

**Backend**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-proxy -O- -q http://localhost:8080/health || exit 1"]
  interval: 30s      # 每30秒检查一次
  timeout: 10s       # 超时10秒
  retries: 3         # 失败3次标记为unhealthy
  start_period: 60s  # 启动后60秒开始检查
```

**PostgreSQL**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 查看健康状态

```bash
# 查看所有容器健康状态
docker ps --filter "name=ai_" --format "table {{.Names}}\t{{.Status}}"

# 查看特定容器健康检查日志
docker inspect ai_backend_prod --format='{{range .State.Health.Log}}{{.Output}}{{end}}' | tail -200

# 使用docker-compose查看
docker-compose -f docker-compose.prod.yml ps
```

---

## 故障排查

### 1. 容器无法启动

**症状**: 容器状态为 Restarting 或 Exited

**排查步骤**:
```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs backend-prod

# 查看容器退出代码
docker inspect ai_backend_prod --format='{{.State.ExitCode}}'

# 查看最近事件
docker events --since 5m --filter container=ai_backend_prod
```

**常见原因**:
- 环境变量配置错误 → 检查.env文件
- 数据库连接失败 → 检查DB_HOST和网络
- 端口冲突 → 检查端口是否被占用
- 资源不足 → 检查系统资源使用

### 2. 容器健康检查失败

**症状**: 容器状态为 Up (unhealthy)

**排查步骤**:
```bash
# 查看健康检查日志
docker inspect ai_backend_prod --format='{{range .State.Health.Log}}{{.Output}}{{end}}'

# 手动执行健康检查命令
docker exec ai_backend_prod wget --no-proxy -O- -q http://localhost:8080/health

# 检查服务是否真的在运行
docker exec ai_backend_prod ps aux
```

### 3. 服务间无法通信

**症状**: 服务A无法访问服务B

**排查步骤**:
```bash
# 检查网络连接
docker network inspect ai_prod_network

# 从一个容器ping另一个
docker exec ai_backend_prod ping -c 3 ai_postgres_prod

# 检查DNS解析
docker exec ai_nginx nslookup ai_backend_prod

# 检查端口连接
docker exec ai_nginx nc -zv ai_backend_prod 8080
```

### 4. 磁盘空间不足

**症状**: 日志显示 "No space left on device"

**解决方案**:
```bash
# 清理未使用资源
./scripts/docker-compose-manage.sh clean

# 或者手动清理
docker system prune -a -f --volumes

# 查看磁盘使用
docker system df
df -h /var/lib/docker
```

---

## 性能优化

### 1. 调整资源限制

根据实际使用情况调整资源限制：

```yaml
# 在 docker-compose.prod.yml 中调整
deploy:
  resources:
    limits:
      cpus: '3.0'      # 增加CPU限制
      memory: 2048M    # 增加内存限制
```

### 2. 优化日志配置

```yaml
# 减少日志大小
logging:
  driver: "json-file"
  options:
    max-size: "50m"    # 减小单文件大小
    max-file: "3"      # 减少文件数量
    compress: "true"
```

### 3. 数据库优化

```yaml
# PostgreSQL环境变量优化
environment:
  POSTGRES_SHARED_BUFFERS: 256MB
  POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
  POSTGRES_WORK_MEM: 16MB
```

---

## 备份与恢复

### 备份数据库

```bash
# 使用docker-compose
docker-compose -f docker-compose.prod.yml exec postgres-prod \
  pg_dump -U ${DB_USER} ${DB_NAME} > backup_$(date +%Y%m%d).sql

# 或者直接使用docker
docker exec ai_postgres_prod \
  pg_dump -U ai_project_user ai_project_db > backup.sql
```

### 恢复数据库

```bash
# 恢复备份
cat backup.sql | docker exec -i ai_postgres_prod \
  psql -U ai_project_user ai_project_db
```

### 备份数据卷

```bash
# 备份PostgreSQL数据
docker run --rm \
  --volumes-from ai_postgres_prod \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data.tar.gz /var/lib/postgresql/data
```

---

## 监控建议

### 关键指标

1. **容器健康状态**:
   ```bash
   watch -n 5 'docker ps --filter "name=ai_" --format "table {{.Names}}\t{{.Status}}"'
   ```

2. **资源使用**:
   ```bash
   ./scripts/docker-compose-manage.sh stats
   ```

3. **日志错误**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=100 | grep ERROR
   ```

4. **磁盘空间**:
   ```bash
   df -h /var/lib/docker
   docker system df
   ```

### Prometheus集成

如果使用Prometheus监控，添加以下配置：

```yaml
# docker-compose.prod.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

---

## 环境变量配置

### .env文件

在生产服务器上创建 `/opt/ai-project/current/.env`:

```bash
# 复制示例文件
cp .env.production.example .env

# 编辑实际值
vi .env
```

### 必需的环境变量

```bash
DB_USER=ai_project_user
DB_PASSWORD=secure_password_here
DB_NAME=ai_project_db
JWT_SECRET=your_jwt_secret_min_32_chars
DOMAIN_NAME=proj.joylodging.com
MCP_API_KEY=your_mcp_api_key
```

---

## 安全最佳实践

1. **端口绑定**: 大多数端口绑定到127.0.0.1，仅本地访问
2. **网络隔离**: 使用独立的Docker网络
3. **资源限制**: 防止DoS攻击消耗所有资源
4. **日志轮转**: 防止日志占满磁盘
5. **健康检查**: 自动重启不健康的容器
6. **最小权限**: 容器不以root运行（where possible）

---

## 升级流程

### 零停机升级

```bash
# 1. 同步新配置
./scripts/docker-compose-manage.sh validate

# 2. 拉取新镜像
ssh ubuntu@152.136.104.251 << 'EOF'
  cd /opt/ai-project/current
  docker-compose -f docker-compose.prod.yml pull
EOF

# 3. 滚动更新
ssh ubuntu@152.136.104.251 << 'EOF'
  cd /opt/ai-project/current
  docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend-prod
  sleep 10
  docker-compose -f docker-compose.prod.yml up -d --no-deps frontend-prod
EOF
```

---

## 相关文档

- **容器化迁移**: `backend/docs/dev-plans/session-2025-11-15-containerized-backend-migration.md`
- **部署指南**: `DEPLOYMENT_GUIDE.md`
- **故障排除**: `PRODUCTION_TROUBLESHOOTING.md`
- **部署脚本**: `scripts/deploy-to-production.sh`

---

## 总结

Docker Compose统一管理带来的优势：

✅ **统一管理** - 一个配置文件管理所有服务
✅ **资源控制** - 精确限制每个服务的资源使用
✅ **日志管理** - 自动轮转，防止磁盘占满
✅ **健康检查** - 自动监控和重启不健康容器
✅ **简化部署** - 一条命令启动/停止所有服务
✅ **环境一致** - 开发、测试、生产完全一致

---

**最后更新**: 2025-11-15
**维护者**: DevOps Team
**生产环境**: 152.136.104.251
**域名**: proj.joylodging.com
