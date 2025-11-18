# GitHub Actions CI/CD 部署指南

本文档提供使用 GitHub Actions 进行自动化部署的完整指南。

## 目录

1. [系统架构](#系统架构)
2. [前置准备](#前置准备)
3. [快速开始](#快速开始)
4. [部署流程](#部署流程)
5. [回滚操作](#回滚操作)
6. [监控和日志](#监控和日志)
7. [故障排查](#故障排查)
8. [最佳实践](#最佳实践)

---

## 系统架构

### 目录结构

```
/opt/ai-project-cicd/          # CI/CD 部署根目录
├── current/                    # 当前运行版本（软链接）
│   ├── backend/
│   ├── frontend/
│   ├── config/
│   └── docker-compose.yml
│
├── releases/                   # 历史版本目录
│   ├── release-20251118-001/
│   ├── release-20251118-002/
│   └── release-YYYYMMDD-HHM/
│
├── backups/                    # 备份目录
│   └── backup-YYYYMMDD-HHMMSS/
│       ├── release/
│       ├── env/
│       ├── docker-info.txt
│       ├── database-*.sql.gz
│       └── metadata.txt
│
├── shared/                     # 共享配置和数据
│   ├── env/
│   │   ├── .env
│   │   ├── docker-compose.prod.yml
│   │   └── nginx.conf
│   ├── logs/
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── postgres/
│   │   ├── nginx/
│   │   └── rollback.log
│   └── data/
│       ├── backend/
│       └── uploads/
│
└── scripts/                    # 部署脚本
    ├── deploy.sh
    ├── backup.sh
    ├── rollback.sh
    └── health-check.sh
```

### 部署流程图

```
GitHub Push/Tag
      ↓
GitHub Actions Triggered
      ↓
[Build Stage]
  - Build Go Backend
  - Build React Frontend
  - Create Docker Images
      ↓
[Deploy Stage]
  - Upload Images to Server
  - Backup Current Version
  - Deploy New Version
  - Update Symlink
  - Restart Services
      ↓
[Verification Stage]
  - Health Checks
  - API Tests
  - Frontend Tests
      ↓
Success ✅ / Failure ❌ → Auto Rollback
```

---

## 前置准备

### 1. 服务器要求

- **操作系统**: Ubuntu 20.04+ / Debian 11+
- **内存**: 至少 4GB RAM
- **磁盘**: 至少 50GB 可用空间
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### 2. 本地准备

#### 安装必要工具

```bash
# Docker 和 Docker Compose（服务器上）
sudo apt update
sudo apt install -y docker.io docker-compose

# PostgreSQL 客户端（用于数据库备份，可选）
sudo apt install -y postgresql-client
```

#### 配置 SSH 密钥

```bash
# 1. 生成专用密钥对
ssh-keygen -t ed25519 -C "github-actions-cicd" -f ~/.ssh/github_actions_cicd

# 2. 复制公钥到服务器
ssh-copy-id -i ~/.ssh/github_actions_cicd.pub ubuntu@152.136.104.251

# 3. 测试连接
ssh -i ~/.ssh/github_actions_cicd ubuntu@152.136.104.251 "echo 'Connection successful!'"
```

### 3. GitHub 配置

参考 [GitHub Secrets 配置指南](./GITHUB_SECRETS_SETUP.md) 配置以下 Secrets：

- `PROD_SSH_HOST`: 服务器地址
- `PROD_SSH_USER`: SSH 用户名
- `PROD_SSH_KEY`: SSH 私钥

---

## 快速开始

### Step 1: 初始化服务器环境

```bash
# 连接到服务器
ssh ubuntu@152.136.104.251

# 1. 创建目录结构（已完成）
ls -la /opt/ai-project-cicd/

# 2. 创建环境变量文件
sudo nano /opt/ai-project-cicd/shared/env/.env

# 3. 设置权限
sudo chown -R ubuntu:ubuntu /opt/ai-project-cicd/
chmod 600 /opt/ai-project-cicd/shared/env/.env
```

### Step 2: 配置环境变量

在服务器上编辑 `/opt/ai-project-cicd/shared/env/.env`:

```bash
# Database
DB_HOST=postgres-master
DB_PORT=5432
DB_USER=prod_user
DB_PASSWORD=your_secure_password
DB_NAME=ai_project_db

# JWT
JWT_SECRET=your_jwt_secret_key

# 其他配置...
```

### Step 3: 首次部署

#### 方式 1: 自动部署（推荐）

```bash
# 在本地推送代码到 main 分支
git add .
git commit -m "feat: enable CI/CD deployment"
git push origin main
```

#### 方式 2: 手动触发

1. 进入 GitHub Repository
2. 点击 `Actions` 标签
3. 选择 `CI/CD Deploy to Production`
4. 点击 `Run workflow`
5. 选择分支并运行

### Step 4: 监控部署

在 GitHub Actions 页面查看部署进度：

1. `Build Go Backend` - 构建后端
2. `Build React Frontend` - 构建前端
3. `Build Docker Images` - 构建镜像
4. `Deploy to Production Server` - 部署到服务器
5. `Post-deployment Verification` - 部署后验证

---

## 部署流程

### 自动触发条件

1. **推送到 main 分支**:
   ```bash
   git push origin main
   ```

2. **发布新版本**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

3. **手动触发**: 在 GitHub Actions 页面手动运行

### 部署阶段详解

#### 阶段 1: 构建（约 5-10 分钟）

```yaml
Job 1: Build Go Backend
- 检出代码
- 设置 Go 环境
- 编译 Linux 二进制文件
- 上传 artifact

Job 2: Build React Frontend
- 检出代码
- 设置 Node.js 环境
- 安装依赖
- 构建生产版本
- 上传 artifact
```

#### 阶段 2: Docker 镜像构建（约 3-5 分钟）

```yaml
Job 3: Build Docker Images
- 下载构建产物
- 构建后端镜像
- 构建前端镜像
- 保存镜像为 tar.gz
- 上传镜像文件
```

#### 阶段 3: 部署（约 2-3 分钟）

```yaml
Job 4: Deploy to Production
- 下载镜像文件
- 上传到服务器
- 执行部署脚本:
  1. 备份当前版本
  2. 加载新镜像
  3. 创建新版本目录
  4. 更新软链接
  5. 重启服务
  6. 健康检查
  7. 清理旧版本
```

#### 阶段 4: 验证（约 1 分钟）

```yaml
Job 5: Post-deployment Verification
- 等待服务稳定
- 验证 API 端点
- 验证前端访问
- 生成验证报告
```

---

## 回滚操作

### 自动回滚

部署失败时会自动触发回滚：

```bash
# 健康检查失败 → 自动执行
bash /opt/ai-project-cicd/scripts/rollback.sh --force "Deployment failure"
```

### 手动回滚

#### 方法 1: 使用脚本（推荐）

```bash
# 连接到服务器
ssh ubuntu@152.136.104.251

# 执行回滚脚本
cd /opt/ai-project-cicd
bash scripts/rollback.sh

# 确认回滚
# 脚本会显示可用版本并提示确认
```

#### 方法 2: 手动切换版本

```bash
# 查看可用版本
ls -lt /opt/ai-project-cicd/releases/

# 切换到指定版本
cd /opt/ai-project-cicd
ln -sfn /opt/ai-project-cicd/releases/release-20251118-001 current

# 重启服务
cd current
docker-compose down
docker-compose up -d

# 健康检查
bash ../scripts/health-check.sh
```

### 回滚验证

```bash
# 查看当前版本
readlink /opt/ai-project-cicd/current

# 查看容器状态
docker ps

# 查看应用日志
docker logs ai-backend-cicd
docker logs ai-frontend-cicd

# 测试 API
curl http://localhost:8080/health
```

---

## 监控和日志

### 查看部署日志

#### GitHub Actions 日志

1. 进入 `Actions` 标签
2. 选择对应的 workflow run
3. 查看各个 job 的详细日志

#### 服务器日志

```bash
# 应用日志
docker logs -f ai-backend-cicd
docker logs -f ai-frontend-cicd

# Nginx 日志
tail -f /opt/ai-project-cicd/shared/logs/nginx/access.log
tail -f /opt/ai-project-cicd/shared/logs/nginx/error.log

# 数据库日志
docker logs -f postgres-master-cicd

# 部署日志
cat /opt/ai-project-cicd/shared/logs/rollback.log
```

### 监控服务状态

```bash
# Docker 容器状态
docker ps --filter "name=cicd"

# 资源使用情况
docker stats

# 健康检查
bash /opt/ai-project-cicd/scripts/health-check.sh

# 系统资源
htop
df -h
```

### 性能监控

```bash
# API 响应时间
time curl http://localhost:8080/health

# 前端加载时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/

# 数据库连接
docker exec postgres-master-cicd psql -U prod_user -d ai_project_db -c "SELECT 1;"
```

---

## 故障排查

### 常见问题

#### 1. 部署失败 - SSH 连接问题

**症状**: `Permission denied (publickey)`

**解决方案**:
```bash
# 验证 SSH 密钥
ssh -i ~/.ssh/github_actions_cicd -v ubuntu@152.136.104.251

# 检查 authorized_keys
cat ~/.ssh/authorized_keys | grep "github-actions"

# 重新添加公钥
ssh-copy-id -i ~/.ssh/github_actions_cicd.pub ubuntu@152.136.104.251
```

#### 2. Docker 镜像加载失败

**症状**: `Error response from daemon: open /tmp/backend-image.tar.gz: no such file or directory`

**解决方案**:
```bash
# 检查文件是否上传成功
ls -lh /tmp/*.tar.gz

# 手动测试加载
docker load < /tmp/backend-image.tar.gz

# 检查磁盘空间
df -h /tmp
```

#### 3. 健康检查失败

**症状**: `Health check failed after 30 attempts`

**解决方案**:
```bash
# 查看容器日志
docker logs ai-backend-cicd --tail 100

# 检查容器状态
docker inspect ai-backend-cicd

# 手动测试 API
curl -v http://localhost:8080/health

# 检查数据库连接
docker exec ai-backend-cicd env | grep DB_
```

#### 4. 数据库连接失败

**症状**: `could not connect to server`

**解决方案**:
```bash
# 检查数据库容器
docker ps | grep postgres

# 测试数据库连接
docker exec postgres-master-cicd pg_isready

# 查看数据库日志
docker logs postgres-master-cicd

# 检查环境变量
cat /opt/ai-project-cicd/shared/env/.env | grep DB_
```

#### 5. 端口冲突

**症状**: `Bind for 0.0.0.0:8080 failed: port is already allocated`

**解决方案**:
```bash
# 查找占用端口的进程
sudo lsof -i :8080
sudo netstat -tulpn | grep 8080

# 停止旧服务
docker stop $(docker ps -q --filter "publish=8080")

# 清理悬空容器
docker container prune
```

### 调试技巧

#### 查看完整部署流程

```bash
# 查看最近的版本
ls -lt /opt/ai-project-cicd/releases/ | head -5

# 查看备份历史
ls -lt /opt/ai-project-cicd/backups/ | head -5

# 查看当前版本信息
readlink /opt/ai-project-cicd/current
cat /opt/ai-project-cicd/current/metadata.txt 2>/dev/null || echo "No metadata"
```

#### 手动测试部署脚本

```bash
# 测试备份脚本
bash /opt/ai-project-cicd/scripts/backup.sh

# 测试健康检查
bash /opt/ai-project-cicd/scripts/health-check.sh

# 测试部署流程（dry-run）
# 注意：需要修改脚本支持 dry-run 模式
```

---

## 最佳实践

### 1. 部署前检查

- [ ] 所有测试通过
- [ ] 代码已 review
- [ ] 数据库迁移脚本已测试
- [ ] 配置变更已确认
- [ ] 备份策略已就绪

### 2. 部署中监控

- [ ] 实时监控 GitHub Actions 日志
- [ ] 准备好回滚方案
- [ ] 关注服务器资源使用
- [ ] 监控错误日志

### 3. 部署后验证

- [ ] API 端点测试
- [ ] 前端功能测试
- [ ] 数据库连接测试
- [ ] 关键业务流程测试
- [ ] 性能基准测试

### 4. 版本管理

```bash
# 保留策略
- 保留最近 7 个版本
- 保留所有带 tag 的版本
- 每月归档一次完整备份

# 清理旧版本
cd /opt/ai-project-cicd/releases
ls -t | tail -n +8 | xargs -I {} rm -rf {}
```

### 5. 安全建议

- 定期更新依赖
- 定期轮换密钥
- 启用审计日志
- 限制 SSH 访问
- 使用防火墙规则
- 定期安全扫描

### 6. 性能优化

- 使用 Docker 层缓存
- 并行构建任务
- 优化镜像大小
- 使用 CDN 加速
- 启用 gzip 压缩

---

## 相关文档

- [GitHub Secrets 配置指南](./GITHUB_SECRETS_SETUP.md)
- [部署脚本说明](../scripts/cicd/README.md)
- [Docker 配置说明](../docker-compose.cicd.yml)
- [环境变量配置](../scripts/cicd/.env.example)

---

## 维护和支持

### 获取帮助

- 查看 [GitHub Issues](https://github.com/your-repo/issues)
- 查阅 [部署日志](#监控和日志)
- 联系运维团队

### 紧急回滚

如遇紧急情况需要立即回滚：

```bash
# 最快速回滚方式
ssh ubuntu@152.136.104.251 "cd /opt/ai-project-cicd && bash scripts/rollback.sh --force 'Emergency rollback'"
```

### 灾难恢复

参考备份文件恢复：

```bash
# 查看最新备份
ls -lt /opt/ai-project-cicd/backups/ | head -1

# 从备份恢复
BACKUP_DIR="/opt/ai-project-cicd/backups/backup-YYYYMMDD-HHMMSS"
cp -r "$BACKUP_DIR/release" /opt/ai-project-cicd/releases/
```

---

**最后更新**: 2025-11-18
**版本**: 1.0.0
**维护者**: AI Development Team
