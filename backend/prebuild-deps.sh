#!/bin/bash

# 本地预构建 Go 依赖脚本
# 在主机上预先下载 Go 依赖，然后映射到容器

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj/backend"
cd "$PROJECT_ROOT"

echo "🚀 本地预构建 Go 依赖优化方案"
echo "================================"

# 检查本地 Go 环境
if ! command -v go &> /dev/null; then
    echo "❌ 本地未安装 Go，正在安装..."
    
    # macOS 安装 Go
    if command -v brew &> /dev/null; then
        brew install go
    else
        echo "请手动安装 Go: https://golang.org/dl/"
        exit 1
    fi
fi

echo "✅ Go 版本: $(go version)"

# 设置 Go 环境
export GOPROXY=https://goproxy.io,https://proxy.golang.org,https://goproxy.cn,direct
export GOSUMDB=sum.golang.google.cn
export GOPATH=$HOME/go
export GOCACHE=$HOME/go/cache

echo "📦 设置 Go 代理: $GOPROXY"

# 清理并重新创建模块缓存目录
echo "🧹 清理本地缓存..."
go clean -modcache || true
mkdir -p $GOPATH/pkg/mod $GOCACHE

# 本地下载所有依赖
echo "📥 本地下载 Go 依赖..."
start_time=$(date +%s)

# 并行下载策略
go mod download &
pid1=$!

# 等待下载完成
wait $pid1

end_time=$(date +%s)
duration=$((end_time - start_time))

echo "✅ 本地依赖下载完成！"
echo "⏱️  耗时: ${duration}秒"

# 验证依赖
echo "🔍 验证依赖..."
go mod verify

# 显示缓存位置
echo "📁 Go 模块缓存位置:"
echo "   GOPATH: $GOPATH"
echo "   Module Cache: $GOPATH/pkg/mod"
echo "   Build Cache: $GOCACHE"

echo ""
echo "💡 下一步："
echo "1. 使用本地缓存构建: ./build-with-local-cache.sh"
echo "2. 或直接本地运行: go run main.go"

# 创建本地运行脚本
cat > run-local.sh << 'EOF'
#!/bin/bash
# 本地运行 Go 服务（跳过 Docker）

export DB_HOST=localhost
export DB_PORT=5433
export DB_USER=dev_user
export DB_PASSWORD=dev_password_2024
export DB_NAME=ai_project_db
export APP_ENV=development
export PORT=8080
export JWT_SECRET=dev_jwt_secret_key_2024

echo "🚀 本地启动 Go 服务..."
echo "数据库: ${DB_HOST}:${DB_PORT}"
echo "端口: ${PORT}"

go run main.go
EOF

chmod +x run-local.sh
echo "✅ 创建了本地运行脚本: run-local.sh"
