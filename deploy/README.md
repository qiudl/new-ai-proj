# AI项目管理平台 - 部署指南

## 服务器信息
- **服务器地址**: 152.136.104.251
- **SSH别名**: proj-joyloding
- **用户**: ubuntu
- **GitHub仓库**: git@github.com:qiudl/new-ai-proj.git

## 部署流程

### 1. 首次部署

#### 步骤1：连接服务器
```bash
ssh proj-joyloding
```

#### 步骤2：上传并执行服务器设置脚本
```bash
# 在本地执行
scp deploy/server-setup.sh proj-joyloding:~/
ssh proj-joyloding './server-setup.sh'
```

#### 步骤3：配置环境变量
```bash
# 在服务器上编辑生产环境配置
cd /home/ubuntu/projects/new-ai-proj
nano .env.production
```

#### 步骤4：启动服务
```bash
docker-compose up -d
```

### 2. 日常部署

#### 方法1：使用快速部署脚本（推荐）
```bash
# 在本地项目目录执行
./deploy/quick-deploy.sh
```

#### 方法2：手动部署
```bash
# 在本地推送代码
git add .
git commit -m "your commit message"
git push origin main

# 在服务器上部署
ssh proj-joyloding
cd /home/ubuntu/projects/new-ai-proj
./deploy/deploy.sh
```

### 3. 服务管理

使用服务管理脚本：
```bash
# 查看服务状态
./deploy/server-manage.sh status

# 查看日志
./deploy/server-manage.sh logs
./deploy/server-manage.sh logs backend  # 查看特定服务日志

# 重启服务
./deploy/server-manage.sh restart
./deploy/server-manage.sh restart backend  # 重启特定服务

# 停止服务
./deploy/server-manage.sh stop

# 启动服务
./deploy/server-manage.sh start

# 部署最新代码
./deploy/server-manage.sh deploy

# 备份数据
./deploy/server-manage.sh backup

# 监控服务
./deploy/server-manage.sh monitor

# 清理旧数据
./deploy/server-manage.sh cleanup

# 连接到服务器
./deploy/server-manage.sh shell
```

## 服务访问地址

- **前端**: http://152.136.104.251:3000
- **后端API**: http://152.136.104.251:8080
- **健康检查**: http://152.136.104.251:8080/health
- **版本信息**: http://152.136.104.251:8080/version
- **API文档**: http://152.136.104.251:8080/api/v1/docs

## 环境变量配置

在 `.env.production` 文件中配置以下变量：

```env
# 应用配置
APP_ENV=production
APP_NAME=AI Project Management Platform

# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_USER=user
DB_PASSWORD=your_secure_password
DB_NAME=main_db
DB_SSL_MODE=disable

# JWT配置
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRATION=24h

# 服务器配置
SERVER_HOST=0.0.0.0
PORT=8080

# 前端配置
REACT_APP_API_URL=http://152.136.104.251:8080
REACT_APP_API_BASE_URL=/api/v1
```

## 常用Docker命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [服务名]

# 重启服务
docker-compose restart [服务名]

# 停止服务
docker-compose down

# 启动服务
docker-compose up -d

# 重新构建并启动
docker-compose up -d --build

# 进入容器
docker-compose exec [服务名] bash

# 查看资源使用情况
docker stats
```

## 故障排除

### 1. 服务无法启动
```bash
# 查看详细日志
docker-compose logs [服务名]

# 检查端口占用
sudo netstat -tlnp | grep :8080

# 检查磁盘空间
df -h
```

### 2. 数据库连接失败
```bash
# 检查数据库服务状态
docker-compose ps postgres

# 进入数据库容器
docker-compose exec postgres psql -U user -d main_db

# 检查数据库日志
docker-compose logs postgres
```

### 3. 前端无法访问后端
```bash
# 检查网络连接
docker-compose exec frontend ping backend

# 检查环境变量
docker-compose exec frontend env | grep REACT_APP
```

## 备份和恢复

### 创建备份
```bash
# 使用管理脚本
./deploy/server-manage.sh backup

# 手动备份数据库
docker-compose exec postgres pg_dump -U user main_db > backup.sql
```

### 恢复数据
```bash
# 恢复数据库
docker-compose exec -T postgres psql -U user -d main_db < backup.sql
```

## 监控和日志

### 查看实时日志
```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 系统监控
```bash
# 使用管理脚本监控
./deploy/server-manage.sh monitor

# 查看系统资源
htop
free -h
df -h
```

## 安全配置

### 防火墙设置
```bash
# 查看防火墙状态
sudo ufw status

# 允许必要端口
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 8080    # 后端API
sudo ufw allow 3000    # 前端
```

### SSL证书配置
```bash
# 使用Let's Encrypt
sudo apt install certbot
sudo certbot --nginx -d your-domain.com
```

## 联系方式

如有问题，请联系开发团队或查看项目文档。