# 🚀 AI项目管理系统 - 腾讯云部署指南

## 📋 概述

本指南提供了将AI项目管理系统部署到腾讯云服务器 `152.136.104.251` 的完整步骤和最佳实践。

## 🎯 部署目标

- **服务器**: 腾讯云 152.136.104.251
- **架构**: Docker容器化部署
- **技术栈**: Go后端 + React前端 + PostgreSQL + Redis + Nginx
- **安全**: HTTPS加密，权限控制，防火墙配置
- **高可用**: 自动重启，健康检查，监控告警

## 📁 部署文件结构

```
├── docker-compose.prod.yml     # 生产环境Docker配置
├── .env.prod                   # 生产环境变量
├── nginx/
│   ├── nginx.conf             # 主Nginx配置
│   └── sites/
│       └── ai-project.conf    # 站点配置
├── scripts/
│   ├── deploy.sh              # 主部署脚本
│   ├── setup-ssl.sh           # SSL证书设置
│   └── backup.sh              # 备份脚本
├── backend/
│   └── Dockerfile.prod        # 后端生产镜像
├── frontend/
│   ├── Dockerfile.prod        # 前端生产镜像
│   └── nginx.conf             # 前端内部nginx配置
└── ssl/                       # SSL证书目录
```

## 🚀 快速部署

### 1. 服务器准备
```bash
# 登录服务器
ssh root@152.136.104.251

# 运行初始化脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/ai-project/main/scripts/init-server.sh | bash

# 重新登录以使Docker权限生效
exit && ssh user@152.136.104.251
```

### 2. 代码部署
```bash
# 克隆项目代码
git clone https://github.com/your-repo/ai-project.git /opt/ai-project
cd /opt/ai-project

# 运行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 3. 访问应用
- **HTTPS访问**: https://152.136.104.251
- **HTTP访问**: http://152.136.104.251 (自动重定向到HTTPS)
- **API文档**: https://152.136.104.251/docs
- **健康检查**: https://152.136.104.251/health

## 🔧 详细部署步骤

### 第一步：服务器环境准备

#### 1.1 系统更新
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop unzip ufw
```

#### 1.2 安装Docker
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

#### 1.3 防火墙配置
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### 第二步：项目部署

#### 2.1 克隆代码
```bash
sudo mkdir -p /opt/ai-project
sudo chown $USER:$USER /opt/ai-project
cd /opt/ai-project

git clone https://github.com/your-repo/ai-project.git .
```

#### 2.2 配置环境
```bash
# 复制生产配置
cp .env.prod .env

# 修改配置（如需要）
vim .env

# 设置权限
chmod 600 .env
```

#### 2.3 SSL证书设置
```bash
# 运行SSL设置脚本
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh 152.136.104.251
```

#### 2.4 启动服务
```bash
# 使用生产配置
cp docker-compose.prod.yml docker-compose.yml

# 构建并启动
docker-compose build --no-cache
docker-compose up -d

# 检查服务状态
docker-compose ps
docker-compose logs -f
```

### 第三步：验证部署

#### 3.1 健康检查
```bash
# 检查服务状态
curl -I https://152.136.104.251/health
curl -I https://152.136.104.251/api/v1/health

# 检查容器状态
docker-compose ps
```

#### 3.2 功能测试
```bash
# 测试前端
curl -I https://152.136.104.251

# 测试API
curl -X GET https://152.136.104.251/api/v1/health

# 测试数据库连接
docker exec ai_postgres_prod pg_isready -U ai_prod_user -d ai_project_prod
```

## 🔐 安全配置

### SSL证书管理
```bash
# 查看证书信息
openssl x509 -in ssl/cert.pem -text -noout

# 测试SSL连接
openssl s_client -connect 152.136.104.251:443 -servername 152.136.104.251

# Let's Encrypt自动续期
sudo crontab -l | grep certbot
```

### 防火墙规则
```bash
# 查看当前规则
sudo ufw status verbose

# 只允许必要端口
sudo ufw deny 5432/tcp  # PostgreSQL
sudo ufw deny 6379/tcp  # Redis
sudo ufw deny 8080/tcp  # 后端API（通过Nginx代理）
```

## 📊 监控和维护

### 日志管理
```bash
# 查看应用日志
docker-compose logs -f

# 查看Nginx日志
docker-compose logs nginx

# 查看数据库日志
docker-compose logs postgres-prod
```

### 备份管理
```bash
# 手动备份
./scripts/backup.sh

# 查看备份文件
ls -la /opt/backups/

# 设置自动备份
crontab -e
# 添加: 0 2 * * * /opt/ai-project/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### 资源监控
```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop
df -h
free -h
```

## 🛠️ 常见操作

### 更新部署
```bash
cd /opt/ai-project

# 拉取最新代码
git pull origin main

# 重新构建和部署
docker-compose build --no-cache
docker-compose up -d

# 清理旧镜像
docker system prune -f
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart nginx
docker-compose restart backend-prod

# 停止和启动
docker-compose down
docker-compose up -d
```

### 数据库操作
```bash
# 连接数据库
docker exec -it ai_postgres_prod psql -U ai_prod_user -d ai_project_prod

# 备份数据库
docker exec ai_postgres_prod pg_dump -U ai_prod_user ai_project_prod > backup.sql

# 恢复数据库
cat backup.sql | docker exec -i ai_postgres_prod psql -U ai_prod_user ai_project_prod
```

## 🚨 故障排除

### 常见问题

#### 1. 容器启动失败
```bash
# 查看容器日志
docker-compose logs [service_name]

# 检查配置文件
docker-compose config

# 重新构建镜像
docker-compose build --no-cache [service_name]
```

#### 2. SSL证书问题
```bash
# 重新生成证书
./scripts/setup-ssl.sh 152.136.104.251

# 检查证书权限
ls -la ssl/
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
```

#### 3. 数据库连接问题
```bash
# 检查数据库状态
docker exec ai_postgres_prod pg_isready -U ai_prod_user -d ai_project_prod

# 查看数据库日志
docker-compose logs postgres-prod

# 重启数据库
docker-compose restart postgres-prod
```

#### 4. 内存不足
```bash
# 清理Docker资源
docker system prune -a
docker volume prune

# 增加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 性能优化

#### 1. 数据库优化
```bash
# 连接到数据库
docker exec -it ai_postgres_prod psql -U ai_prod_user -d ai_project_prod

-- 查看连接数
SELECT count(*) FROM pg_stat_activity;

-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('ai_project_prod'));

-- 优化查询
VACUUM ANALYZE;
```

#### 2. 应用优化
```bash
# 查看应用资源使用
docker stats ai_backend_prod ai_frontend_prod

# 调整容器资源限制（在docker-compose.yml中）
# 添加:
# deploy:
#   resources:
#     limits:
#       memory: 512M
#       cpus: "0.5"
```

## 📞 技术支持

### 联系方式
- **项目地址**: https://github.com/your-repo/ai-project
- **文档地址**: https://152.136.104.251/docs
- **监控面板**: https://152.136.104.251:3001 (如果启用Grafana)

### 维护计划
- **定期备份**: 每天02:00自动备份
- **系统更新**: 每月第一个周日进行
- **证书续期**: Let's Encrypt自动续期
- **日志清理**: 保留30天日志

## 📈 扩展建议

### 高可用部署
```bash
# 多节点部署
# 1. 使用Docker Swarm或Kubernetes
# 2. 配置负载均衡
# 3. 数据库主从复制
# 4. Redis集群
```

### 监控告警
```bash
# 部署Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# 配置告警规则
# 1. CPU使用率 > 80%
# 2. 内存使用率 > 90%
# 3. 磁盘使用率 > 85%
# 4. 服务不可用
```

---

## 🎉 部署完成

按照本指南完成部署后，您将拥有一个完整的、生产就绪的AI项目管理系统，具备：

- ✅ HTTPS安全访问
- ✅ 容器化部署
- ✅ 自动备份
- ✅ 健康检查
- ✅ 日志管理
- ✅ 性能监控

**访问地址**: https://152.136.104.251

祝您使用愉快！🚀