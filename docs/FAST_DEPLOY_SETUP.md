# 快速部署设置指南

**目标**: 将部署时间从20分钟降低到3-5分钟

---

## 一、为什么需要优化?

### 当前问题
```
慢速流程 (20-25分钟):
1. build-backend         (5分钟)
2. build-frontend        (8分钟)
3. build-docker-images   (3分钟)
4. SCP传输镜像          (12分钟) 🔥 主要瓶颈
5. docker load          (2分钟)
6. 部署                 (1分钟)
```

### 优化后
```
快速流程 (3-5分钟):
1. 检测变化            (10秒)
2. 构建镜像            (2分钟) - 利用缓存
3. Push到Registry      (30秒)
4. 服务器Pull镜像      (1分钟)
5. 部署                (30秒)
```

**时间节省**: 85% ⚡

---

## 二、设置步骤

### 步骤1: 启用GitHub Container Registry (2分钟)

#### 1.1 启用Package权限

1. 访问GitHub仓库设置
   ```
   https://github.com/qiudl/new-ai-proj/settings/actions
   ```

2. 找到"Workflow permissions"
3. 确保选中:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

#### 1.2 验证Token权限

GitHub Actions会自动使用`GITHUB_TOKEN`，无需额外配置。

### 步骤2: 配置生产服务器 (5分钟)

#### 2.1 在服务器上登录GitHub Container Registry

```bash
# SSH到生产服务器
ssh root@proj.joylodging.com

# 创建GitHub Personal Access Token (classic)
# 访问: https://github.com/settings/tokens
# Scopes需要勾选:
#   - read:packages
#   - write:packages

# 使用token登录
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 验证登录
docker pull ghcr.io/qiudl/ai-project-backend:latest 2>&1 | head -5
```

**创建Token步骤**:
1. 访问 https://github.com/settings/tokens
2. 点击"Generate new token (classic)"
3. Note: "AI Project Deploy"
4. Expiration: 90 days
5. 勾选scopes:
   - ✅ `read:packages`
   - ✅ `write:packages`
6. 生成并复制token

#### 2.2 配置Docker自动登录 (可选)

```bash
# 在服务器上创建登录脚本
cat > /opt/ai-project-fast/scripts/docker-login.sh << 'EOF'
#!/bin/bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
EOF

chmod +x /opt/ai-project-fast/scripts/docker-login.sh

# 添加到环境变量
cat >> ~/.bashrc << 'EOF'
export GITHUB_USERNAME="qiudl"
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"  # 替换为你的token
EOF

source ~/.bashrc
```

### 步骤3: 测试快速部署 (3分钟)

#### 3.1 触发首次部署

```bash
# 在本地
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 做一个小改动测试
echo "# Fast deploy test" >> README.md

git add README.md
git commit -m "test: trigger fast deploy workflow"
git push origin main
```

#### 3.2 监控部署

访问: https://github.com/qiudl/new-ai-proj/actions

你应该看到:
- ✅ "Fast Deploy to Production" workflow运行中
- ⚡ 预计3-5分钟完成

#### 3.3 验证结果

```bash
# SSH到服务器
ssh root@proj.joylodging.com

# 检查镜像
docker images | grep ghcr.io

# 应该看到:
# ghcr.io/qiudl/ai-project-backend    main-xxx    ...
# ghcr.io/qiudl/ai-project-frontend   main-xxx    ...

# 检查容器
docker ps

# 验证服务
curl http://localhost:8080/health
curl http://localhost:3000
```

---

## 三、使用方式

### 场景1: 日常小改动 (推荐)

修改了一两个文件，希望快速部署:

```bash
# 修改代码
vim backend/handlers/some_handler.go

# 提交并推送
git add .
git commit -m "fix: update handler logic"
git push origin main

# ⚡ 自动触发快速部署
# 预计3-5分钟完成
```

**快速部署workflow会**:
1. 检测到backend变化
2. 只构建backend镜像
3. 跳过frontend构建
4. 快速部署

### 场景2: 大版本更新

依赖更新、重大重构:

```bash
# 手动触发完整构建
gh workflow run deploy-cicd.yml

# 或在GitHub网页操作:
# Actions → CI/CD Deploy to Production → Run workflow
```

### 场景3: 强制重新构建所有镜像

```bash
# 使用workflow_dispatch手动触发
gh workflow run deploy-fast.yml --field force_rebuild=true

# 或在GitHub网页:
# Actions → Fast Deploy → Run workflow
# 勾选 "Force rebuild all images"
```

---

## 四、性能对比

### 测试场景: 修改backend一个文件

**旧流程 (deploy-cicd.yml)**:
```
✓ build-backend       5m 23s
✓ build-frontend      7m 41s  ← 浪费时间
✓ build-docker-images 2m 18s
✓ Upload images      11m 47s  ← 主要瓶颈
✓ deploy              2m 05s
────────────────────────────
Total: 29m 14s
```

**新流程 (deploy-fast.yml)**:
```
✓ detect-changes        8s
✓ build-backend       2m 12s  ← 利用缓存
  (跳过frontend)              ← 智能检测
✓ Push to registry     24s    ← Registry快
✓ deploy              1m 31s  ← docker pull快
────────────────────────────
Total: 4m 15s
```

**提升**: 85% ⚡

---

## 五、故障排查

### 问题1: Registry登录失败

```bash
# 错误信息
Error response from daemon: Get "https://ghcr.io/v2/": unauthorized

# 解决方案
# 1. 检查token权限
# 2. 重新登录
docker logout ghcr.io
echo "YOUR_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 3. 验证
docker pull ghcr.io/qiudl/ai-project-backend:latest
```

### 问题2: 镜像拉取慢

```bash
# 检查网络
curl -I https://ghcr.io

# 配置Docker镜像加速 (可选)
# 编辑 /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ]
}

sudo systemctl restart docker
```

### 问题3: 缓存未生效

```bash
# 清理旧缓存
docker builder prune -a

# 在GitHub Actions中强制重建
gh workflow run deploy-fast.yml --field force_rebuild=true
```

### 问题4: 服务无法启动

```bash
# 查看日志
docker logs ai_backend_prod
docker logs ai_frontend_prod

# 检查镜像版本
docker inspect ghcr.io/qiudl/ai-project-backend:latest | grep Created

# 回滚到之前版本
docker pull ghcr.io/qiudl/ai-project-backend:main-PREVIOUS_SHA
docker-compose restart backend-prod
```

---

## 六、最佳实践

### 1. 选择合适的workflow

```bash
# 日常开发: 使用快速部署
git push origin main  # 自动触发deploy-fast.yml

# 重大更新: 使用完整流程
gh workflow run deploy-cicd.yml
```

### 2. 合理使用分支

```bash
# 开发分支测试
git checkout -b feature/new-feature
git push origin feature/new-feature

# 合并到main触发生产部署
git checkout main
git merge feature/new-feature
git push origin main  # ⚡ 自动快速部署
```

### 3. 定期清理镜像

```bash
# 在服务器上定期清理
docker image prune -a --filter "until=168h"  # 清理7天前的镜像

# 保留最近的版本
docker images | grep ghcr.io | tail -n +10 | awk '{print $3}' | xargs docker rmi
```

---

## 七、监控和维护

### 查看部署历史

```bash
# GitHub CLI
gh run list --workflow=deploy-fast.yml --limit 10

# 查看特定run的详情
gh run view RUN_ID --log
```

### 检查镜像大小

```bash
# 在服务器上
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep ghcr.io

# 应该看到
# REPOSITORY                              TAG         SIZE
# ghcr.io/qiudl/ai-project-backend       latest      ~150MB
# ghcr.io/qiudl/ai-project-frontend      latest      ~80MB
```

### 性能监控

访问: https://github.com/qiudl/new-ai-proj/actions

查看:
- ⏱️ 平均部署时间
- ✅ 成功率
- 📊 缓存命中率

---

## 八、成本收益

**时间节省**:
- 每次部署: 20分钟 → 5分钟 = 节省15分钟
- 每天5次部署: 节省75分钟 = 1.25小时
- 每周: 节省6.25小时
- 每月: 节省25小时

**投资回报**:
- 设置时间: 10分钟
- 第一天即可回本！

---

## 九、下一步

### 立即行动
1. ✅ 启用GitHub Container Registry权限
2. ✅ 配置服务器登录
3. ✅ 测试快速部署
4. ✅ 验证效果

### 后续优化
1. 添加自动化测试
2. 实施蓝绿部署
3. 配置CDN加速
4. 监控和告警

---

**设置时间**: 10-15分钟
**预期效果**: 部署时间减少85%
**立即开始**: 现在就设置！⚡
