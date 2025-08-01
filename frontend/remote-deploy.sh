#!/bin/bash

# 远程服务器一键部署脚本
# 在服务器上直接运行此脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/new-ai-proj"
USER="ubuntu"

echo -e "${BLUE}🚀 开始AI项目部署...${NC}"

# 1. 更新系统并安装必要软件
echo -e "${YELLOW}📦 更新系统...${NC}"
sudo apt-get update -y
sudo apt-get install -y curl wget git unzip tree htop

# 2. 安装Docker和Docker Compose
echo -e "${YELLOW}🐳 安装Docker...${NC}"
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. 克隆或下载项目
echo -e "${YELLOW}📥 下载项目代码...${NC}"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 如果有Git仓库，使用git clone
# git clone https://github.com/your-username/new-ai-proj.git $PROJECT_DIR

# 4. 创建项目目录结构
echo -e "${YELLOW}📁 创建项目目录...${NC}"
mkdir -p $PROJECT_DIR/{logs,backups,ssl,data/postgres}

# 5. 创建生产环境配置
echo -e "${YELLOW}⚙️ 创建生产配置...${NC}"
cat > $PROJECT_DIR/.env.prod << 'EOF'
# 生产环境配置
DB_USER=user
DB_PASSWORD=password123
DB_NAME=main_db
JWT_SECRET=your-jwt-secret-change-this-in-production
REACT_APP_API_URL=http://152.136.104.251:8080
REACT_APP_API_BASE_URL=/api/v1
EOF

# 6. 创建docker-compose.prod.yml
cat > $PROJECT_DIR/docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:16-alpine
    container_name: ai-project-postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-main_db}
      POSTGRES_USER: ${DB_USER:-user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-user} -d ${DB_NAME:-main_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ai-network

  # Go后端服务
  backend:
    image: golang:1.21-alpine
    container_name: ai-project-backend
    working_dir: /app
    volumes:
      - ./backend:/app
      - ./logs:/app/logs
    environment:
      - APP_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=${DB_USER:-user}
      - DB_PASSWORD=${DB_PASSWORD:-password}
      - DB_NAME=${DB_NAME:-main_db}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    command: sh -c "go mod tidy && go run main.go"
    networks:
      - ai-network

  # React前端服务
  frontend:
    image: node:18-alpine
    container_name: ai-project-frontend
    working_dir: /app
    volumes:
      - ./frontend:/app
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=${REACT_APP_API_URL}
      - REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
    command: sh -c "npm install && npm start"
    networks:
      - ai-network

volumes:
  postgres_data:

networks:
  ai-network:
    driver: bridge
EOF

# 7. 配置防火墙
echo -e "${YELLOW}🔥 配置防火墙...${NC}"
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 8080
sudo ufw allow 5432

echo -e "${GREEN}✅ 基础环境配置完成！${NC}"
echo -e "${YELLOW}📋 下一步：${NC}"
echo "1. 将项目代码上传到 $PROJECT_DIR"
echo "2. 进入项目目录: cd $PROJECT_DIR"
echo "3. 启动服务: docker-compose -f docker-compose.prod.yml up -d"
echo "4. 查看状态: docker-compose -f docker-compose.prod.yml ps"
echo "5. 查看日志: docker-compose -f docker-compose.prod.yml logs -f"

echo -e "${BLUE}💡 访问地址:${NC}"
echo "前端: http://152.136.104.251:3000"
echo "后端API: http://152.136.104.251:8080"
echo "数据库: 152.136.104.251:5432"