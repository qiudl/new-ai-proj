# 生产环境 SCP + Build 部署方案

> 任务ID: 3836
> 创建时间: 2025-11-22
> 目标: 使用 SCP 上传代码 + 直接构建运行，替代 Docker 部署

## 1. 方案概述

### 1.1 目标
- 使用 SCP 上传代码到服务器
- 在服务器上直接编译运行（非 Docker）
- 提高部署速度，解决 Docker 构建慢的问题

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        生产服务器                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Nginx     │────▶│  Backend    │────▶│ PostgreSQL  │       │
│  │  (反向代理)  │     │  (Go Binary)│     │  (数据库)   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                                       │               │
│         │            ┌─────────────┐           │               │
│         └───────────▶│  Frontend   │           │               │
│                      │  (静态文件)  │           │               │
│                      └─────────────┘           │               │
│                                                │               │
│                      ┌─────────────┐           │               │
│                      │   Redis     │◀──────────┘               │
│                      │  (缓存)     │                           │
│                      └─────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 部署流程

```
本地/CI ──构建──▶ 二进制+静态文件 ──SCP──▶ 服务器 ──重启──▶ 上线
```

## 2. 服务器环境准备

### 2.1 系统要求
- OS: Ubuntu 22.04 LTS
- CPU: 2核+
- 内存: 4GB+
- 磁盘: 40GB+

### 2.2 安装依赖脚本

```bash
#!/bin/bash
# scripts/prod/install-deps.sh - 安装服务器依赖

set -e

echo "=========================================="
echo "🔧 安装生产环境依赖"
echo "=========================================="

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y \
    curl wget git vim htop \
    build-essential \
    nginx \
    postgresql postgresql-contrib \
    redis-server \
    supervisor \
    certbot python3-certbot-nginx \
    jq

# 安装 Go 1.24 (如果需要在服务器构建)
GO_VERSION="1.24.0"
if ! command -v go &> /dev/null; then
    echo "📦 安装 Go ${GO_VERSION}..."
    wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
    rm go${GO_VERSION}.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee /etc/profile.d/go.sh
    source /etc/profile.d/go.sh
fi

# 验证安装
echo ""
echo "=========================================="
echo "✅ 安装完成，版本信息："
echo "=========================================="
go version || echo "Go 未安装"
nginx -v
psql --version
redis-server --version
supervisord --version
```

### 2.3 创建部署用户和目录

```bash
#!/bin/bash
# scripts/prod/setup-user.sh - 创建部署用户

set -e

DEPLOY_USER="aiproject"
DEPLOY_DIR="/opt/ai-project"

# 创建专用部署用户
if ! id "$DEPLOY_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash $DEPLOY_USER
    sudo usermod -aG sudo $DEPLOY_USER
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/supervisorctl, /usr/bin/nginx, /usr/bin/systemctl" | sudo tee /etc/sudoers.d/$DEPLOY_USER
fi

# 创建部署目录结构
sudo mkdir -p $DEPLOY_DIR/{backend,frontend/build,config,logs,backups,ssl,scripts}
sudo chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_DIR

echo "✅ 用户 $DEPLOY_USER 和目录 $DEPLOY_DIR 创建完成"
```

## 3. 目录结构

```
/opt/ai-project/
├── backend/                 # 后端
│   ├── ai-backend          # 编译后的二进制文件
│   ├── migrations/         # 数据库迁移文件
│   └── .env.prod           # 环境变量
├── frontend/               # 前端静态文件
│   └── build/
│       ├── index.html
│       ├── static/
│       └── ...
├── config/                 # 配置文件
├── logs/                   # 日志目录
│   ├── backend.log
│   └── backend.err
├── backups/                # 备份目录
├── ssl/                    # SSL证书
│   ├── fullchain.pem
│   └── privkey.pem
└── scripts/                # 部署脚本
    ├── start.sh
    ├── stop.sh
    ├── restart.sh
    └── health-check.sh
```

## 4. 本地部署脚本

### 4.1 主部署脚本 (scripts/prod/deploy-scp.sh)

```bash
#!/bin/bash
# scripts/prod/deploy-scp.sh - 从本地部署到生产服务器

set -e

# ============= 配置 =============
SERVER_IP="${PROD_SERVER_IP:-152.136.104.251}"
SERVER_USER="${PROD_SERVER_USER:-aiproject}"
DEPLOY_DIR="/opt/ai-project"
SSH_KEY="${PROD_SSH_KEY:-~/.ssh/id_rsa}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# ============= 1. 本地构建 =============
build_backend() {
    log "构建后端二进制文件 (Linux amd64)..."
    cd "$PROJECT_ROOT/backend"

    # 交叉编译为 Linux
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w -X main.BuildTime=$(date -u +%Y%m%d_%H%M%S)" \
        -o ai-backend main.go

    ls -lh ai-backend
    log_success "后端构建完成: $(du -h ai-backend | cut -f1)"
}

build_frontend() {
    log "构建前端静态文件..."
    cd "$PROJECT_ROOT/frontend"

    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        npm ci
    fi

    # 构建
    REACT_APP_API_URL="${API_URL:-https://ai.example.com/api/v1}" \
    GENERATE_SOURCEMAP=false \
    npm run build

    log_success "前端构建完成: $(du -sh build | cut -f1)"
}

# ============= 2. 打包文件 =============
package_files() {
    log "打包部署文件..."
    cd "$PROJECT_ROOT"

    # 打包后端
    tar -czf /tmp/backend-deploy.tar.gz \
        -C backend ai-backend \
        -C "$PROJECT_ROOT/backend" migrations

    # 打包前端
    tar -czf /tmp/frontend-deploy.tar.gz \
        -C "$PROJECT_ROOT/frontend" build

    log_success "打包完成"
    ls -lh /tmp/*-deploy.tar.gz
}

# ============= 3. 上传文件 =============
upload_files() {
    log "上传文件到服务器..."

    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
        /tmp/backend-deploy.tar.gz \
        /tmp/frontend-deploy.tar.gz \
        "$SERVER_USER@$SERVER_IP:/tmp/"

    log_success "文件上传完成"
}

# ============= 4. 远程部署 =============
deploy_remote() {
    log "执行远程部署..."

    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
        set -e

        DEPLOY_DIR="/opt/ai-project"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)

        echo "📦 备份当前版本..."
        if [ -f "$DEPLOY_DIR/backend/ai-backend" ]; then
            cp "$DEPLOY_DIR/backend/ai-backend" "$DEPLOY_DIR/backups/ai-backend.$TIMESTAMP"
        fi

        echo "📥 解压新版本..."
        cd "$DEPLOY_DIR"

        # 解压后端
        tar -xzf /tmp/backend-deploy.tar.gz -C backend/

        # 解压前端
        rm -rf frontend/build
        tar -xzf /tmp/frontend-deploy.tar.gz -C frontend/

        # 设置权限
        chmod +x backend/ai-backend

        echo "🔄 重启服务..."
        sudo supervisorctl restart ai-backend

        echo "🔄 重载 Nginx..."
        sudo nginx -t && sudo systemctl reload nginx

        echo "🧹 清理临时文件..."
        rm -f /tmp/backend-deploy.tar.gz /tmp/frontend-deploy.tar.gz

        # 保留最近10个备份
        cd "$DEPLOY_DIR/backups"
        ls -t ai-backend.* 2>/dev/null | tail -n +11 | xargs -r rm -f

        echo "✅ 远程部署完成"
ENDSSH

    log_success "远程部署完成"
}

# ============= 5. 健康检查 =============
health_check() {
    log "执行健康检查..."

    local max_retries=10
    local retry=0

    while [ $retry -lt $max_retries ]; do
        sleep 3
        if curl -sf "http://$SERVER_IP:8080/health" > /dev/null 2>&1; then
            log_success "健康检查通过"
            return 0
        fi
        retry=$((retry + 1))
        echo -n "."
    done

    echo ""
    log_error "健康检查失败"

    # 显示日志
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "tail -20 $DEPLOY_DIR/logs/backend.log"

    return 1
}

# ============= 主流程 =============
main() {
    echo ""
    echo "=========================================="
    echo "🚀 生产环境部署 (SCP + Build)"
    echo "=========================================="
    echo "  服务器: $SERVER_USER@$SERVER_IP"
    echo "  部署目录: $DEPLOY_DIR"
    echo "=========================================="
    echo ""

    local start_time=$(date +%s)

    # 解析参数
    local skip_frontend=false
    local skip_backend=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-frontend) skip_frontend=true; shift ;;
            --skip-backend) skip_backend=true; shift ;;
            --backend-only) skip_frontend=true; shift ;;
            --frontend-only) skip_backend=true; shift ;;
            *) shift ;;
        esac
    done

    # 构建
    if [ "$skip_backend" = false ]; then
        build_backend
    fi

    if [ "$skip_frontend" = false ]; then
        build_frontend
    fi

    # 打包和上传
    package_files
    upload_files

    # 部署
    deploy_remote

    # 健康检查
    health_check

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "=========================================="
    log_success "🎉 部署成功完成!"
    echo "  耗时: ${duration}秒"
    echo "  访问: https://$SERVER_IP"
    echo "=========================================="
}

main "$@"
```

## 5. 服务器端脚本

### 5.1 启动脚本 (scripts/prod/server/start.sh)

```bash
#!/bin/bash
# 启动后端服务 (手动模式，通常使用 Supervisor)

DEPLOY_DIR="/opt/ai-project"
cd "$DEPLOY_DIR/backend"

# 加载环境变量
set -a
source .env.prod
set +a

# 启动服务
./ai-backend >> "$DEPLOY_DIR/logs/backend.log" 2>> "$DEPLOY_DIR/logs/backend.err" &
echo $! > "$DEPLOY_DIR/backend.pid"

echo "✅ Backend started with PID $(cat $DEPLOY_DIR/backend.pid)"
```

### 5.2 停止脚本 (scripts/prod/server/stop.sh)

```bash
#!/bin/bash
# 停止后端服务

DEPLOY_DIR="/opt/ai-project"
PID_FILE="$DEPLOY_DIR/backend.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Stopping backend (PID: $PID)..."
        kill "$PID"
        sleep 2
        if ps -p "$PID" > /dev/null 2>&1; then
            kill -9 "$PID"
        fi
        echo "✅ Backend stopped"
    else
        echo "⚠️ Backend not running (stale PID file)"
    fi
    rm -f "$PID_FILE"
else
    echo "⚠️ PID file not found"
    # 尝试通过进程名停止
    pkill -f "ai-backend" || true
fi
```

### 5.3 健康检查脚本 (scripts/prod/server/health-check.sh)

```bash
#!/bin/bash
# 健康检查脚本

DEPLOY_DIR="/opt/ai-project"
HEALTH_URL="http://localhost:8080/health"

check_backend() {
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo "✅ Backend: healthy"
        return 0
    else
        echo "❌ Backend: unhealthy"
        return 1
    fi
}

check_nginx() {
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx: running"
        return 0
    else
        echo "❌ Nginx: not running"
        return 1
    fi
}

check_postgres() {
    if pg_isready -q; then
        echo "✅ PostgreSQL: ready"
        return 0
    else
        echo "❌ PostgreSQL: not ready"
        return 1
    fi
}

check_redis() {
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis: running"
        return 0
    else
        echo "❌ Redis: not running"
        return 1
    fi
}

echo "=========================================="
echo "🔍 系统健康检查"
echo "=========================================="

check_backend
check_nginx
check_postgres
check_redis

echo "=========================================="
```

## 6. Supervisor 配置

```ini
; /etc/supervisor/conf.d/ai-backend.conf

[program:ai-backend]
command=/opt/ai-project/backend/ai-backend
directory=/opt/ai-project/backend
user=aiproject
autostart=true
autorestart=true
startsecs=5
startretries=3
stopwaitsecs=10
killasgroup=true
stopasgroup=true

; 日志配置
redirect_stderr=true
stdout_logfile=/opt/ai-project/logs/backend.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=5
stderr_logfile=/opt/ai-project/logs/backend.err
stderr_logfile_maxbytes=10MB
stderr_logfile_backups=3

; 环境变量
environment=GIN_MODE="release",APP_ENV="production"

; 从环境文件加载
; 注意：Supervisor 不直接支持 .env 文件，需要在启动前 source
```

安装配置：

```bash
# 复制配置文件
sudo cp /opt/ai-project/config/ai-backend.conf /etc/supervisor/conf.d/

# 重新加载配置
sudo supervisorctl reread
sudo supervisorctl update

# 常用命令
sudo supervisorctl status ai-backend
sudo supervisorctl start ai-backend
sudo supervisorctl stop ai-backend
sudo supervisorctl restart ai-backend
sudo supervisorctl tail -f ai-backend
```

## 7. Nginx 配置

### 7.1 主配置 (/etc/nginx/sites-available/ai-project)

```nginx
# AI项目管理系统 - 非Docker版Nginx配置

upstream backend {
    server 127.0.0.1:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name ai.example.com;

    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 主站点
server {
    listen 443 ssl http2;
    server_name ai.example.com;

    # SSL 证书
    ssl_certificate /opt/ai-project/ssl/fullchain.pem;
    ssl_certificate_key /opt/ai-project/ssl/privkey.pem;

    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 前端静态文件
    root /opt/ai-project/frontend/build;
    index index.html;

    # API 代理
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 缓冲区
        proxy_buffer_size 4k;
        proxy_buffers 4 32k;
        proxy_busy_buffers_size 64k;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    # 文件上传
    location /api/v1/upload {
        client_max_body_size 50m;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 静态资源缓存
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1M;
        add_header Cache-Control "public";
        access_log off;
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 7.2 启用站点

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/ai-project /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

## 8. 环境变量配置

### 8.1 后端环境变量 (/opt/ai-project/backend/.env.prod)

```bash
# 应用配置
APP_ENV=production
GIN_MODE=release
PORT=8080
LOG_LEVEL=info

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=ai_prod_user
DB_PASSWORD=<your-secure-password>
DB_NAME=ai_project_prod
DB_SSL_MODE=disable
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=10

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
REDIS_DB=0

# JWT配置
JWT_SECRET=<your-super-secret-jwt-key-at-least-32-chars>
JWT_EXPIRATION=24h

# 功能开关
FEATURE_SUPERADMIN_ENABLE=true
SUPER_ADMIN_USERNAMES=admin

# CORS配置
CORS_ORIGINS=https://ai.example.com
```

## 9. 数据库配置

### 9.1 PostgreSQL 初始化

```bash
#!/bin/bash
# scripts/prod/setup-database.sh

# 创建数据库用户和数据库
sudo -u postgres psql << 'EOF'
-- 创建用户
CREATE USER ai_prod_user WITH PASSWORD 'your-secure-password';

-- 创建数据库
CREATE DATABASE ai_project_prod
    OWNER ai_prod_user
    ENCODING 'UTF8'
    LC_COLLATE 'en_US.UTF-8'
    LC_CTYPE 'en_US.UTF-8';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE ai_project_prod TO ai_prod_user;

-- 连接到数据库并授权schema
\c ai_project_prod
GRANT ALL ON SCHEMA public TO ai_prod_user;
EOF

echo "✅ 数据库初始化完成"
```

### 9.2 Redis 配置

```bash
# /etc/redis/redis.conf 关键配置
bind 127.0.0.1
port 6379
requirepass your-redis-password
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
```

## 10. GitHub Actions 工作流

```yaml
# .github/workflows/deploy-scp-build.yml

name: Deploy via SCP + Build

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Deployment reason'
        required: false
        default: 'Manual deployment'
      skip_frontend:
        description: 'Skip frontend build'
        type: boolean
        default: false
      skip_backend:
        description: 'Skip backend build'
        type: boolean
        default: false

env:
  GO_VERSION: '1.24'
  NODE_VERSION: '20'

jobs:
  build-and-deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest
    environment: production
    timeout-minutes: 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Go
        if: ${{ !inputs.skip_backend }}
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Setup Node.js
        if: ${{ !inputs.skip_frontend }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Build Backend
        if: ${{ !inputs.skip_backend }}
        run: |
          cd backend
          echo "🔨 Building backend..."
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
            -ldflags="-s -w -X main.Version=${{ github.sha }} -X main.BuildTime=$(date -u +%Y%m%d_%H%M%S)" \
            -o ai-backend main.go
          ls -lh ai-backend
          echo "✅ Backend build complete"

      - name: Build Frontend
        if: ${{ !inputs.skip_frontend }}
        run: |
          cd frontend
          echo "🔨 Building frontend..."
          npm ci
          REACT_APP_API_URL=${{ secrets.API_URL }} \
          GENERATE_SOURCEMAP=false \
          npm run build
          echo "✅ Frontend build complete"

      - name: Package artifacts
        run: |
          echo "📦 Packaging..."

          if [ "${{ inputs.skip_backend }}" != "true" ]; then
            tar -czf backend-deploy.tar.gz \
              -C backend ai-backend \
              -C ${{ github.workspace }}/backend migrations
          fi

          if [ "${{ inputs.skip_frontend }}" != "true" ]; then
            tar -czf frontend-deploy.tar.gz \
              -C frontend build
          fi

          ls -lh *.tar.gz 2>/dev/null || echo "No packages created"

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PROD_SSH_KEY }}" | base64 -d > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.PROD_SSH_HOST }} >> ~/.ssh/known_hosts 2>/dev/null

      - name: Upload files
        run: |
          echo "📤 Uploading to server..."

          for file in backend-deploy.tar.gz frontend-deploy.tar.gz; do
            if [ -f "$file" ]; then
              scp -i ~/.ssh/deploy_key "$file" ${{ secrets.PROD_SSH_USER }}@${{ secrets.PROD_SSH_HOST }}:/tmp/
              echo "  Uploaded: $file"
            fi
          done

      - name: Deploy on server
        run: |
          ssh -i ~/.ssh/deploy_key ${{ secrets.PROD_SSH_USER }}@${{ secrets.PROD_SSH_HOST }} << 'ENDSSH'
            set -e

            DEPLOY_DIR="/opt/ai-project"
            TIMESTAMP=$(date +%Y%m%d_%H%M%S)

            echo "=========================================="
            echo "🚀 Starting deployment..."
            echo "=========================================="

            # 备份
            if [ -f "$DEPLOY_DIR/backend/ai-backend" ]; then
              echo "📦 Backing up current version..."
              cp "$DEPLOY_DIR/backend/ai-backend" "$DEPLOY_DIR/backups/ai-backend.$TIMESTAMP"
            fi

            cd "$DEPLOY_DIR"

            # 解压后端
            if [ -f "/tmp/backend-deploy.tar.gz" ]; then
              echo "📥 Extracting backend..."
              tar -xzf /tmp/backend-deploy.tar.gz -C backend/
              chmod +x backend/ai-backend
            fi

            # 解压前端
            if [ -f "/tmp/frontend-deploy.tar.gz" ]; then
              echo "📥 Extracting frontend..."
              rm -rf frontend/build
              tar -xzf /tmp/frontend-deploy.tar.gz -C frontend/
            fi

            # 重启服务
            echo "🔄 Restarting backend..."
            sudo supervisorctl restart ai-backend

            echo "🔄 Reloading nginx..."
            sudo nginx -t && sudo systemctl reload nginx

            # 清理
            echo "🧹 Cleaning up..."
            rm -f /tmp/backend-deploy.tar.gz /tmp/frontend-deploy.tar.gz

            # 保留最近10个备份
            cd "$DEPLOY_DIR/backups"
            ls -t ai-backend.* 2>/dev/null | tail -n +11 | xargs -r rm -f

            echo "=========================================="
            echo "✅ Deployment complete!"
            echo "=========================================="
          ENDSSH

      - name: Health Check
        run: |
          echo "🔍 Running health check..."
          sleep 10

          for i in {1..5}; do
            if curl -sf "${{ secrets.HEALTH_URL }}" > /dev/null; then
              echo "✅ Health check passed!"
              exit 0
            fi
            echo "  Attempt $i failed, retrying..."
            sleep 5
          done

          echo "❌ Health check failed!"
          exit 1

      - name: Deployment Summary
        if: always()
        run: |
          echo "=========================================="
          echo "📊 Deployment Summary"
          echo "=========================================="
          echo "  Status: ${{ job.status }}"
          echo "  Commit: ${{ github.sha }}"
          echo "  Reason: ${{ inputs.reason }}"
          echo "  Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
          echo "  Skip Frontend: ${{ inputs.skip_frontend }}"
          echo "  Skip Backend: ${{ inputs.skip_backend }}"
          echo "=========================================="
```

## 11. 回滚方案

```bash
#!/bin/bash
# scripts/prod/server/rollback.sh - 快速回滚

set -e

DEPLOY_DIR="/opt/ai-project"
BACKUPS_DIR="$DEPLOY_DIR/backups"

# 列出可用备份
echo "可用备份:"
ls -lt "$BACKUPS_DIR/ai-backend."* 2>/dev/null | head -10 | awk '{print NR". "$NF}'

if [ -z "$1" ]; then
    # 使用最新备份
    BACKUP_FILE=$(ls -t "$BACKUPS_DIR/ai-backend."* 2>/dev/null | head -1)
else
    # 使用指定备份
    BACKUP_FILE="$BACKUPS_DIR/ai-backend.$1"
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 未找到备份文件"
    exit 1
fi

echo ""
echo "将回滚到: $BACKUP_FILE"
read -p "确认回滚? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 停止服务
echo "🔄 停止服务..."
sudo supervisorctl stop ai-backend

# 备份当前版本（以防需要恢复）
if [ -f "$DEPLOY_DIR/backend/ai-backend" ]; then
    cp "$DEPLOY_DIR/backend/ai-backend" "$BACKUPS_DIR/ai-backend.pre-rollback.$(date +%Y%m%d_%H%M%S)"
fi

# 恢复备份
echo "📥 恢复备份..."
cp "$BACKUP_FILE" "$DEPLOY_DIR/backend/ai-backend"
chmod +x "$DEPLOY_DIR/backend/ai-backend"

# 启动服务
echo "🚀 启动服务..."
sudo supervisorctl start ai-backend

# 健康检查
sleep 5
if curl -sf "http://localhost:8080/health" > /dev/null; then
    echo "✅ 回滚成功，服务正常"
else
    echo "❌ 回滚后服务异常，请检查日志"
    exit 1
fi
```

## 12. 监控和日志

### 12.1 日志轮转配置

```bash
# /etc/logrotate.d/ai-project
/opt/ai-project/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 aiproject aiproject
    sharedscripts
    postrotate
        supervisorctl signal HUP ai-backend > /dev/null 2>&1 || true
    endscript
}
```

### 12.2 简单监控脚本

```bash
#!/bin/bash
# scripts/prod/server/monitor.sh - 简单监控

HEALTH_URL="http://localhost:8080/health"
ALERT_EMAIL="admin@example.com"

check_and_restart() {
    if ! curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo "[$(date)] ❌ Backend unhealthy, attempting restart..."
        sudo supervisorctl restart ai-backend
        sleep 10

        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            echo "[$(date)] ✅ Backend recovered after restart"
        else
            echo "[$(date)] ❌ Backend still unhealthy after restart"
            # 可选：发送告警邮件
            # echo "Backend is down" | mail -s "AI Project Alert" $ALERT_EMAIL
        fi
    fi
}

# 作为 cron 任务运行
# */5 * * * * /opt/ai-project/scripts/monitor.sh >> /opt/ai-project/logs/monitor.log 2>&1

check_and_restart
```

## 13. 性能对比

| 指标 | Docker 部署 | SCP + Build 部署 |
|------|------------|-----------------|
| 首次构建时间 | 5-10 分钟 | 2-3 分钟 |
| 增量部署时间 | 3-5 分钟 | 30-60 秒 |
| 内存占用 | ~500MB (含容器) | ~200MB |
| 启动时间 | 10-30 秒 | 3-5 秒 |
| 回滚速度 | 1-2 分钟 | 10 秒 |
| 磁盘占用 | 高 (镜像层) | 低 |

## 14. 实施检查清单

### 14.1 服务器准备
- [ ] Ubuntu 22.04 LTS 安装完成
- [ ] 基础依赖安装 (nginx, postgresql, redis, supervisor)
- [ ] Go 环境安装 (可选，仅本地构建时不需要)
- [ ] 部署用户 aiproject 创建
- [ ] 目录结构创建 /opt/ai-project/*

### 14.2 配置完成
- [ ] PostgreSQL 数据库和用户创建
- [ ] Redis 配置完成
- [ ] Nginx 配置文件部署
- [ ] Supervisor 配置文件部署
- [ ] SSL 证书配置
- [ ] 环境变量文件 .env.prod 配置

### 14.3 部署验证
- [ ] 本地构建测试通过
- [ ] SCP 上传测试通过
- [ ] 服务启动正常
- [ ] 健康检查通过
- [ ] 前端页面访问正常
- [ ] API 接口正常

### 14.4 运维准备
- [ ] 日志轮转配置
- [ ] 监控脚本部署
- [ ] 备份策略确认
- [ ] 回滚脚本测试

## 15. 故障排除

### 15.1 常见问题

**问题：后端启动失败**
```bash
# 查看日志
tail -100 /opt/ai-project/logs/backend.log
tail -100 /opt/ai-project/logs/backend.err

# 检查端口占用
lsof -i :8080

# 手动启动测试
cd /opt/ai-project/backend
./ai-backend
```

**问题：Nginx 502 Bad Gateway**
```bash
# 检查后端是否运行
curl http://localhost:8080/health

# 检查 Nginx 错误日志
tail -100 /var/log/nginx/error.log

# 测试配置
sudo nginx -t
```

**问题：数据库连接失败**
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -h localhost -U ai_prod_user -d ai_project_prod

# 检查 pg_hba.conf 配置
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep ai_prod_user
```

### 15.2 紧急恢复

```bash
# 快速回滚到上一版本
cd /opt/ai-project
sudo supervisorctl stop ai-backend
cp backups/ai-backend.$(ls -t backups/ai-backend.* | head -1 | xargs basename) backend/ai-backend
chmod +x backend/ai-backend
sudo supervisorctl start ai-backend
```

---

**文档版本**: 1.0
**最后更新**: 2025-11-22
**维护者**: AI Project Team
