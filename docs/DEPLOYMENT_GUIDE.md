# 腾讯云部署指南

本指南将帮助你在腾讯云服务器上部署新AI项目。

## 🚀 快速开始

### 1. 服务器要求

- **操作系统**: Ubuntu 20.04+ 或 CentOS 8+
- **CPU**: 2核心或以上
- **内存**: 4GB或以上
- **存储**: 50GB或以上
- **网络**: 公网IP，开放80、443、22端口

### 2. 一键安装
152.136.104.251
在腾讯云服务器上运行以下命令：

```bash
# 下载安装脚本
wget https://raw.githubusercontent.com/qiudl/new-ai-proj/scripts/tencent-cloud-setup.sh

# 赋予执行权限
chmod +x tencent-cloud-setup.sh

# 运行安装脚本
sudo ./tencent-cloud-setup.sh
```

## 📋 手动部署步骤

### 第一步：服务器初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y curl wget git unzip tree htop

# 安装Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 添加用户到docker组
sudo usermod -aG docker $USER
```

### 第二步：克隆项目

```bash
# 创建项目目录
sudo mkdir -p /opt/new-ai-proj
sudo chown -R $USER:$USER /opt/new-ai-proj

# 克隆项目
cd /opt/new-ai-proj
git clone https://github.com/your-username/new-ai-proj.git .
```

### 第三步：配置环境

```bash
# 复制环境配置
cp .env.prod.template .env.prod

# 编辑配置文件
nano .env.prod
```

**环境变量配置**:

```env
# 数据库配置
DB_USER=prod_user
DB_PASSWORD=your_secure_password_here
DB_NAME=prod_db

# JWT配置
JWT_SECRET=your_very_secure_jwt_secret_here

# 域名配置
DOMAIN=your-domain.com

# SSL配置
SSL_EMAIL=your-email@domain.com
```

### 第四步：启动服务

```bash
# 构建并启动服务
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔧 GitHub Actions配置

### 1. 设置GitHub Secrets

在GitHub仓库的Settings > Secrets and variables > Actions中添加以下密钥：

#### 必需的Secrets

| Name | Description | Example |
|------|-------------|---------|
| `TENCENT_CLOUD_HOST` | 腾讯云服务器IP地址 | `123.456.789.0` |
| `TENCENT_CLOUD_USER` | SSH用户名 | `ubuntu` 或 `root` |
| `TENCENT_CLOUD_SSH_KEY` | SSH私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `DB_USER` | 数据库用户名 | `prod_user` |
| `DB_PASSWORD` | 数据库密码 | `secure_password` |
| `DB_NAME` | 数据库名称 | `prod_db` |
| `JWT_SECRET` | JWT密钥 | `your_jwt_secret` |
| `DOMAIN` | 域名 | `your-domain.com` |

#### 可选的Secrets

| Name | Description |
|------|-------------|
| `DINGTALK_WEBHOOK` | 钉钉机器人Webhook地址 |
| `TENCENT_CLOUD_SECRET_ID` | 腾讯云API密钥ID |
| `TENCENT_CLOUD_SECRET_KEY` | 腾讯云API密钥Key |

### 2. SSH密钥配置

在本地生成SSH密钥对：

```bash
# 生成SSH密钥对
ssh-keygen -t rsa -b 4096 -C "deploy@your-domain.com"

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub ubuntu@your-server-ip

# 复制私钥内容到GitHub Secrets
cat ~/.ssh/id_rsa
```

### 3. 自动部署触发

- **推送到main分支**: 自动触发生产环境部署
- **创建版本标签**: 触发带版本号的部署
- **手动触发**: 在GitHub Actions页面手动触发

## 🔒 SSL证书配置

### 使用Let's Encrypt (推荐)

```bash
# 安装certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 手动上传证书

1. 将证书文件放在 `/opt/new-ai-proj/ssl/` 目录下
2. 修改nginx配置文件中的证书路径
3. 重启nginx服务

## 📊 监控和日志

### 查看服务状态

```bash
# 查看所有容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看服务日志
docker-compose -f docker-compose.prod.yml logs -f [service_name]

# 查看系统资源使用
htop
df -h
```

### 健康检查

```bash
# 运行健康检查脚本
/opt/new-ai-proj/scripts/health-check.sh

# 查看健康检查日志
tail -f /opt/new-ai-proj/logs/health-check.log
```

### 数据库管理

```bash
# 连接数据库
docker-compose exec db psql -U $DB_USER $DB_NAME

# 创建备份
/opt/new-ai-proj/scripts/backup.sh

# 查看备份文件
ls -la /opt/new-ai-proj/backups/
```

## 🔄 部署更新

### 自动部署（推荐）

推送代码到main分支即可自动触发部署：

```bash
git push origin main
```

### 手动部署

```bash
# 运行部署脚本
/opt/new-ai-proj/scripts/deploy.sh
```

## 🚨 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs [service_name]
   
   # 检查配置文件
   docker-compose config
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose exec db pg_isready -U $DB_USER
   
   # 重启数据库
   docker-compose restart db
   ```

3. **SSL证书问题**
   ```bash
   # 检查证书状态
   sudo certbot certificates
   
   # 重新获取证书
   sudo certbot --nginx -d your-domain.com --force-renewal
   ```

4. **磁盘空间不足**
   ```bash
   # 清理Docker镜像
   docker system prune -a
   
   # 清理日志文件
   /opt/new-ai-proj/scripts/rotate-logs.sh
   ```

### 回滚部署

如果部署出现问题，可以快速回滚：

```bash
# 查看镜像版本
docker images | grep new-ai-proj

# 切换到上一个版本
docker tag ghcr.io/your-username/new-ai-proj/backend:previous ghcr.io/your-username/new-ai-proj/backend:latest
docker tag ghcr.io/your-username/new-ai-proj/frontend:previous ghcr.io/your-username/new-ai-proj/frontend:latest

# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

## 📞 支持与联系

如果遇到问题，请：

1. 查看GitHub Issues
2. 查看部署日志
3. 联系技术支持

## 🔗 相关链接

- [项目README](../README.md)
- [API文档](./API.md)
- [开发指南](./DEVELOPMENT.md)
- [GitHub Actions工作流](.github/workflows/)