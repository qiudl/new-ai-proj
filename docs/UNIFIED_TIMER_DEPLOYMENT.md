# 统一计时器系统部署指南

## 🚀 概述

本文档详细说明了统一计时器系统的部署流程、配置要求和最佳实践。统一计时器系统成功合并了项目任务计时和个人任务计时，提供了完整的时间跟踪解决方案。

## 📋 系统要求

### 最低硬件要求
- **CPU**: 2核心 2.0GHz
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **网络**: 稳定的互联网连接

### 推荐硬件配置
- **CPU**: 4核心 2.5GHz+
- **内存**: 8GB+ RAM
- **存储**: 50GB+ SSD
- **网络**: 100Mbps+ 带宽

### 软件依赖
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.30+
- **Node.js**: 18+ (开发环境)
- **Go**: 1.21+ (开发环境)

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Timer System                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 18.2)  │  Backend (Go 1.24)  │  Database  │
│  ├─ UniversalTimerWidget │  ├─ UnifiedTimerAPI  │  PostgreSQL│
│  ├─ useUnifiedTimer Hook │  ├─ TypeInference    │     16     │
│  ├─ SmartSuggestions    │  ├─ NotificationSvc  │            │
│  └─ TimerPreferences    │  └─ DataMigration    │            │
├─────────────────────────────────────────────────────────────┤
│                     nginx (Reverse Proxy)                   │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 快速部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd new-ai-proj
```

### 2. 环境配置
```bash
# 复制环境配置模板
cp .env.example .env.production

# 编辑生产环境配置
nano .env.production
```

### 3. 一键部署
```bash
# 开发环境
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 4. 数据库初始化
```bash
# 执行数据库迁移
./scripts/db-manager.sh init

# 应用统一计时器迁移
./scripts/db-manager.sh migrate unified-timer
```

### 5. 验证部署
```bash
# 运行部署验证脚本
./scripts/verify-deployment.sh

# 访问应用
curl http://localhost/health
```

## ⚙️ 环境配置详解

### 环境变量配置

#### 数据库配置
```bash
# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=ai_project_db
DB_SSL_MODE=require  # 生产环境推荐

# 连接池配置
DB_MAX_CONNECTIONS=25
DB_MIN_CONNECTIONS=5
DB_MAX_IDLE_TIME=300s
```

#### 后端配置
```bash
# Go 应用配置
GIN_MODE=release
LOG_LEVEL=info
SERVER_PORT=8080

# JWT 配置
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRATION=168h  # 7天

# 统一计时器配置
TIMER_MAX_CONCURRENT_SESSIONS=10
TIMER_AUTO_STOP_TIMEOUT=8h
TIMER_PAUSE_MAX_DURATION=24h
```

#### 前端配置
```bash
# React 应用配置
REACT_APP_API_URL=/api/v1
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0

# 统一计时器前端配置
REACT_APP_TIMER_POLLING_INTERVAL=30000  # 30秒
REACT_APP_TIMER_LOCAL_SYNC_INTERVAL=1000  # 1秒
REACT_APP_TIMER_OFFLINE_MODE=true
```

#### nginx配置
```bash
# SSL配置 (生产环境)
SSL_CERT_PATH=/etc/ssl/certs/your_domain.crt
SSL_KEY_PATH=/etc/ssl/private/your_domain.key
SSL_DHPARAM_PATH=/etc/ssl/certs/dhparam.pem

# 性能配置
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
NGINX_CLIENT_MAX_BODY_SIZE=64m
```

### Docker配置优化

#### 生产环境 docker-compose.prod.yml
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - GIN_MODE=release
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/prod.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/ssl
    restart: unless-stopped
```

## 🗄️ 数据库部署

### 数据库迁移脚本

统一计时器系统包含以下数据库迁移：

```sql
-- 001_unified_timer_base.sql
-- 创建统一计时器基础表结构

-- 002_timer_intelligence.sql  
-- 添加智能推断引擎相关字段

-- 003_timer_notifications.sql
-- 创建通知系统表

-- 004_timer_templates.sql
-- 添加计时模板系统

-- 005_timer_performance_indexes.sql
-- 性能优化索引
```

### 执行迁移
```bash
# 检查当前数据库版本
./scripts/db-manager.sh version

# 执行所有待处理迁移
./scripts/db-manager.sh migrate

# 验证迁移结果
./scripts/db-manager.sh validate
```

### 数据备份策略
```bash
# 每日自动备份
0 2 * * * /app/scripts/backup-database.sh daily

# 每周完整备份
0 1 * * 0 /app/scripts/backup-database.sh weekly

# 迁移前备份
./scripts/backup-database.sh pre-migration
```

## 🔐 安全配置

### SSL/TLS配置
```nginx
server {
    listen 443 ssl http2;
    server_name your_domain.com;
    
    ssl_certificate /etc/ssl/certs/your_domain.crt;
    ssl_certificate_key /etc/ssl/private/your_domain.key;
    ssl_dhparam /etc/ssl/certs/dhparam.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

### 数据库安全
```bash
# 创建受限用户
CREATE USER timer_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ai_project_db TO timer_app;
GRANT USAGE ON SCHEMA public TO timer_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO timer_app;

# 配置连接限制
ALTER USER timer_app CONNECTION LIMIT 20;
```

### 应用安全
```bash
# JWT密钥生成
openssl rand -base64 64

# 密码加密策略
BCRYPT_COST=12

# API限流配置
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60s
```

## 📊 监控配置

### 健康检查端点
- **后端**: `GET /health`
- **数据库**: `GET /health/db`
- **统一计时器**: `GET /api/v1/user/timer/health`

### 监控指标
```bash
# 系统指标
- CPU使用率
- 内存使用率
- 磁盘空间
- 网络流量

# 应用指标
- API响应时间
- 错误率
- 活跃用户数
- 计时器会话数

# 业务指标
- 每日计时时长
- 任务完成率
- 用户活跃度
- 系统使用峰值
```

### 日志配置
```yaml
# docker-compose.yml 日志配置
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🚀 性能优化

### 数据库优化
```sql
-- 创建性能索引
CREATE INDEX CONCURRENTLY idx_timer_sessions_user_id ON timer_sessions(user_id);
CREATE INDEX CONCURRENTLY idx_timer_sessions_status ON timer_sessions(status);
CREATE INDEX CONCURRENTLY idx_timer_logs_created_at ON timer_logs(created_at);

-- 配置连接池
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

### 应用优化
```bash
# Go应用优化
GOMAXPROCS=4
GOMEMLIMIT=1GiB

# nginx优化
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
gzip on;
gzip_types text/plain application/json application/javascript text/css;
```

### 前端优化
```bash
# 构建优化
npm run build -- --optimize
npm run analyze  # 分析包大小

# 缓存策略
REACT_APP_CACHE_STRATEGY=aggressive
REACT_APP_OFFLINE_SUPPORT=true
```

## 🔄 部署流程

### CI/CD管道
```yaml
# .github/workflows/deploy.yml
name: Deploy Unified Timer System

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Tests
        run: |
          ./scripts/test-all.sh
          
      - name: Build Images
        run: |
          docker-compose build
          
      - name: Deploy to Production
        run: |
          ./scripts/deploy-production.sh
```

### 滚动更新
```bash
# 零停机部署
./scripts/rolling-update.sh

# 回滚机制
./scripts/rollback.sh previous-version
```

## 🧪 部署验证

### 自动化测试
```bash
# 部署后验证
./scripts/post-deploy-tests.sh

# 包含的测试:
# - 健康检查
# - API功能测试
# - 数据库连接测试
# - 统一计时器功能测试
# - 性能基准测试
```

### 手动验证清单
- [ ] 应用可访问 (HTTP 200)
- [ ] 用户登录功能正常
- [ ] 统一计时器启动/停止正常
- [ ] 数据持久化正常
- [ ] API响应时间 < 100ms
- [ ] 错误处理正常
- [ ] 安全头配置正确
- [ ] SSL证书有效
- [ ] 日志记录正常
- [ ] 监控指标正常

## 🚨 故障排除

### 常见问题

#### 1. 统一计时器无法启动
```bash
# 检查后端日志
docker-compose logs backend | grep timer

# 验证数据库迁移
./scripts/db-manager.sh validate

# 检查API连通性
curl -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/user/timer/health
```

#### 2. 前端计时器组件错误
```bash
# 检查前端日志
docker-compose logs frontend

# 验证API集成
curl http://localhost/api/v1/user/timer/current

# 检查浏览器控制台错误
```

#### 3. 数据库连接问题
```bash
# 检查数据库状态
docker-compose exec db pg_isready

# 验证连接参数
docker-compose exec backend env | grep DB_

# 测试数据库连接
./scripts/test-db-connection.sh
```

### 日志分析
```bash
# 查看应用日志
tail -f /var/log/ai-project/app.log

# 查看nginx访问日志
tail -f /var/log/nginx/access.log

# 查看数据库日志
docker-compose logs db | tail -100
```

## 📚 维护指南

### 定期维护任务
```bash
# 每日任务
- 检查系统资源使用情况
- 验证备份完成
- 监控错误日志

# 每周任务  
- 清理过期日志
- 更新安全补丁
- 性能指标分析

# 每月任务
- 数据库维护和优化
- 安全审计
- 容量规划评估
```

### 升级流程
```bash
# 1. 备份数据
./scripts/backup-full.sh

# 2. 测试环境验证
./scripts/deploy-staging.sh

# 3. 生产环境升级
./scripts/upgrade-production.sh

# 4. 升级后验证
./scripts/post-upgrade-tests.sh
```

## 📞 支持和联系

### 技术支持
- **文档**: [项目Wiki](https://github.com/your-org/new-ai-proj/wiki)
- **问题报告**: [GitHub Issues](https://github.com/your-org/new-ai-proj/issues)
- **讨论**: [GitHub Discussions](https://github.com/your-org/new-ai-proj/discussions)

### 紧急联系
- **系统管理员**: admin@your-domain.com
- **开发团队**: dev-team@your-domain.com
- **24/7支持热线**: +1-xxx-xxx-xxxx

---

**版本**: 1.0.0  
**最后更新**: 2025-08-03  
**维护者**: AI项目管理平台开发团队

> 🚀 统一计时器系统已准备好投入生产使用！