# Docker Compose部署快速参考

**版本**: v7.0
**更新**: 2025-11-15
**模式**: 本地执行 → 远程部署

---

## 快速开始

### 完整部署
```bash
./scripts/deploy-to-production.sh --use-compose
```

### 仅部署后端
```bash
./scripts/deploy-to-production.sh --use-compose --backend-only
```

### 仅部署前端
```bash
./scripts/deploy-to-production.sh --use-compose --frontend-only
```

### 模拟运行（测试）
```bash
./scripts/deploy-to-production.sh --use-compose --dry-run
```

---

## 部署后验证

### 1. 检查容器状态
```bash
ssh ubuntu@152.136.104.251 'docker ps --filter name=ai_backend_prod'
# 期望: Up X minutes (healthy)
```

### 2. 测试健康检查
```bash
ssh ubuntu@152.136.104.251 'curl -s http://localhost:8080/health | jq .'
# 期望: {"status":"ok","service":"ai-project-backend"}
```

### 3. 测试HTTPS访问
```bash
curl -k https://proj.joylodging.com/api/v1/health
# 期望: {"status":"ok"}
```

### 4. 查看容器日志
```bash
ssh ubuntu@152.136.104.251 'docker logs ai_backend_prod --tail 50'
# 期望: 无ERROR日志
```

### 5. 检查资源使用
```bash
ssh ubuntu@152.136.104.251 'docker stats --no-stream ai_backend_prod'
# 期望: CPU < 50%, Memory < 512MB
```

---

## 常用运维命令

### Docker Compose命令（在服务器上执行）
```bash
# SSH登录到服务器
ssh ubuntu@152.136.104.251

# 切换到项目目录
cd /opt/ai-project/current

# 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f backend-prod

# 重启后端
docker compose -f docker-compose.prod.yml restart backend-prod

# 停止服务
docker compose -f docker-compose.prod.yml stop backend-prod

# 启动服务
docker compose -f docker-compose.prod.yml start backend-prod

# 查看资源使用
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### 直接Docker命令
```bash
# 查看容器状态
docker ps --filter name=ai_

# 查看日志
docker logs -f ai_backend_prod
docker logs ai_backend_prod --tail 100
docker logs ai_backend_prod --since 2025-11-15T10:00:00

# 进入容器
docker exec -it ai_backend_prod sh

# 重启容器
docker restart ai_backend_prod

# 查看容器详情
docker inspect ai_backend_prod

# 查看健康状态
docker inspect ai_backend_prod --format='{{.State.Health.Status}}'
```

---

## 故障排除

### 问题1: 部署失败 - 磁盘空间不足
**症状**: `No space left on device`

**解决方案**:
```bash
# 检查磁盘使用
ssh ubuntu@152.136.104.251 'df -h /'

# 清理Docker镜像
ssh ubuntu@152.136.104.251 'docker system prune -af --volumes'

# 清理旧releases (保留最近3个)
ssh ubuntu@152.136.104.251 'cd /opt/ai-project/releases && ls -t | tail -n +4 | xargs -r rm -rf'
```

### 问题2: 容器启动失败
**症状**: 容器状态为`Restarting`或立即退出

**排查步骤**:
```bash
# 查看容器日志
ssh ubuntu@152.136.104.251 'docker logs ai_backend_prod --tail 100'

# 检查退出代码
ssh ubuntu@152.136.104.251 'docker inspect ai_backend_prod --format="{{.State.ExitCode}}"'

# 查看容器事件
ssh ubuntu@152.136.104.251 'docker events --since 5m --filter container=ai_backend_prod'
```

### 问题3: 健康检查失败
**症状**: 容器状态为`Up (unhealthy)`

**排查步骤**:
```bash
# 查看健康检查日志
ssh ubuntu@152.136.104.251 'docker inspect ai_backend_prod --format="{{range .State.Health.Log}}{{.Output}}{{end}}" | tail -200'

# 手动执行健康检查
ssh ubuntu@152.136.104.251 'docker exec ai_backend_prod wget -O- -q --no-proxy http://localhost:8080/health'
```

### 问题4: API返回502 Bad Gateway
**症状**: Nginx无法访问后端

**排查步骤**:
```bash
# 从Nginx容器测试后端
ssh ubuntu@152.136.104.251 'docker exec ai_nginx wget -O- -q http://ai_backend_prod:8080/health'

# 检查Nginx错误日志
ssh ubuntu@152.136.104.251 'docker logs ai_nginx --tail 50 | grep error'

# 检查Nginx配置
ssh ubuntu@152.136.104.251 'docker exec ai_nginx nginx -t'
```

### 问题5: 部署锁无法释放
**症状**: 提示"另一个部署正在进行中"

**解决方案**:
```bash
# 手动释放锁（确认没有其他部署在运行）
ssh ubuntu@152.136.104.251 'rm -f /opt/ai-project/.deploy.lock'
```

---

## 快速回滚

### 使用Docker Compose回滚
```bash
ssh ubuntu@152.136.104.251 << 'EOF'
  cd /opt/ai-project/current

  # 停止当前容器
  docker compose -f docker-compose.prod.yml stop backend-prod

  # 使用之前的镜像（需提前打tag）
  docker tag ai-backend-prod:latest ai-backend-prod:current
  docker tag ai-backend-prod:previous ai-backend-prod:latest

  # 启动容器
  docker compose -f docker-compose.prod.yml up -d backend-prod
EOF
```

### 建议：部署前打标签
```bash
ssh ubuntu@152.136.104.251 << 'EOF'
  # 备份当前镜像
  docker tag ai-backend-prod:latest ai-backend-prod:backup-$(date +%Y%m%d-%H%M%S)
  docker tag ai-backend-prod:latest ai-backend-prod:previous
EOF
```

---

## 性能监控

### 实时资源使用
```bash
# 查看所有AI项目容器
ssh ubuntu@152.136.104.251 'docker stats --filter name=ai_'

# 仅查看后端
ssh ubuntu@152.136.104.251 'docker stats --no-stream ai_backend_prod'
```

### 日志大小检查
```bash
# 检查容器日志大小
ssh ubuntu@152.136.104.251 'docker inspect ai_backend_prod --format="{{.LogPath}}" | xargs ls -lh'

# 查看所有容器日志大小
ssh ubuntu@152.136.104.251 'find /var/lib/docker/containers -name "*-json.log" -ls | sort -k7 -rn | head -10'
```

---

## 环境配置

### 生产服务器信息
- **IP**: 152.136.104.251
- **用户**: ubuntu
- **项目路径**: `/opt/ai-project/current`
- **域名**: `proj.joylodging.com`

### 容器信息
| 容器名 | 服务 | 端口 | 状态 |
|--------|------|------|------|
| ai_backend_prod | 后端API | 8080 | 需healthy |
| ai_frontend_prod | 前端SPA | 80 | 需healthy |
| ai_postgres_prod | PostgreSQL主库 | 5432 | 需healthy |
| ai_nginx | Nginx反向代理 | 80/443 | 必须运行 |
| ai_redis_prod | Redis缓存 | 6379 | 需healthy |
| ai_mcp_server_prod | MCP服务 | 自定义 | 需healthy |

### 资源限制
| 服务 | CPU限制 | 内存限制 | CPU预留 | 内存预留 |
|------|---------|----------|---------|----------|
| backend-prod | 2.0 | 1024MB | 0.5 | 256MB |
| frontend-prod | 1.0 | 512MB | 0.25 | 128MB |
| postgres-prod | 2.0 | 2048MB | 1.0 | 512MB |

---

## 关键文件位置

### 本地
- 部署脚本: `./scripts/deploy-to-production.sh`
- Docker Compose配置: `./docker-compose.prod.yml`
- 后端Dockerfile: `./backend/Dockerfile`
- 前端Dockerfile: `./frontend/Dockerfile.prod`

### 生产服务器
- 项目目录: `/opt/ai-project/current` (软链接)
- 实际目录: `/opt/ai-project/releases/release_YYYYMMDD_HHMMSS`
- Docker Compose: `/opt/ai-project/current/docker-compose.prod.yml`
- 环境变量: `/opt/ai-project/current/.env`
- Nginx配置: `/home/ubuntu/apps/new-ai-proj/nginx/`

---

## 最佳实践

### 1. 定期维护
- 每周清理Docker无用镜像
- 仅保留最近3个release版本
- 监控磁盘使用率，设置80%告警

### 2. 部署前检查
- [ ] 本地代码已提交到Git
- [ ] 数据库迁移脚本已准备
- [ ] 环境变量配置正确
- [ ] 生产服务器磁盘空间充足（至少10GB可用）
- [ ] 备份了当前生产数据

### 3. 部署后验证
- [ ] 容器状态为健康
- [ ] 健康检查端点正常
- [ ] API认证正常工作
- [ ] HTTPS访问正常
- [ ] 无ERROR日志

### 4. 版本管理
```bash
# 部署前打标签
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Docker镜像打标签
docker tag ai-backend-prod:latest ai-backend-prod:v1.0.0
```

---

## 相关文档

- **完整部署指南**: `DEPLOYMENT_GUIDE.md`
- **Docker Compose详细文档**: `DOCKER_COMPOSE_GUIDE.md`
- **故障排除**: `PRODUCTION_TROUBLESHOOTING.md`
- **升级总结**: `backend/docs/dev-plans/deployment-script-v7-upgrade-summary.md`
- **会话记录**: `backend/docs/dev-plans/session-2025-11-15-production-deployment-fixes.md`

---

## 紧急联系

- **部署问题**: 查看`PRODUCTION_TROUBLESHOOTING.md`
- **容器问题**: 查看`backend/docs/dev-plans/session-2025-11-15-containerized-backend-migration.md`
- **紧急回滚**: 参考本文档"快速回滚"章节

---

**最后更新**: 2025-11-15
**部署方式**: Docker Compose (v7.0)
**推荐度**: ⭐⭐⭐⭐⭐
