#!/bin/bash

# 腾讯云服务器初始化和部署脚本
# 适用于 Ubuntu 20.04+ / CentOS 8+

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_DIR="/opt/new-ai-proj"
DOCKER_COMPOSE_VERSION="2.21.0"
NGINX_VERSION="latest"
USER="ubuntu"  

echo -e "${BLUE}🚀 开始腾讯云服务器初始化和项目部署${NC}"

# 函数：检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        echo -e "${RED}❌ 无法检测操作系统${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 检测到操作系统: $OS $VER${NC}"
}

# 函数：更新系统
update_system() {
    echo -e "${YELLOW}📦 更新系统包...${NC}"
    
    if [[ "$OS" == "ubuntu" ]]; then
        sudo apt-get update -y
        sudo apt-get upgrade -y
        sudo apt-get install -y curl wget git unzip tree htop
    elif [[ "$OS" == "centos" ]]; then
        sudo yum update -y
        sudo yum install -y curl wget git unzip tree htop
    fi
    
    echo -e "${GREEN}✅ 系统更新完成${NC}"
}

# 函数：安装Docker
install_docker() {
    echo -e "${YELLOW}🐳 安装Docker...${NC}"
    
    # 卸载旧版本
    if [[ "$OS" == "ubuntu" ]]; then
        sudo apt-get remove -y docker docker-engine docker.io containerd runc || true
        
        # 安装必要包
        sudo apt-get install -y \
            ca-certificates \
            curl \
            gnupg \
            lsb-release
        
        # 添加Docker官方GPG密钥
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL -o-  https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
        
        # 添加Docker仓库
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # 安装Docker
        sudo apt-get update -y
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
    elif [[ "$OS" == "centos" ]]; then
        sudo yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine || true
        
        # 安装依赖
        sudo yum install -y yum-utils
        
        # 添加Docker仓库
        sudo yum-config-manager --add-repo https://mirrors.cloud.tencent.com/docker-ce/linux/centos/docker-ce.repo
        
        # 安装Docker
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        # 启动Docker
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    # 将用户添加到docker组
    sudo usermod -aG docker $USER
    
    # 启动Docker服务
    sudo systemctl enable docker
    sudo systemctl start docker
    
    echo -e "${GREEN}✅ Docker安装完成${NC}"
}

# 函数：安装Docker Compose (standalone)
install_docker_compose() {
    echo -e "${YELLOW}🔧 安装Docker Compose...${NC}"
    
    # 下载Docker Compose
    sudo curl -L "https://get.daocloud.io/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    sudo chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    echo -e "${GREEN}✅ Docker Compose安装完成${NC}"
}

# 函数：配置防火墙
configure_firewall() {
    echo -e "${YELLOW}🔥 配置防火墙...${NC}"
    
    if [[ "$OS" == "ubuntu" ]]; then
        # Ubuntu使用ufw
        sudo ufw --force enable
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        
        # 允许SSH
        sudo ufw allow ssh
        sudo ufw allow 22
        
        # 允许HTTP/HTTPS
        sudo ufw allow 80
        sudo ufw allow 443
        
        # 允许应用端口
        sudo ufw allow 3000  # React前端
        sudo ufw allow 8080  # Go后端
        sudo ufw allow 5432  # PostgreSQL (如果需要外部访问)
        
    elif [[ "$OS" == "centos" ]]; then
        # CentOS使用firewalld
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
        
        # 允许服务
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        
        # 允许端口
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --permanent --add-port=8080/tcp
        sudo firewall-cmd --permanent --add-port=5432/tcp
        
        sudo firewall-cmd --reload
    fi
    
    echo -e "${GREEN}✅ 防火墙配置完成${NC}"
}

# 函数：创建项目目录
create_project_directory() {
    echo -e "${YELLOW}📁 创建项目目录...${NC}"
    
    # 创建项目目录
    sudo mkdir -p $PROJECT_DIR
    sudo chown -R $USER:$USER $PROJECT_DIR
    
    # 创建必要的子目录
    mkdir -p $PROJECT_DIR/logs
    mkdir -p $PROJECT_DIR/backups
    mkdir -p $PROJECT_DIR/ssl
    mkdir -p $PROJECT_DIR/data/postgres
    
    echo -e "${GREEN}✅ 项目目录创建完成${NC}"
}

# 函数：创建生产环境配置
create_production_config() {
    echo -e "${YELLOW}⚙️ 创建生产环境配置...${NC}"
    
    # 创建生产环境的docker-compose文件
    cat > $PROJECT_DIR/docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: nginx_proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/sites-available:/etc/nginx/sites-available:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - app-network

  # PostgreSQL数据库
  db:
    image: postgres:16
    container_name: postgres_prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

  # Go后端
  backend:
    image: ghcr.io/your-username/new-ai-proj/backend:latest
    container_name: go_backend_prod
    depends_on:
      db:
        condition: service_healthy
    environment:
      - GIN_MODE=release
      - DB_SOURCE=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}?sslmode=disable
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRATION=168h
      - LOG_LEVEL=info
    volumes:
      - ./logs/backend:/app/logs
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React前端
  frontend:
    image: ghcr.io/your-username/new-ai-proj/frontend:latest
    container_name: react_frontend_prod
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://your-domain.com/api
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
EOF

    # 创建环境变量文件模板
    cat > $PROJECT_DIR/.env.prod.template << 'EOF'
# 生产环境配置模板
# 复制此文件为 .env.prod 并填入实际值

# 数据库配置
DB_USER=qiudl
DB_PASSWORD=5pAoHHIPoep1HPTqyM4u7li0yvR7Qk/M3uI2pCZBmJk=
DB_NAME=proj_lodging

# JWT配置
JWT_SECRET=22i+m9h8Syz5WBEdc7za1dt5BbbstK9vA8rptpS1VHLgFjrXe46LV7gLOmo0pdCOvkI7PObiUCZPCZRF1EiqUg==

# 域名配置
DOMAIN=joylodging.com

# SSL配置
SSL_EMAIL=qiudl@joylodging.com

# 备份配置
BACKUP_RETENTION_DAYS=30
EOF

    echo -e "${GREEN}✅ 生产环境配置创建完成${NC}"
}

# 函数：创建Nginx配置
create_nginx_config() {
    echo -e "${YELLOW}🌐 创建Nginx配置...${NC}"
    
    mkdir -p $PROJECT_DIR/nginx/sites-available
    
    # 创建主Nginx配置
    cat > $PROJECT_DIR/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基本配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 包含站点配置
    include /etc/nginx/sites-available/*.conf;
}
EOF

    # 创建站点配置
    cat > $PROJECT_DIR/nginx/sites-available/default.conf << 'EOF'
server {
    listen 80;
    server_name proj.joylodging.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name proj.joylodging.com;

    # SSL配置
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # 后端API代理
    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 健康检查
    location /health {
        proxy_pass http://backend:8080/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端静态文件
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://frontend:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    echo -e "${GREEN}✅ Nginx配置创建完成${NC}"
}

# 函数：创建部署脚本
create_deployment_scripts() {
    echo -e "${YELLOW}📜 创建部署脚本...${NC}"
    
    mkdir -p $PROJECT_DIR/scripts
    
    # 创建部署脚本
    cat > $PROJECT_DIR/scripts/deploy.sh << 'EOF'
#!/bin/bash

# 生产环境部署脚本

set -e

PROJECT_DIR="/opt/new-ai-proj"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/deploy.log"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "$1" | tee -a $LOG_FILE
}

log "${YELLOW}🚀 开始部署...$(date)${NC}"

# 创建备份
log "${YELLOW}📦 创建数据库备份...${NC}"
mkdir -p $BACKUP_DIR
docker-compose exec -T db pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql

# 拉取最新镜像
log "${YELLOW}📥 拉取最新镜像...${NC}"
docker-compose -f docker-compose.prod.yml pull

# 重启服务
log "${YELLOW}🔄 重启服务...${NC}"
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# 等待服务启动
log "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 30

# 健康检查
log "${YELLOW}🔍 执行健康检查...${NC}"
if curl -f http://localhost/health > /dev/null 2>&1; then
    log "${GREEN}✅ 部署成功！${NC}"
else
    log "${RED}❌ 健康检查失败，开始回滚...${NC}"
    docker-compose -f docker-compose.prod.yml down
    # 这里可以添加回滚逻辑
    exit 1
fi

log "${GREEN}✅ 部署完成！$(date)${NC}"
EOF

    # 创建备份脚本
    cat > $PROJECT_DIR/scripts/backup.sh << 'EOF'
#!/bin/bash

# 数据库备份脚本

PROJECT_DIR="/opt/new-ai-proj"
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 创建备份
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec -T db pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 删除超过保留期的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ 备份完成: ${BACKUP_FILE}.gz"
EOF

    # 创建日志轮转脚本
    cat > $PROJECT_DIR/scripts/rotate-logs.sh << 'EOF'
#!/bin/bash

# 日志轮转脚本

PROJECT_DIR="/opt/new-ai-proj"
LOG_DIR="$PROJECT_DIR/logs"

# 轮转Nginx日志
docker-compose exec nginx nginx -s reload

# 清理超过30天的日志
find $LOG_DIR -name "*.log" -mtime +30 -delete

echo "✅ 日志轮转完成"
EOF

    # 添加执行权限
    chmod +x $PROJECT_DIR/scripts/*.sh
    
    echo -e "${GREEN}✅ 部署脚本创建完成${NC}"
}

# 函数：创建监控配置
create_monitoring_config() {
    echo -e "${YELLOW}📊 创建监控配置...${NC}"
    
    # 创建简单的监控脚本
    cat > $PROJECT_DIR/scripts/health-check.sh << 'EOF'
#!/bin/bash

# 健康检查脚本

PROJECT_DIR="/opt/new-ai-proj"
LOG_FILE="$PROJECT_DIR/logs/health-check.log"

check_service() {
    local service_name=$1
    local url=$2
    
    if curl -f $url > /dev/null 2>&1; then
        echo "$(date): ✅ $service_name is healthy" >> $LOG_FILE
        return 0
    else
        echo "$(date): ❌ $service_name is unhealthy" >> $LOG_FILE
        return 1
    fi
}

# 检查各服务
check_service "Backend API" "http://localhost/health"
check_service "Frontend" "http://localhost/"

# 检查数据库
if docker-compose exec -T db pg_isready -U $DB_USER > /dev/null 2>&1; then
    echo "$(date): ✅ Database is healthy" >> $LOG_FILE
else
    echo "$(date): ❌ Database is unhealthy" >> $LOG_FILE
fi

# 检查磁盘空间
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): ⚠️ Disk usage is high: ${DISK_USAGE}%" >> $LOG_FILE
fi
EOF

    chmod +x $PROJECT_DIR/scripts/health-check.sh
    
    echo -e "${GREEN}✅ 监控配置创建完成${NC}"
}

# 函数：设置SSL证书
setup_ssl() {
    echo -e "${YELLOW}🔒 设置SSL证书...${NC}"
    
    # 安装certbot
    if [[ "$OS" == "ubuntu" ]]; then
        sudo apt-get install -y certbot python3-certbot-nginx
    elif [[ "$OS" == "centos" ]]; then
        sudo yum install -y certbot python3-certbot-nginx
    fi
    
    echo -e "${YELLOW}📝 请手动运行以下命令来获取SSL证书：${NC}"
    echo "sudo certbot --nginx -d joylodging.com -d www.joylodging.com"
    echo "或者使用通配符证书："
    echo "sudo certbot certonly --manual --preferred-challenges=dns -d joylodging.com -d *.joylodging.com"
    
    echo -e "${GREEN}✅ SSL设置指引完成${NC}"
}

# 函数：创建定时任务
setup_cron_jobs() {
    echo -e "${YELLOW}⏰ 设置定时任务...${NC}"
    
    # 创建crontab条目
    cat > /tmp/new-ai-proj-cron << EOF
# 新AI项目定时任务

# 每天凌晨2点备份数据库
0 2 * * * $PROJECT_DIR/scripts/backup.sh

# 每天凌晨3点轮转日志
0 3 * * * $PROJECT_DIR/scripts/rotate-logs.sh

# 每5分钟健康检查
*/5 * * * * $PROJECT_DIR/scripts/health-check.sh

# 每周日凌晨4点清理Docker镜像
0 4 * * 0 docker system prune -f
EOF

    # 安装定时任务
    crontab /tmp/new-ai-proj-cron
    rm /tmp/new-ai-proj-cron
    
    echo -e "${GREEN}✅ 定时任务设置完成${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}开始腾讯云服务器配置...${NC}"
    
    detect_os
    update_system
    install_docker
    install_docker_compose
    configure_firewall
    create_project_directory
    create_production_config
    create_nginx_config
    create_deployment_scripts
    create_monitoring_config
    setup_ssl
    setup_cron_jobs
    
    echo -e "${GREEN}🎉 腾讯云服务器配置完成！${NC}"
    echo -e "${YELLOW}📋 下一步操作：${NC}"
    echo "1. 复制项目代码到 $PROJECT_DIR"
    echo "2. 复制 .env.prod.template 为 .env.prod 并配置"
    echo "3. 修改 nginx 配置中的域名"
    echo "4. 运行 docker-compose -f docker-compose.prod.yml up -d"
    echo "5. 配置SSL证书"
    echo ""
    echo -e "${BLUE}💡 有用的命令：${NC}"
    echo "查看服务状态: docker-compose -f docker-compose.prod.yml ps"
    echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "部署更新: $PROJECT_DIR/scripts/deploy.sh"
    echo "健康检查: $PROJECT_DIR/scripts/health-check.sh"
}

# 运行主函数
main "$@"