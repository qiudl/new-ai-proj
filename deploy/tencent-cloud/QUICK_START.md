# AI项目管理系统 - 腾讯云部署快速开始指南

## 🚀 快速部署

### 1. 准备工作

确保你有：
- 腾讯云服务器（Ubuntu 20.04+）
- 服务器IP地址和root/sudo权限
- 本地macOS/Linux环境

### 2. 配置SSH连接

```bash
# 设置服务器IP
export SERVER_IP=your-server-ip

# 配置SSH密钥（需要输入服务器密码）
./setup-ssh.sh

# 测试连接
ssh ai-project-server
```

### 3. 同步代码到服务器

```bash
# 基础同步
./sync-to-server.sh

# 同步 + 构建
./sync-to-server.sh --build

# 同步 + 构建 + 部署
./sync-to-server.sh --build --deploy
```

### 4. 首次部署

```bash
# SSH到服务器
ssh ai-project-server

# 进入项目目录
cd /opt/ai-project

# 设置生产环境变量（根据实际情况修改）
sudo nano deploy/tencent-cloud/.env.prod

# 执行部署
sudo ./deploy/tencent-cloud/scripts/deploy.sh
```

## 📁 项目结构

```
new-ai-proj/
├── backend/                    # Go 后端
├── frontend/                   # React 前端
├── deploy/tencent-cloud/       # 部署配置
│   ├── sync-to-server.sh      # 同步脚本
│   ├── setup-ssh.sh           # SSH配置脚本
│   ├── docker-compose.prod.yml
│   ├── .env.prod              # 生产环境变量
│   ├── Dockerfile.backend     # 后端镜像
│   ├── Dockerfile.frontend    # 前端镜像
│   └── scripts/               # 部署脚本
└── .syncignore                # 同步排除文件
```

## ⚡ 常用命令

### 本地操作

```bash
# 预览将要同步的文件
export SERVER_IP=your-server-ip
./sync-to-server.sh --dry-run

# 完整部署流程
./sync-to-server.sh --build --deploy

# 仅同步代码
./sync-to-server.sh

# 查看帮助
./sync-to-server.sh --help
```

### 服务器操作

```bash
# 登录服务器
ssh ai-project-server

# 查看服务状态
cd /opt/ai-project
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml ps

# 查看日志
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml logs -f

# 重启服务
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml restart

# 停止服务
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml down

# 完全重新部署
sudo ./deploy/tencent-cloud/scripts/deploy.sh
```

## 🔧 环境变量配置

编辑 `deploy/tencent-cloud/.env.prod`：

```bash
# 必须修改的配置
DB_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password  
JWT_SECRET=your_very_secure_jwt_secret_key_min_32_chars

# 域名配置
DOMAIN=your-domain.com
API_DOMAIN=api.your-domain.com

# 其他配置根据需要修改
```

## 🌐 访问应用

部署完成后：

- **前端界面**: `http://your-server-ip:80`
- **API接口**: `http://your-server-ip:8000`
- **健康检查**: `http://your-server-ip:8000/api/v1/health`

## 📊 监控和日志

```bash
# 查看容器状态
sudo docker ps

# 查看资源使用
sudo docker stats

# 查看系统资源
htop
df -h

# 查看应用日志
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml logs backend
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml logs frontend
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml logs postgres
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml logs redis
```

## 🔒 安全配置

1. **防火墙设置**:
   ```bash
   sudo ufw allow 22/tcp      # SSH
   sudo ufw allow 80/tcp      # HTTP
   sudo ufw allow 443/tcp     # HTTPS
   sudo ufw enable
   ```

2. **SSL证书配置**:
   - 将SSL证书放到 `/opt/ai-project/ssl/` 目录
   - 更新Nginx配置启用HTTPS

3. **定期备份**:
   ```bash
   # 执行备份
   sudo /opt/ai-project/deploy/tencent-cloud/scripts/backup.sh
   
   # 设置定时备份
   sudo crontab -e
   # 添加: 0 2 * * * /opt/ai-project/deploy/tencent-cloud/scripts/backup.sh
   ```

## 🐛 故障排查

### 常见问题

1. **同步失败**:
   - 检查SSH连接: `ssh ai-project-server`
   - 检查服务器磁盘空间: `df -h`
   - 检查权限: `sudo chown -R ubuntu:ubuntu /opt/ai-project`

2. **服务启动失败**:
   - 查看日志: `sudo docker-compose logs`
   - 检查端口占用: `sudo netstat -tlnp`
   - 检查环境变量: `cat deploy/tencent-cloud/.env.prod`

3. **数据库连接失败**:
   - 检查PostgreSQL状态: `sudo docker-compose ps postgres`
   - 检查数据库密码配置
   - 查看数据库日志: `sudo docker-compose logs postgres`

### 重置和重新部署

```bash
# 完全清理并重新部署
cd /opt/ai-project
sudo docker-compose -f deploy/tencent-cloud/docker-compose.prod.yml down -v
sudo docker system prune -a -f
sudo rm -rf logs/* uploads/* backups/*
sudo ./deploy/tencent-cloud/scripts/deploy.sh
```

## 📞 支持和联系

如有问题，请：
1. 查看日志文件
2. 检查配置文件
3. 参考故障排查部分
4. 联系技术支持团队

---

**Happy Coding! 🎉**