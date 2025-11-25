# 生产服务器Git仓库手动初始化指南

**日期**: 2025-11-21
**问题**: CI/CD自动部署因Git clone网络超时失败
**解决方案**: 手动初始化 + 后续快速部署（方案C）

---

## 问题背景

由于中国服务器访问GitHub存在网络限制，导致：
- Git clone 操作需要10-23分钟后仍失败
- Docker镜像拉取超时（>25分钟）
- 自动化CI/CD部署无法完成

## 解决方案

**一次性手动初始化 + 后续秒级部署**

### 核心思路
1. **首次**: 手动SSH登录服务器，执行git clone（可能需要多次尝试）
2. **后续**: CI/CD只需执行`git pull`（几秒钟）+ 服务器本地构建

---

## 操作步骤

### 步骤1: 准备SSH连接信息

从`.ai-proj-tunnel.env`文件获取SSH配置：

```bash
# 确认SSH配置
source ~/.ai-proj-tunnel.env

echo "服务器: $PROD_SSH_HOST"
echo "用户: $PROD_SSH_USER"
echo "密钥: $PROD_SSH_KEY"
```

### 步骤2: SSH登录生产服务器

**方法1: 使用脚本自动登录**

```bash
# 从本地执行
cd /Users/johnqiu/coding/www/projects/new-ai-proj
bash scripts/setup-prod-repo.sh
```

这个脚本会：
- 自动读取SSH配置
- 登录服务器
- 执行Git仓库初始化

**方法2: 手动SSH登录**

```bash
# 使用SSH密钥登录
ssh -i $PROD_SSH_KEY $PROD_SSH_USER@$PROD_SSH_HOST

# 或者如果配置了SSH config
ssh prod-server
```

### 步骤3: 在服务器上执行初始化脚本

登录服务器后，有两种方式：

**方式A: 下载并执行脚本（推荐）**

```bash
# 1. 创建临时目录
mkdir -p /tmp/git-init
cd /tmp/git-init

# 2. 下载初始化脚本
curl -o manual-git-init.sh https://raw.githubusercontent.com/qiudl/new-ai-proj/main/scripts/manual-git-init.sh

# 3. 添加执行权限
chmod +x manual-git-init.sh

# 4. 执行脚本
bash manual-git-init.sh
```

**方式B: 手动执行命令**

```bash
# 1. 创建部署目录
sudo mkdir -p /opt/ai-project-cicd
sudo chown -R $USER:$USER /opt/ai-project-cicd
cd /opt/ai-project-cicd

# 2. 配置Git以提高成功率
git config --global http.postBuffer 524288000  # 500MB buffer
git config --global http.lowSpeedLimit 1000    # 1KB/s
git config --global http.lowSpeedTime 600      # 超时10分钟

# 3. 克隆仓库（可能需要多次尝试）
git clone --depth 1 -b main https://github.com/qiudl/new-ai-proj.git .

# 如果失败，清理后重试：
rm -rf .git * .[!.]*
git clone --depth 1 -b main https://github.com/qiudl/new-ai-proj.git .
```

### 步骤4: 验证初始化成功

```bash
cd /opt/ai-project-cicd

# 检查Git仓库
git status

# 查看最新提交
git log -1 --oneline

# 查看文件
ls -la
```

应该看到：
```
✓ Git仓库正常
✓ 所有项目文件已存在
✓ 当前分支为 main
```

---

## 后续部署流程

### 自动化CI/CD部署

初始化成功后，触发GitHub Actions workflow：

1. **通过GitHub网页**:
   - 访问: https://github.com/qiudl/new-ai-proj/actions
   - 选择workflow: "Deploy via Server-Side Build"
   - 点击 "Run workflow"

2. **通过命令行**:
   ```bash
   gh workflow run "Deploy via Server-Side Build"
   ```

3. **部署流程**:
   ```
   GitHub Actions
     ↓
   SSH连接生产服务器
     ↓
   git pull (几秒钟) ✅
     ↓
   docker build (5-8分钟)
     ↓
   docker run
     ↓
   健康检查
     ↓
   部署完成！(总计 5-10分钟)
   ```

### 手动测试部署

也可以直接在服务器上测试：

```bash
cd /opt/ai-project-cicd
bash scripts/deploy-on-server.sh
```

---

## 故障排除

### 问题1: Git clone仍然超时

**解决方法A: 使用Git代理加速**

```bash
# 使用GitHub镜像加速
git config --global url."https://ghproxy.com/https://github.com".insteadOf "https://github.com"

# 然后重试克隆
git clone --depth 1 -b main https://github.com/qiudl/new-ai-proj.git .
```

**解决方法B: 分段克隆**

```bash
# 先初始化空仓库
git init
git remote add origin https://github.com/qiudl/new-ai-proj.git

# 逐步获取数据
git fetch --depth 1 origin main
git checkout FETCH_HEAD
```

**解决方法C: 在网络较好时段重试**

- 建议时段：凌晨2-6点（国际出口带宽较空闲）
- 脚本已内置自动重试机制，耐心等待

### 问题2: 权限不足

```bash
# 确保用户有权限
sudo chown -R $USER:$USER /opt/ai-project-cicd
```

### 问题3: 磁盘空间不足

```bash
# 检查磁盘空间
df -h

# 清理Docker缓存
docker system prune -a
```

---

## 性能对比

### 初始化前（自动化CI/CD）

| 操作 | 时间 | 状态 |
|-----|------|------|
| Git clone | 10-23分钟 | ❌ 超时失败 |
| 总部署时间 | N/A | ❌ 无法完成 |

### 初始化后（快速部署）

| 操作 | 时间 | 状态 |
|-----|------|------|
| Git pull | 2-5秒 | ✅ 成功 |
| Docker build | 5-8分钟 | ✅ 成功 |
| **总部署时间** | **5-10分钟** | ✅ 成功 |

**效率提升**: 从无法部署 → 10分钟内完成部署

---

## 附加优化（可选）

### 1. 配置Git加速（推荐）

在服务器上永久配置：

```bash
# 增大缓冲区
git config --global http.postBuffer 524288000

# 增加超时时间
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 600
```

### 2. 使用SSH协议克隆（如果有密钥）

```bash
git clone --depth 1 git@github.com:qiudl/new-ai-proj.git .
```

### 3. 设置定时pull（保持代码最新）

```bash
# 添加cron任务
crontab -e

# 每天凌晨3点自动pull
0 3 * * * cd /opt/ai-project-cicd && git pull origin main
```

---

## 下一步计划

**短期（已完成）**:
- ✅ 手动初始化Git仓库
- ✅ 验证git pull快速更新
- ✅ 测试完整部署流程

**中期（1-2周）**:
- 配置国内Docker镜像仓库（阿里云ACR/腾讯云TCR）
- 进一步加速Docker镜像拉取

**长期（有预算时）**:
- 考虑迁移到香港/新加坡云服务器
- 彻底解决网络限制问题

---

## 相关文件

- 初始化脚本: `scripts/manual-git-init.sh`
- 自动化脚本: `scripts/setup-prod-repo.sh`
- 部署脚本: `scripts/deploy-on-server.sh`
- 部署状态: `docs/DEPLOYMENT_STATUS.md`

---

## 联系支持

如遇到问题：
1. 查看GitHub Actions运行日志
2. 检查服务器Docker日志: `docker logs ai_backend_prod`
3. 健康检查端点: https://proj.joylodging.com/api/v1/health

---

**最后更新**: 2025-11-21 20:20 CST
