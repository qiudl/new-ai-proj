# GitHub Actions CI/CD + Docker + Nginx 部署指南

## 项目概述

本项目实现了现代化的 CI/CD 流水线，使用 GitHub Actions 进行持续集成和部署，Docker 进行容器化，Nginx 作为反向代理。

### 技术栈
- **前端**: React 18 + TypeScript + Ant Design
- **后端**: Go 1.23 + Gin + PostgreSQL
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (生产环境优化配置)
- **CI/CD**: GitHub Actions
- **服务器**: 腾讯云 Ubuntu 152.136.104.251

## 快速开始

### 1. 本地开发环境

#### 启动开发环境
```bash
# 启动开发服务
./scripts/deploy-local.sh dev

# 或者手动使用 Docker Compose
docker-compose -f docker-compose.dev.yml up -d
```

#### 开发环境 URL
- 前端: http://localhost:3001
- 后端 API: http://localhost:8081/api/v1
- 后端健康检查: http://localhost:8081/health
- MCP 服务器: http://localhost:3100
- 数据库: localhost:5433 (PostgreSQL)

#### 停止开发环境
```bash
./scripts/deploy-local.sh clean
```

### 2. 生产部署

#### 本地生产测试
```bash
# 构建并启动生产环境
./scripts/deploy-local.sh prod

# 强制重新构建
./scripts/deploy-local.sh prod --force
```

#### 服务器生产部署 (通过 GitHub Actions)
1. 推送代码到 `main` 分支
2. GitHub Actions 自动触发部署流程
3. 自动构建、测试、部署到服务器

## GitHub Actions CI/CD 流程

### 1. 开发环境 CI (dev-ci.yml)

**触发条件**:
- Pull Request 到 `develop` 或 `main` 分支
- 推送到 `feature/*` 或 `develop` 分支

**执行步骤**:
1. **前端检查**
   - 代码质量检查 (ESLint)
   - 代码格式检查 (Prettier)
   - TypeScript 类型检查
   - 单元测试 + 覆盖率报告
   - 构建验证

2. **后端检查**
   - Go 代码质量检查 (go vet, go fmt, staticcheck)
   - 单元测试 + 覆盖率报告
   - 构建验证

3. **集成测试**
   - Docker 环境测试
   - 端到端集成测试

4. **安全扫描**
   - Trivy 漏洞扫描

5. **Docker 构建测试**
   - 验证所有 Dockerfile 能正常构建

### 2. 生产部署 (deploy-prod.yml)

**触发条件**:
- 推送到 `main` 分支
- 推送 `v*` 标签
- 手动触发 (workflow_dispatch)

**执行步骤**:
1. **构建和测试阶段**
   - 生成版本信息
   - 构建前端生产包
   - 构建后端可执行文件
   - 创建部署包

2. **部署阶段**
   - 系统预检查 (磁盘空间、内存、当前服务状态)
   - 创建部署目录结构
   - 上传部署包到服务器
   - 解压和配置应用
   - 更新 Docker Compose 配置
   - 重启服务

3. **验证阶段**
   - 服务健康检查
   - 自动回滚机制 (如果健康检查失败)
   - 清理旧版本 (保留最近 5 个版本)

4. **部署后任务**
   - 外部连接测试
   - GitHub Release 创建 (如果是标签推送)

## 配置说明

### 1. GitHub Secrets 配置

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中配置:

```
SSH_PRIVATE_KEY          # 服务器 SSH 私钥
SLACK_WEBHOOK_URL        # Slack 通知 (可选)
```

#### 生成并配置 SSH 密钥

```bash
# 在本地生成密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions@new-ai-proj" -f ~/.ssh/github_deploy_key

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/github_deploy_key.pub ubuntu@152.136.104.251

# 将私钥内容复制到 GitHub Secrets
cat ~/.ssh/github_deploy_key
```

### 2. 服务器环境准备

#### 安装 Docker 和 Docker Compose
```bash
# 连接到服务器
ssh ubuntu@152.136.104.251

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# 安装 Docker Compose
sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用 docker 组权限
exit
ssh ubuntu@152.136.104.251
```

#### 创建应用目录结构
```bash
sudo mkdir -p /home/ubuntu/apps/new-ai-proj/{releases,shared,logs}
sudo chown -R ubuntu:ubuntu /home/ubuntu/apps
mkdir -p /home/ubuntu/apps/new-ai-proj/shared/{config,logs,uploads}
```

#### 配置生产环境变量
```bash
# 复制并编辑生产环境配置
cp /path/to/.env.prod /home/ubuntu/apps/new-ai-proj/shared/config/.env.production

# 设置适当的权限
chmod 600 /home/ubuntu/apps/new-ai-proj/shared/config/.env.production
```

### 3. Nginx 配置

生产环境使用优化的 Nginx 配置 (`nginx/production.conf`):

**关键特性**:
- 反向代理到前端和后端容器
- 静态资源缓存优化
- API 请求速率限制
- WebSocket 支持
- 安全头设置
- SPA 路由支持
- 健康检查端点
- 详细的访问和错误日志

**端口映射**:
- Nginx: 80 (HTTP), 443 (HTTPS - 待配置)
- 后端容器内部: 8080
- 前端容器内部: 80

## 监控和维护

### 1. 健康检查

```bash
# 检查所有服务状态
./scripts/deploy-local.sh status

# 查看特定服务日志
./scripts/deploy-local.sh logs backend
./scripts/deploy-local.sh logs frontend
./scripts/deploy-local.sh logs nginx

# 服务器上的健康检查
curl http://152.136.104.251/health
curl http://152.136.104.251/api/v1/health
```

### 2. 备份和恢复

```bash
# 创建备份
./scripts/deploy-local.sh backup

# 数据库备份 (在服务器上)
docker exec -t $(docker ps -qf name=postgres) pg_dump -U ai_prod_user ai_project_prod > backup.sql
```

### 3. 日志管理

**本地查看日志**:
```bash
# 查看所有容器日志
docker-compose logs -f

# 查看特定服务日志
docker logs -f ai_backend_prod
docker logs -f ai_frontend_prod
docker logs -f ai_nginx
```

**服务器日志位置**:
- 应用日志: `/home/ubuntu/apps/new-ai-proj/shared/logs/`
- Nginx 日志: `/var/log/nginx/new-ai-proj.*.log`
- Docker 日志: `docker logs <container_name>`

### 4. 性能监控

```bash
# 查看容器资源使用
docker stats

# 系统资源监控
htop
df -h
free -h

# Nginx 状态 (仅本地访问)
curl http://localhost/nginx_status
```

## 故障排除

### 1. 常见问题

#### 部署失败
```bash
# 检查 GitHub Actions 日志
# 查看服务器上的容器状态
docker ps -a
docker-compose logs

# 手动回滚
cd /home/ubuntu/apps/new-ai-proj
ln -sfn $(readlink previous) current
docker-compose up -d
```

#### 服务无响应
```bash
# 重启服务
docker-compose restart backend-prod
docker-compose restart frontend-prod
docker-compose restart nginx

# 查看详细错误
docker logs --details backend-prod
```

#### 数据库连接问题
```bash
# 检查数据库容器
docker ps | grep postgres
docker logs postgres-prod

# 测试数据库连接
docker exec -it postgres-prod psql -U ai_prod_user -d ai_project_prod
```

### 2. 调试模式

```bash
# 启用详细日志
./scripts/deploy-local.sh prod --verbose

# 查看调试信息 (仅服务器本地)
curl http://localhost/debug
```

### 3. 紧急操作

#### 快速回滚
```bash
# 服务器上执行
cd /home/ubuntu/apps/new-ai-proj
./current/scripts/rollback.sh previous
```

#### 强制重新部署
```bash
# 在 GitHub Actions 中手动触发
# 或者本地强制部署
./scripts/deploy-local.sh prod --force
```

## 安全配置

### 1. 防火墙设置
```bash
# UFW 防火墙配置
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL 证书 (待配置)
```bash
# 使用 Let's Encrypt (示例)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 152.136.104.251
```

### 3. 定期维护任务

```bash
# 添加到 crontab
# 每日凌晨 2 点清理 Docker
0 2 * * * docker system prune -f

# 每周备份数据库
0 3 * * 0 docker exec postgres-prod pg_dump -U ai_prod_user ai_project_prod > /home/ubuntu/backups/weekly-$(date +\%Y\%m\%d).sql
```

## 开发工作流

### 1. 功能开发流程
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发和测试
./scripts/deploy-local.sh dev
# 进行开发...

# 3. 提交代码
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 4. 创建 Pull Request
# GitHub 自动运行 CI 检查

# 5. 合并到 develop
git checkout develop
git merge feature/new-feature

# 6. 部署到生产 (合并到 main)
git checkout main
git merge develop
git push origin main
# GitHub Actions 自动部署
```

### 2. 代码质量检查

```bash
# 本地运行所有检查
./scripts/deploy-local.sh test

# 单独运行检查
cd frontend && npm run lint
cd frontend && npm run type-check
cd backend && go vet ./...
cd backend && go test ./...
```

---

## 总结

这个 CI/CD 系统提供了:

✅ **自动化构建和测试**  
✅ **零停机部署**  
✅ **自动回滚机制**  
✅ **完整的监控和日志**  
✅ **安全的生产环境配置**  
✅ **简化的开发工作流**  

通过 GitHub Actions + Docker + Nginx 的组合，实现了从代码提交到生产部署的全自动化流程，大大提高了开发效率和部署可靠性。