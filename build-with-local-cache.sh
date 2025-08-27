#!/bin/bash

# 使用本地缓存构建 Docker 镜像
# 将本地的 Go 模块缓存映射到 Docker 构建过程

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
cd "$PROJECT_ROOT"

echo "🚀 使用本地缓存快速构建"
echo "========================"

# 检查本地缓存
LOCAL_GO_CACHE="$HOME/go"
if [ ! -d "$LOCAL_GO_CACHE/pkg/mod" ]; then
    echo "❌ 本地 Go 缓存不存在，请先运行:"
    echo "   cd backend && ./prebuild-deps.sh"
    exit 1
fi

echo "✅ 发现本地 Go 缓存: $LOCAL_GO_CACHE"

# 设置环境变量
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 创建临时的 docker-compose 配置，使用本地缓存
cat > docker-compose.fast-build.yml << EOF
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.fast
      target: development
      args:
        - BUILDKIT_INLINE_CACHE=1
    container_name: ai_backend_fast
    environment:
      - DB_HOST=host.docker.internal
      - DB_PORT=5433
      - DB_USER=dev_user
      - DB_PASSWORD=dev_password_2024
      - DB_NAME=ai_project_db
      - APP_ENV=development
      - PORT=8080
      - JWT_SECRET=dev_jwt_secret_key_2024
    ports:
      - "8081:8080"
    volumes:
      - ./backend:/app:cached
      # 映射本地 Go 缓存
      - $LOCAL_GO_CACHE/pkg/mod:/go/pkg/mod:ro
      - $LOCAL_GO_CACHE/cache:/go/cache:ro
    networks:
      - fast_build_network

networks:
  fast_build_network:
    driver: bridge
EOF

# 创建快速构建的 Dockerfile
cat > backend/Dockerfile.fast << 'EOF'
FROM golang:1.24-alpine AS development

RUN apk --no-cache add git ca-certificates curl

ENV GOPROXY=https://goproxy.io,direct
ENV GOPATH=/go
ENV GOCACHE=/go/cache

WORKDIR /app

# 创建用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# 复制 go mod 文件
COPY go.mod go.sum ./

# 由于使用了本地缓存映射，这里可以快速验证
RUN go mod download || echo "使用映射的本地缓存"

# 安装开发工具
RUN go install github.com/air-verse/air@latest

# 复制源码
COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["air", "-c", ".air.toml"]
EOF

echo "🏗️  开始快速构建..."
start_time=$(date +%s)

# 使用快速构建配置
docker-compose -f docker-compose.fast-build.yml down 2>/dev/null || true
docker-compose -f docker-compose.fast-build.yml up --build -d

end_time=$(date +%s)
duration=$((end_time - start_time))

echo "✅ 快速构建完成！"
echo "⏱️  构建耗时: ${duration}秒 ($(($duration/60))分$(($duration%60))秒)"

# 检查服务状态
sleep 5
docker-compose -f docker-compose.fast-build.yml ps

echo ""
echo "🌐 服务访问:"
echo "   后端: http://localhost:8081"
echo ""
echo "🔧 管理命令:"
echo "   查看日志: docker-compose -f docker-compose.fast-build.yml logs -f"
echo "   停止服务: docker-compose -f docker-compose.fast-build.yml down"

# 清理临时文件
# rm -f docker-compose.fast-build.yml backend/Dockerfile.fast
