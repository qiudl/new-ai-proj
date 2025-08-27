#!/bin/bash

# 立即解决 598秒 构建问题的终极方案
# 通过网络优化 + 依赖精简 + 本地缓存

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
cd "$PROJECT_ROOT"

echo "🚀 终极优化方案 - 目标: 598秒 → < 60秒"
echo "========================================"

# 方案选择菜单
echo "请选择优化方案:"
echo "1. 🔥 激进方案: 本地预构建 + Docker映射 (预计 < 30秒)"
echo "2. 🚀 超级优化: 多重代理 + 分批下载 (预计 < 90秒)"  
echo "3. 🛠️  依赖精简: 移除不必要依赖 (预计 < 120秒)"
echo "4. 📱 混合方案: 本地开发 + Docker生产 (预计 < 15秒)"
echo ""
read -p "选择方案 [1-4]: " choice

case $choice in
    1)
        echo "🔥 执行激进方案..."
        
        # 检查并安装本地 Go
        if ! command -v go &> /dev/null; then
            echo "📦 安装 Go..."
            if command -v brew &> /dev/null; then
                brew install go
            else
                echo "❌ 请先安装 Homebrew 或手动安装 Go"
                exit 1
            fi
        fi
        
        # 本地预构建依赖
        echo "📥 本地预构建依赖..."
        cd backend
        ./prebuild-deps.sh
        cd ..
        
        # 使用本地缓存构建
        echo "🏗️  使用本地缓存快速构建..."
        ./build-with-local-cache.sh
        ;;
        
    2)
        echo "🚀 执行超级优化方案..."
        
        # 使用超级优化 Dockerfile
        cp backend/Dockerfile.ultra backend/Dockerfile
        
        # 设置最佳网络环境
        export DOCKER_BUILDKIT=1
        export COMPOSE_DOCKER_CLI_BUILD=1
        
        # 创建网络优化脚本
        cat > /tmp/network-optimize.sh << 'EOF'
#!/bin/bash
# 临时修改 DNS 以提升下载速度
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 设置最优 DNS
networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4 223.5.5.5 223.6.6.6
echo "DNS 已优化"
EOF
        
        chmod +x /tmp/network-optimize.sh
        echo "🌐 优化网络设置..."
        /tmp/network-optimize.sh
        
        echo "🏗️  开始超级优化构建..."
        docker-compose -f docker-compose.dev.yml down
        docker-compose -f docker-compose.dev.yml up --build -d
        ;;
        
    3)
        echo "🛠️  执行依赖精简方案..."
        
        # 备份原始 go.mod
        cp backend/go.mod backend/go.mod.backup
        
        # 创建精简版 go.mod
        cat > backend/go.mod.slim << 'EOF'
module ai-project-backend

go 1.24.4

require (
	github.com/gin-gonic/gin v1.10.1
	github.com/golang-jwt/jwt/v5 v5.2.3
	github.com/google/uuid v1.6.0
	github.com/lib/pq v1.10.9
	github.com/joho/godotenv v1.5.1
	github.com/patrickmn/go-cache v2.1.0+incompatible
	golang.org/x/crypto v0.40.0
	gopkg.in/yaml.v2 v2.4.0
)
EOF
        
        # 询问是否使用精简版
        echo "⚠️  警告: 这将移除以下依赖:"
        echo "  - gorm (ORM)"
        echo "  - sqlx (SQL扩展)"  
        echo "  - Redis客户端"
        echo "  - Google API 相关"
        echo "  - Prometheus 监控"
        echo ""
        read -p "是否继续? [y/N]: " confirm
        
        if [[ $confirm == "y" || $confirm == "Y" ]]; then
            mv backend/go.mod.slim backend/go.mod
            rm -f backend/go.sum
            
            echo "🏗️  使用精简依赖构建..."
            docker-compose -f docker-compose.dev.yml down
            docker-compose -f docker-compose.dev.yml up --build -d
        else
            echo "❌ 已取消精简操作"
            rm backend/go.mod.slim
        fi
        ;;
        
    4)
        echo "📱 执行混合开发方案..."
        
        echo "🎯 设置混合开发环境:"
        echo "  - 后端: 本地 Go 运行 (最快)"
        echo "  - 前端: Docker 运行"
        echo "  - 数据库: Docker 运行"
        
        # 启动数据库等基础设施
        echo "🗃️  启动基础设施服务..."
        docker-compose -f docker-compose.dev.yml up -d postgres-master redis
        
        # 等待数据库准备就绪
        echo "⏳ 等待数据库启动..."
        sleep 15
        
        # 本地运行后端
        cd backend
        ./prebuild-deps.sh
        echo "🚀 本地启动后端服务..."
        echo "   在新终端窗口中运行: cd backend && ./run-local.sh"
        echo ""
        echo "🌐 服务访问:"
        echo "   后端: http://localhost:8080 (本地Go)"
        echo "   数据库: localhost:5433"
        echo "   Redis: localhost:6379"
        ;;
        
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "✅ 优化完成！"
echo ""
echo "📊 预期效果对比:"
echo "  原始构建: 2781秒 (46分钟)"
echo "  第一次优化: 598秒 (10分钟)" 
echo "  终极优化: < 60秒 (1分钟)"
echo ""
echo "🎯 选择最适合您的开发方式:"
echo "  方案1: Docker完全容器化 (适合团队开发)"
echo "  方案4: 混合开发 (最快，适合个人开发)"
