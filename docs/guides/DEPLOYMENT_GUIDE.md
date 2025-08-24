# AI项目腾讯云生产环境部署指南

本指南将帮助您在腾讯云服务器 `152.136.104.251` 上部署AI项目管理平台的生产环境。

## 🚀 快速部署

### 前置条件

1. **腾讯云服务器准备**
   - 服务器IP: `152.136.104.251`
   - 操作系统: Ubuntu 20.04+ 
   - SSH密钥已配置
   - 具有sudo权限

2. **腾讯云容器镜像服务**
   - 已开通腾讯云容器镜像服务
   - 获得镜像仓库访问凭证

3. **GitHub Secrets配置**
   ```
   TENCENT_HOST: 152.136.104.251
   TENCENT_USERNAME: ubuntu
   TENCENT_SSH_KEY: [SSH私钥内容]
   TENCENT_REGISTRY_USERNAME: [腾讯云镜像仓库用户名]
   TENCENT_REGISTRY_PASSWORD: [腾讯云镜像仓库密码]
   GITHUB_TOKEN: [GitHub Personal Access Token]
   ```

### 一键部署步骤

#### 1. 服务器初始化

```bash
# 在腾讯云服务器上执行
curl -fsSL https://raw.githubusercontent.com/yourusername/new-ai-proj/main/scripts/deploy/tencent-cloud-setup.sh | sudo bash
```

#### 2. 配置GitHub Actions自动部署

1. 推送代码到main分支将自动触发部署
2. 或手动触发部署:
   - 进入GitHub仓库的Actions页面
   - 选择"Deploy to Tencent Cloud Production"
   - 点击"Run workflow"

#### 3. 手动部署（可选）

```bash
# 本地执行
export TENCENT_REGISTRY_USERNAME="your_username"
export TENCENT_REGISTRY_PASSWORD="your_password"
./scripts/deploy/production-deploy.sh
```

## 📋 详细部署流程

### 步骤1: 服务器环境准备

```bash
# SSH连接到服务器
ssh ubuntu@152.136.104.251

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 创建应用目录
sudo mkdir -p /opt/ai-project
sudo chown -R ubuntu:ubuntu /opt/ai-project
```

### 步骤2: 配置文件准备

```bash
cd /opt/ai-project

# 从GitHub下载配置文件
curl -O https://raw.githubusercontent.com/yourusername/new-ai-proj/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/yourusername/new-ai-proj/main/.env.production

# 编辑生产环境配置
vim .env.production
```

**重要**: 必须修改 `.env.production` 文件中的以下配置:
```env
# 数据库配置
DB_USER=prod_user
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_NAME=ai_project_prod_db

# JWT密钥
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_HERE

# 其他安全配置...
```

### 步骤3: 部署应用

```bash
# 登录腾讯云容器镜像服务
docker login ccr.ccs.tencentcloudapi.com -u YOUR_USERNAME

# 拉取镜像并启动服务
docker-compose -f docker-compose.prod.yml up -d

# 检查服务状态
docker-compose -f docker-compose.prod.yml ps
```

### 步骤4: 配置反向代理和SSL（可选）

```bash
# 如果需要自定义域名和SSL证书
sudo apt install nginx certbot python3-certbot-nginx

# 配置Nginx
sudo cp nginx/nginx-prod.conf /etc/nginx/sites-available/ai-project
sudo ln -s /etc/nginx/sites-available/ai-project /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 申请SSL证书
sudo certbot --nginx -d yourdomain.com
```

## 🔧 管理和维护

### 常用管理命令

```bash
# 查看服务状态
cd /opt/ai-project
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 更新服务
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 停止服务
docker-compose -f docker-compose.prod.yml down
```

### 健康检查

```bash
# 执行健康检查
./scripts/deploy/health-check.sh

# 自动修复问题
./scripts/deploy/health-check.sh --fix
```

### 数据库备份

```bash
# 手动备份
./scripts/deploy/backup-database.sh

# 查看备份列表
./scripts/deploy/backup-database.sh --list

# 恢复备份
./scripts/deploy/backup-database.sh --restore /opt/ai-project/backups/db_backup_20241208_120000.sql.gz
```

### 设置自动化任务

```bash
# 编辑crontab
crontab -e

# 添加以下任务
# 每天凌晨2点备份数据库
0 2 * * * /opt/ai-project/scripts/deploy/backup-database.sh

# 每小时执行健康检查
0 * * * * /opt/ai-project/scripts/deploy/health-check.sh

# 每周清理Docker镜像
0 3 * * 0 docker image prune -f
```

## 🌐 访问应用

部署成功后，可以通过以下地址访问应用:

- **前端应用**: http://152.136.104.251
- **API接口**: http://152.136.104.251/api/v1
- **健康检查**: http://152.136.104.251/health
- **MCP服务**: http://152.136.104.251/mcp

## 🔍 故障排除

### 常见问题

1. **容器无法启动**
   ```bash
   # 检查Docker服务
   sudo systemctl status docker
   
   # 查看详细错误日志
   docker-compose -f docker-compose.prod.yml logs
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库容器
   docker exec ai_postgres_prod pg_isready -U prod_user
   
   # 重启数据库
   docker-compose -f docker-compose.prod.yml restart postgres
   ```

3. **前端无法访问**
   ```bash
   # 检查Nginx配置
   docker-compose -f docker-compose.prod.yml logs nginx
   
   # 检查端口占用
   sudo netstat -tlnp | grep :80
   ```

4. **磁盘空间不足**
   ```bash
   # 清理Docker资源
   docker system prune -a
   
   # 清理旧日志
   find /opt/ai-project/logs -name "*.log" -mtime +7 -delete
   ```

### 日志查看

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs postgres

# 实时跟踪日志
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

## 📊 监控和性能

### 系统监控

```bash
# 查看系统资源使用
htop
df -h
free -h

# 查看Docker资源使用
docker stats

# 查看网络连接
sudo netstat -tlnp
```

### 性能优化建议

1. **数据库优化**
   - 定期执行 `VACUUM` 和 `ANALYZE`
   - 监控慢查询日志
   - 调整PostgreSQL配置参数

2. **应用优化**
   - 启用Redis缓存
   - 配置CDN加速静态资源
   - 使用负载均衡器（如有多台服务器）

3. **服务器优化**
   - 调整内核参数
   - 配置swap空间
   - 定期更新系统补丁

## 🔒 安全配置

### 基础安全

1. **防火墙配置**
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **SSH安全**
   ```bash
   # 禁用密码登录，只允许密钥登录
   sudo vim /etc/ssh/sshd_config
   # PasswordAuthentication no
   sudo systemctl restart ssh
   ```

3. **定期更新**
   ```bash
   # 设置自动安全更新
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

### 应用安全

1. **环境变量安全**
   - 使用强密码
   - 定期轮换密钥
   - 不在代码中硬编码敏感信息

2. **网络安全**
   - 配置HTTPS证书
   - 设置安全头
   - 限制API访问频率

3. **数据库安全**
   - 使用专用数据库用户
   - 限制数据库访问权限
   - 定期备份数据

## 📞 支持和维护

如果遇到问题，请:

1. 查看日志文件获取详细错误信息
2. 运行健康检查脚本诊断问题
3. 查阅本文档的故障排除部分
4. 如需要帮助，请提供详细的错误日志

---

**注意**: 这是生产环境部署，请确保所有配置都经过仔细验证，建议先在测试环境中验证部署流程。