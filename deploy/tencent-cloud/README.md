# 🚀 腾讯云快速部署指南

## 服务器信息

- **IP地址**: 152.136.104.251
- **系统**: Ubuntu
- **架构**: Docker容器化部署

## 🎯 一键部署

### 步骤1：登录服务器

```bash
ssh root@152.136.104.251
```

### 步骤2：初始化服务器环境

```bash
# 下载并运行初始化脚本
curl -fsSL https://raw.githubusercontent.com/your-username/ai-project/main/deploy/tencent-cloud/scripts/init-server.sh | bash

# 或者如果已有代码，直接运行
wget https://your-domain.com/path/to/init-server.sh
chmod +x init-server.sh
sudo ./init-server.sh
```

### 步骤3：切换到部署用户

```bash
sudo su - aiproject
```

### 步骤4：克隆项目代码

```bash
cd /opt/ai-project
git clone https://github.com/your-username/ai-project.git .

# 或者如果你有私有仓库访问权限
git clone git@github.com:your-username/ai-project.git .
```

### 步骤5：配置环境变量

```bash
# 复制生产环境配置
cp deploy/tencent-cloud/.env.prod .env

# 编辑配置文件
vim .env

# 必须修改的配置项：
# - 所有包含 "change-this" 的密码
# - DOMAIN_NAME（如果有域名的话）
# - SSL_EMAIL（如果使用域名）
```

### 步骤6：执行部署

```bash
# 运行部署脚本
./deploy/tencent-cloud/scripts/deploy.sh

# 或者设置域名环境变量后部署
DOMAIN_NAME=yourdomain.com ./deploy/tencent-cloud/scripts/deploy.sh
```

## 🔧 配置详情

### 环境变量配置

重要的环境变量需要修改：

```bash
# 应用密钥（必须修改）
APP_SECRET=your-super-secret-app-key-change-this-in-production

# 数据库密码（必须修改）
POSTGRES_PASSWORD=your-super-strong-postgres-password-change-this

# Redis密码（必须修改）
REDIS_PASSWORD=your-super-strong-redis-password-change-this

# JWT密钥（必须修改）
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# 域名配置（可选）
DOMAIN_NAME=152.136.104.251  # 默认使用IP地址
SSL_EMAIL=your-email@domain.com

# 前端API地址
REACT_APP_API_BASE_URL=https://152.136.104.251/api/v1
```

### SSL证书配置

#### 方案1：使用IP地址访问（推荐用于测试）

默认情况下，脚本会为IP地址生成自签名证书，可以直接访问：
- `https://152.136.104.251`

浏览器会显示安全警告，点击"高级" -> "继续访问"即可。

#### 方案2：使用域名访问（推荐用于生产）

如果你有域名，可以：

1. 将域名解析到服务器IP：
   ```
   A记录: yourdomain.com -> 152.136.104.251
   ```

2. 设置域名环境变量：
   ```bash
   export DOMAIN_NAME=yourdomain.com
   export SSL_EMAIL=admin@yourdomain.com
   ```

3. 运行部署脚本，会自动申请Let's Encrypt证书

## 🎛️ 管理命令

### 查看服务状态

```bash
cd /opt/ai-project
docker-compose ps
docker-compose logs -f
```

### 重启服务

```bash
docker-compose restart
# 或重启特定服务
docker-compose restart nginx-prod
docker-compose restart backend-prod
```

### 更新代码

```bash
cd /opt/ai-project
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### 备份数据

```bash
# 手动备份
./deploy/tencent-cloud/scripts/backup.sh

# 查看备份文件
ls -la /opt/ai-project/backups/
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend-prod
docker-compose logs nginx-prod
docker-compose logs postgres-prod

# 实时查看日志
docker-compose logs -f
```

## 📊 系统监控

### 资源使用情况

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看系统负载
htop
```

### 健康检查

```bash
# 检查服务健康状态
curl -I https://152.136.104.251/health
curl -I https://152.136.104.251/api/v1/health

# 检查数据库连接
docker exec ai_postgres_prod pg_isready -U ai_prod_user -d ai_project_prod

# 检查Redis连接
docker exec ai_redis_prod redis-cli -a "$(grep REDIS_PASSWORD .env | cut -d'=' -f2)" ping
```

## 🛠️ 故障排除

### 常见问题

#### 1. 容器无法启动

```bash
# 查看容器状态
docker-compose ps

# 查看详细错误日志
docker-compose logs [service-name]

# 重新构建镜像
docker-compose build --no-cache [service-name]
```

#### 2. 无法访问网站

```bash
# 检查防火墙状态
sudo ufw status

# 检查nginx配置
docker-compose logs nginx-prod

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

#### 3. 数据库连接问题

```bash
# 检查数据库容器状态
docker exec ai_postgres_prod pg_isready -U ai_prod_user -d ai_project_prod

# 查看数据库日志
docker-compose logs postgres-prod

# 进入数据库容器
docker exec -it ai_postgres_prod psql -U ai_prod_user -d ai_project_prod
```

#### 4. SSL证书问题

```bash
# 检查证书文件
ls -la /opt/ai-project/ssl/

# 重新生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/privkey.pem \
    -out ssl/fullchain.pem \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=AI Project/CN=152.136.104.251"

# 如果使用域名，重新申请Let's Encrypt证书
sudo certbot certonly --standalone -d yourdomain.com
```

## 🔐 安全建议

### 1. 修改默认密码

确保修改了所有默认密码：
- PostgreSQL数据库密码
- Redis密码
- JWT密钥
- 应用密钥

### 2. 启用防火墙

```bash
sudo ufw status
# 应该只开放 22(SSH), 80(HTTP), 443(HTTPS) 端口
```

### 3. 定期更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 4. 设置自动备份

备份脚本已配置为每天凌晨2点自动运行，检查cron任务：

```bash
sudo crontab -l | grep backup
```

## 📋 访问地址

部署完成后，可以通过以下地址访问：

- **主页**: https://152.136.104.251
- **API文档**: https://152.136.104.251/docs
- **健康检查**: https://152.136.104.251/health
- **API基础地址**: https://152.136.104.251/api/v1

## 🚀 下一步

1. **测试系统功能**：访问前端界面，测试登录、项目管理等功能
2. **配置域名**：如果有域名，配置DNS解析和SSL证书
3. **设置监控**：配置系统监控和告警
4. **备份策略**：确认自动备份正常工作
5. **性能优化**：根据实际使用情况调整资源配置

## ❓ 获得帮助

如果遇到问题：

1. 查看日志：`docker-compose logs -f`
2. 检查配置：确认`.env`文件配置正确
3. 重启服务：`docker-compose restart`
4. 查看系统状态：`htop`, `df -h`, `docker stats`

---

**部署成功后记得保存好数据库密码等重要信息！**