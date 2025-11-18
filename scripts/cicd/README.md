# CI/CD 部署脚本说明

本目录包含用于 GitHub Actions CI/CD 自动化部署的核心脚本。

## 📁 文件清单

| 文件 | 用途 | 说明 |
|------|------|------|
| `deploy.sh` | 主部署脚本 | 自动化部署新版本，包括备份、加载镜像、重启服务、健康检查 |
| `backup.sh` | 备份脚本 | 备份当前运行版本、配置、数据库 |
| `rollback.sh` | 回滚脚本 | 快速回滚到上一个版本 |
| `health-check.sh` | 健康检查脚本 | 验证服务是否正常运行 |
| `.env.example` | 环境变量模板 | 生产环境配置模板 |

## 🚀 快速使用

### 1. 部署新版本

```bash
# 由 GitHub Actions 自动调用
bash /opt/ai-project-cicd/scripts/deploy.sh <git-sha>

# 手动部署（需要先准备镜像文件）
bash /opt/ai-project-cicd/scripts/deploy.sh manual
```

### 2. 备份当前版本

```bash
# 执行备份
bash /opt/ai-project-cicd/scripts/backup.sh

# 查看备份
ls -lt /opt/ai-project-cicd/backups/
```

### 3. 回滚到上一版本

```bash
# 交互式回滚（需要确认）
bash /opt/ai-project-cicd/scripts/rollback.sh

# 强制回滚（不需要确认）
bash /opt/ai-project-cicd/scripts/rollback.sh --force "Emergency rollback"
```

### 4. 健康检查

```bash
# 执行健康检查
bash /opt/ai-project-cicd/scripts/health-check.sh

# 退出码
# 0 - 所有检查通过
# 1 - 检查失败
```

## 📋 脚本详解

### deploy.sh - 主部署脚本

**功能**:
1. 创建新版本目录
2. 备份当前版本
3. 加载 Docker 镜像
4. 更新软链接
5. 重启服务
6. 执行健康检查
7. 失败时自动回滚
8. 清理旧版本

**参数**:
- `$1` - Git commit SHA (用于标识镜像版本)

**环境变量**:
```bash
DEPLOY_ROOT=/opt/ai-project-cicd
RELEASE_NAME=release-$(date +%Y%m%d-%H%M%S)
```

**使用示例**:
```bash
# GitHub Actions 调用
bash deploy.sh abc123def456

# 手动调用
bash deploy.sh manual
```

**执行流程**:
```
1. 创建版本目录 (release-YYYYMMDD-HHMMSS)
   ↓
2. 备份当前版本
   ↓
3. 加载 Docker 镜像 (/tmp/*.tar.gz)
   ↓
4. 标记镜像为 latest
   ↓
5. 复制配置文件
   ↓
6. 更新软链接 (current → new release)
   ↓
7. 重启服务 (docker-compose down && up -d)
   ↓
8. 健康检查 (调用 health-check.sh)
   ↓
成功 ✅ / 失败 → 自动回滚 ❌
```

---

### backup.sh - 备份脚本

**功能**:
1. 备份应用代码和配置
2. 备份环境变量
3. 记录 Docker 镜像信息
4. 备份数据库（可选）
5. 创建备份元数据
6. 清理旧备份（保留30天）

**备份内容**:
```
/opt/ai-project-cicd/backups/backup-YYYYMMDD-HHMMSS/
├── release/              # 应用代码
├── env/                  # 环境变量
├── docker-info.txt       # Docker 镜像信息
├── database-*.sql.gz     # 数据库备份
└── metadata.txt          # 备份元数据
```

**使用示例**:
```bash
# 手动备份
bash backup.sh

# 查看最新备份
ls -lt /opt/ai-project-cicd/backups/ | head -1

# 查看备份大小
du -sh /opt/ai-project-cicd/backups/backup-*
```

---

### rollback.sh - 回滚脚本

**功能**:
1. 停止当前服务
2. 切换到上一版本
3. 启动上一版本服务
4. 执行健康检查
5. 记录回滚事件

**参数**:
- `--force` - 强制回滚，不需要确认
- `$2` - 回滚原因说明

**使用示例**:
```bash
# 交互式回滚
bash rollback.sh

# 强制回滚（用于自动化）
bash rollback.sh --force "Deployment failed"

# 查看回滚历史
cat /opt/ai-project-cicd/shared/logs/rollback.log
```

**回滚流程**:
```
1. 停止当前服务
   ↓
2. 查找上一版本
   ↓
3. 确认回滚（交互式）
   ↓
4. 切换软链接 (current → previous release)
   ↓
5. 启动服务
   ↓
6. 健康检查
   ↓
7. 记录回滚事件
```

---

### health-check.sh - 健康检查脚本

**功能**:
1. 检查 Docker 容器状态
2. 检查后端 API (HTTP /health)
3. 检查前端访问
4. 检查数据库连接（可选）

**环境变量**:
```bash
API_URL=http://localhost:8080/health
FRONTEND_URL=http://localhost:3000
MAX_RETRIES=30
RETRY_INTERVAL=2
```

**检查项目**:
```
✓ Docker 容器运行状态
✓ 容器健康状态
✓ 后端 API 响应 (200/302)
✓ 前端可访问性
✓ 数据库连接（可选）
```

**使用示例**:
```bash
# 执行健康检查
bash health-check.sh

# 自定义 API 地址
API_URL=http://custom:8080/health bash health-check.sh

# 增加重试次数
MAX_RETRIES=60 bash health-check.sh
```

**输出示例**:
```
[INFO] ==========================================
[INFO] 开始健康检查
[INFO] ==========================================
[INFO] Step 1/4: 检查 Docker 容器...
[SUCCESS] 容器 ai-backend-cicd: running (healthy)
[SUCCESS] 容器 ai-frontend-cicd: running (no-health-check)
[INFO] Step 2/4: 检查后端 API...
[INFO] 检查 后端 API: http://localhost:8080/health
[INFO] 尝试 1/30...
[SUCCESS] 后端 API 检查通过 (HTTP 200)
[INFO] Step 3/4: 检查前端...
[SUCCESS] 前端 检查通过 (HTTP 200)
[INFO] Step 4/4: 检查数据库连接...
[SUCCESS] 数据库连接正常
[INFO] ==========================================
[SUCCESS] ✅ 所有检查通过！
[SUCCESS] 系统运行正常
[INFO] ==========================================
```

---

## 🔧 配置文件

### .env.example - 环境变量模板

**使用方法**:
```bash
# 1. 复制模板到服务器
scp .env.example ubuntu@server:/opt/ai-project-cicd/shared/env/.env

# 2. 编辑配置
ssh ubuntu@server
nano /opt/ai-project-cicd/shared/env/.env

# 3. 设置权限
chmod 600 /opt/ai-project-cicd/shared/env/.env
```

**主要配置项**:
```bash
# 数据库
DB_HOST=postgres-master
DB_USER=prod_user
DB_PASSWORD=your_password
DB_NAME=ai_project_db

# JWT
JWT_SECRET=your_jwt_secret

# 功能开关
FEATURE_SUPERADMIN_ENABLE=true
```

---

## 📊 日志和监控

### 查看日志

```bash
# 应用日志
docker logs -f ai-backend-cicd
docker logs -f ai-frontend-cicd

# 部署脚本日志（在 GitHub Actions 中查看）

# 回滚日志
cat /opt/ai-project-cicd/shared/logs/rollback.log

# 系统日志
journalctl -u docker -f
```

### 监控命令

```bash
# 查看当前版本
readlink /opt/ai-project-cicd/current

# 查看所有版本
ls -lt /opt/ai-project-cicd/releases/

# 查看备份
ls -lt /opt/ai-project-cicd/backups/

# 查看容器状态
docker ps --filter "name=cicd"

# 查看资源使用
docker stats

# 检查磁盘空间
df -h /opt/ai-project-cicd/
```

---

## 🛠️ 维护操作

### 清理旧版本

```bash
# 清理旧版本（保留最近7个）
cd /opt/ai-project-cicd/releases
ls -t | tail -n +8 | xargs -I {} rm -rf {}

# 清理旧备份（保留最近30天）
find /opt/ai-project-cicd/backups -type d -name "backup-*" -mtime +30 -exec rm -rf {} \;
```

### 手动部署测试

```bash
# 1. 准备镜像文件
scp backend-image.tar.gz ubuntu@server:/tmp/
scp frontend-image.tar.gz ubuntu@server:/tmp/

# 2. 执行部署
ssh ubuntu@server
cd /opt/ai-project-cicd
bash scripts/deploy.sh test-manual

# 3. 验证部署
bash scripts/health-check.sh
```

### 紧急恢复

```bash
# 快速回滚
bash scripts/rollback.sh --force "Emergency"

# 从备份恢复
BACKUP_DIR=/opt/ai-project-cicd/backups/backup-YYYYMMDD-HHMMSS
cp -r "$BACKUP_DIR/release" /opt/ai-project-cicd/releases/emergency-restore
ln -sfn /opt/ai-project-cicd/releases/emergency-restore /opt/ai-project-cicd/current
cd /opt/ai-project-cicd/current
docker-compose up -d
```

---

## ⚠️ 注意事项

1. **权限要求**: 脚本需要执行权限 (`chmod +x *.sh`)
2. **环境变量**: 确保 `.env` 文件已正确配置
3. **磁盘空间**: 定期清理旧版本和备份
4. **数据库备份**: 确保 `pg_dump` 可用
5. **网络连接**: 确保服务器可访问 Docker Hub

---

## 🔗 相关文档

- [CI/CD 部署指南](../../docs/CICD_DEPLOYMENT_GUIDE.md)
- [GitHub Secrets 配置](../../docs/GITHUB_SECRETS_SETUP.md)
- [Docker Compose 配置](../../docker-compose.cicd.yml)

---

## 📞 获取支持

遇到问题？

1. 查看 [故障排查指南](../../docs/CICD_DEPLOYMENT_GUIDE.md#故障排查)
2. 查看脚本日志输出
3. 联系运维团队

---

**最后更新**: 2025-11-18
**版本**: 1.0.0
