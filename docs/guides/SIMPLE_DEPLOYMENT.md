# 🚀 轻量服务器快速部署指南

适用于腾讯云轻量服务器的简化部署方案，无需外部镜像仓库，直接在服务器上构建。

## 📋 方案对比

| 特性 | 简化方案 | 完整方案 |
|------|---------|---------|
| 镜像仓库 | ❌ 不需要 | ✅ 需要（腾讯云TCR或Docker Hub） |
| 构建位置 | 🖥️ 服务器上构建 | 🏗️ GitHub Actions构建 |
| 部署速度 | 🐌 较慢（需构建） | 🚀 较快（拉取镜像） |
| 服务器资源 | 💻 需要更多CPU/内存 | 💾 主要消耗存储 |
| 适用场景 | 🧪 开发/测试/小型项目 | 🏭 生产环境/大型项目 |

## 🎯 适合您的简化方案

### 前置条件

1. **腾讯云轻量服务器**
   - IP: `152.136.104.251`
   - 操作系统: Ubuntu 20.04+
   - 内存: 建议2GB以上
   - 存储: 建议20GB以上

2. **本地环境**
   - Git
   - SSH密钥已配置

### 🚀 一键部署

#### 方法1: 直接在服务器上运行

```bash
# SSH连接到服务器
ssh ubuntu@152.136.104.251

# 下载并运行部署脚本
curl -fsSL https://raw.githubusercontent.com/yourusername/new-ai-proj/main/scripts/deploy/simple-deploy.sh | bash
```

#### 方法2: 使用GitHub Actions（推荐）

1. **配置GitHub Secrets**
   ```
   TENCENT_HOST: 152.136.104.251
   TENCENT_USERNAME: ubuntu
   TENCENT_SSH_KEY: [您的SSH私钥内容]
   SERVER_PORT: 22
   ```

2. **触发部署**
   - 推送代码到main分支自动部署
   - 或在GitHub Actions中手动触发"Deploy to Lightweight Server"

#### 方法3: 本地手动部署

```bash
# 克隆项目到本地
git clone https://github.com/yourusername/new-ai-proj.git
cd new-ai-proj

# 修改脚本中的仓库地址
vim scripts/deploy/simple-deploy.sh
# 将 REPO_URL 改为您的实际仓库地址

# 在服务器上运行
scp scripts/deploy/simple-deploy.sh ubuntu@152.136.104.251:~/
ssh ubuntu@152.136.104.251 'chmod +x ~/simple-deploy.sh && ~/simple-deploy.sh'
```

## 🔧 详细部署步骤

### 第一步: 服务器环境准备

```bash
# SSH连接到服务器
ssh ubuntu@152.136.104.251

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl git vim htop
```

### 第二步: 自动安装Docker

脚本会自动检查并安装Docker和Docker Compose：

```bash
# 如果需要手动安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以获得Docker组权限
exit
ssh ubuntu@152.136.104.251
```

### 第三步: 运行部署脚本

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/yourusername/new-ai-proj/main/scripts/deploy/simple-deploy.sh
chmod +x simple-deploy.sh

# 运行部署
./simple-deploy.sh
```

### 第四步: 配置环境变量

```bash
# 编辑配置文件
cd /opt/ai-project/current
vim .env

# 修改重要配置（必须修改）：
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_super_secure_jwt_secret_here
```

### 第五步: 重启服务应用配置

```bash
cd /opt/ai-project/current
docker-compose -f docker-compose.simple.yml restart
```

## 🌐 访问应用

部署成功后：

- **前端应用**: http://152.136.104.251
- **API接口**: http://152.136.104.251/api/v1
- **健康检查**: http://152.136.104.251/health
- **MCP服务**: http://152.136.104.251/mcp

## 🔧 日常管理

### 查看服务状态
```bash
cd /opt/ai-project/current
docker-compose -f docker-compose.simple.yml ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose -f docker-compose.simple.yml logs

# 查看特定服务日志
docker-compose -f docker-compose.simple.yml logs backend
docker-compose -f docker-compose.simple.yml logs frontend

# 实时跟踪日志
docker-compose -f docker-compose.simple.yml logs -f
```

### 重启服务
```bash
# 重启所有服务
docker-compose -f docker-compose.simple.yml restart

# 重启特定服务
docker-compose -f docker-compose.simple.yml restart backend
```

### 更新应用
```bash
cd /opt/ai-project/current
git pull origin main
docker-compose -f docker-compose.simple.yml up --build -d
```

### 完全重新部署
```bash
./simple-deploy.sh
```

## 🛠️ 故障排除

### 常见问题

1. **内存不足**
   ```bash
   # 添加swap空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

2. **构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a
   
   # 重新构建
   docker-compose -f docker-compose.simple.yml build --no-cache
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :8080
   
   # 停止冲突服务
   sudo systemctl stop apache2  # 如果有Apache
   sudo systemctl stop nginx    # 如果有系统Nginx
   ```

4. **权限问题**
   ```bash
   # 修复项目目录权限
   sudo chown -R $USER:$USER /opt/ai-project
   
   # 修复Docker权限
   sudo usermod -aG docker $USER
   # 然后重新登录
   ```

### 日志查看

```bash
# 系统日志
sudo journalctl -u docker -f

# 应用日志
cd /opt/ai-project/current
docker-compose -f docker-compose.simple.yml logs --tail=100 -f

# 特定容器日志
docker logs ai_backend
docker logs ai_frontend
docker logs ai_postgres
```

## 📊 性能优化

### 服务器优化

```bash
# 优化内核参数
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'net.core.somaxconn=65535' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 定时清理Docker
echo "0 3 * * 0 docker system prune -f" | crontab -
```

### 应用优化

1. **数据库优化**
   - 定期备份数据库
   - 监控数据库性能

2. **日志管理**
   - 配置日志轮转
   - 清理旧日志文件

3. **监控设置**
   - 使用htop监控系统资源
   - 设置磁盘空间告警

## 🔒 安全配置

### 基础安全

```bash
# 配置防火墙
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置自动安全更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

### 应用安全

1. **修改默认密码**
   - 数据库密码
   - JWT密钥
   - 应用管理员密码

2. **SSL证书（可选）**
   ```bash
   # 安装Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # 申请证书（需要域名）
   sudo certbot --nginx -d yourdomain.com
   ```

## 📈 监控和备份

### 设置定时备份

```bash
# 编辑crontab
crontab -e

# 添加备份任务
0 2 * * * cd /opt/ai-project/current && docker exec ai_postgres pg_dump -U ai_user ai_project_db > /opt/ai-project/backups/backup-$(date +\%Y\%m\%d).sql
```

### 系统监控

```bash
# 查看系统资源
htop
df -h
free -h

# 查看Docker资源使用
docker stats
```

## 🆚 升级到完整方案

如果后续需要升级到完整的CI/CD方案：

1. **注册Docker Hub账号**（免费）
2. **配置GitHub Secrets**
3. **使用 `deploy-production.yml` 工作流**
4. **迁移数据**

---

**总结**: 这个简化方案适合快速部署和测试，无需外部依赖，但构建时间较长。如果项目规模增大，建议升级到完整的CI/CD方案。