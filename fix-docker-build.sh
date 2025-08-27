#!/bin/bash

# 一键解决 Docker Go 构建慢问题
# 自动应用所有优化配置

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
cd "$PROJECT_ROOT"

echo "🚀 一键解决 Docker Go 构建慢问题"
echo "================================="

# 1. 设置环境变量
echo "📋 1. 设置 Docker BuildKit 环境变量..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export GOPROXY=https://goproxy.cn,https://goproxy.io,direct
export GOSUMDB=sum.golang.google.cn

# 添加到 shell profile
if ! grep -q "DOCKER_BUILDKIT" ~/.zshrc 2>/dev/null; then
    echo 'export DOCKER_BUILDKIT=1' >> ~/.zshrc
    echo 'export COMPOSE_DOCKER_CLI_BUILD=1' >> ~/.zshrc
    echo 'export GOPROXY=https://goproxy.cn,https://goproxy.io,direct' >> ~/.zshrc
    echo "✅ 环境变量已添加到 ~/.zshrc"
fi

# 2. 备份原始 Dockerfile
echo "📦 2. 备份原始配置..."
if [ -f "backend/Dockerfile" ] && [ ! -f "backend/Dockerfile.backup" ]; then
    cp backend/Dockerfile backend/Dockerfile.backup
    echo "✅ 原始 Dockerfile 已备份"
fi

# 3. 使用优化版本
echo "🔧 3. 应用优化配置..."
if [ -f "backend/Dockerfile.optimized" ]; then
    cp backend/Dockerfile.optimized backend/Dockerfile
    echo "✅ 已应用优化的 Dockerfile"
else
    echo "❌ 优化的 Dockerfile 不存在，请先创建"
    exit 1
fi

# 4. 清理现有容器和镜像
echo "🧹 4. 清理现有容器和镜像..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
docker system prune -f

# 5. 重新构建并启动
echo "🚀 5. 重新构建并启动服务..."
echo "开始时间: $(date)"
start_time=$(date +%s)

docker-compose -f docker-compose.dev.yml up --build -d

end_time=$(date +%s)
duration=$((end_time - start_time))

echo "✅ 构建完成！"
echo "耗时: ${duration}秒 ($(($duration/60))分$(($duration%60))秒)"

# 6. 检查服务状态
echo "📊 6. 检查服务状态..."
sleep 10
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🎉 优化完成！主要改进："
echo "  ✅ 使用国内 Go 代理 (goproxy.cn)"
echo "  ✅ 启用 Docker BuildKit 缓存"
echo "  ✅ 优化 Dockerfile 层结构"
echo "  ✅ 改进 .dockerignore 配置"
echo ""
echo "🌐 服务访问："
echo "  前端: http://localhost:3001"
echo "  后端: http://localhost:8081"
echo "  数据库: localhost:5433"
echo ""
echo "💡 今后重启服务请使用:"
echo "  ./restart-services.sh"
echo ""
echo "📈 如需查看详细优化报告:"
echo "  ./test-build-performance.sh"

# 7. 提示后续优化
echo ""
echo "🔧 可选的进一步优化:"
echo "  cd backend && ./analyze-deps.sh  # 分析依赖"
echo "  cd backend && ./optimize-deps.sh  # 清理依赖"
