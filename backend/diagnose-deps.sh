#!/bin/bash

# Go 依赖下载速度诊断工具
# 分析哪些依赖包下载最慢

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj/backend"
cd "$PROJECT_ROOT"

echo "🔍 Go 依赖下载速度诊断"
echo "========================"

# 测试不同代理的连接速度
test_proxy_speed() {
    local proxy=$1
    local test_package="github.com/gin-gonic/gin@latest"
    
    echo "📊 测试代理: $proxy"
    
    export GOPROXY=$proxy
    start_time=$(date +%s)
    
    timeout 30 go mod download $test_package 2>/dev/null || echo "超时或失败"
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo "   耗时: ${duration}秒"
    return $duration
}

echo "🌐 测试代理连接速度..."
echo ""

# 测试各种代理
proxies=(
    "https://goproxy.cn,direct"
    "https://goproxy.io,direct" 
    "https://proxy.golang.org,direct"
    "https://goproxy.baidu.com,direct"
    "direct"
)

best_proxy=""
best_time=999

for proxy in "${proxies[@]}"; do
    test_proxy_speed "$proxy"
    result=$?
    
    if [ $result -lt $best_time ]; then
        best_time=$result
        best_proxy=$proxy
    fi
    echo ""
done

echo "🏆 最佳代理: $best_proxy (${best_time}秒)"

# 分析大型依赖包
echo ""
echo "📦 分析项目依赖大小..."

# 获取所有直接依赖
direct_deps=$(grep -v '// indirect' go.mod | grep '^\t' | awk '{print $1}' | head -20)

echo "🔍 大型依赖包分析:"
echo "=================="

# 创建临时目录测试单个包下载速度
temp_dir=$(mktemp -d)
cd "$temp_dir"

go mod init temp-test

export GOPROXY=$best_proxy

echo "正在测试各个依赖包下载速度..."

for dep in $direct_deps; do
    if [[ $dep == github.com/* ]] || [[ $dep == google.golang.org/* ]] || [[ $dep == golang.org/* ]]; then
        echo -n "测试 $dep ... "
        
        start_time=$(date +%s)
        timeout 20 go mod download "$dep@latest" 2>/dev/null || echo -n "(失败/超时) "
        end_time=$(date +%s)
        
        duration=$((end_time - start_time))
        echo "${duration}秒"
        
        # 如果某个包特别慢，标记出来
        if [ $duration -gt 10 ]; then
            echo "   ⚠️  慢速包: $dep (${duration}秒)"
        fi
    fi
done

# 清理
cd "$PROJECT_ROOT"
rm -rf "$temp_dir"

echo ""
echo "💡 优化建议:"
echo "============"
echo "1. 使用最佳代理: export GOPROXY='$best_proxy'"
echo "2. 考虑移除下载时间 >10秒 的依赖包"
echo "3. 使用本地缓存方案: ./prebuild-deps.sh"
echo "4. 考虑混合开发模式避免 Docker 构建"

echo ""
echo "🎯 立即应用最佳配置:"
echo "export GOPROXY='$best_proxy'"
echo "export GOSUMDB=sum.golang.google.cn"

# 写入最佳配置到文件
cat > .env.goproxy << EOF
# 最佳 Go 代理配置 (由诊断工具生成)
export GOPROXY='$best_proxy'
export GOSUMDB=sum.golang.google.cn
export GONOPROXY=''
export GONOSUMDB=''
export GOPRIVATE=''
EOF

echo ""
echo "✅ 最佳配置已保存到: .env.goproxy"
echo "使用方法: source .env.goproxy"
