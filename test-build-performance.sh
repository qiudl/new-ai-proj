#!/bin/bash

# Docker 构建性能测试脚本
# 用于测试优化前后的构建速度差异

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
cd "$PROJECT_ROOT"

echo "🧪 Docker 构建性能测试"
echo "========================"

# 函数：测试构建时间
test_build() {
    local dockerfile=$1
    local test_name=$2
    
    echo "📊 测试 $test_name..."
    
    # 清理构建缓存
    docker builder prune -f >/dev/null 2>&1 || true
    
    # 记录开始时间
    start_time=$(date +%s)
    
    # 执行构建
    echo "🏗️  开始构建..."
    docker build -f backend/$dockerfile -t ai-backend-test:$test_name backend/ --target development
    
    # 计算耗时
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo "✅ $test_name 构建完成"
    echo "⏱️  耗时: ${duration}秒 ($(($duration/60))分$(($duration%60))秒)"
    echo ""
    
    # 清理测试镜像
    docker rmi ai-backend-test:$test_name >/dev/null 2>&1 || true
    
    return $duration
}

echo "🔧 准备测试环境..."
# 确保依赖已优化
cd backend
if [ -f "optimize-deps.sh" ]; then
    echo "📦 优化 Go 依赖..."
    ./optimize-deps.sh
fi
cd ..

# 测试原始 Dockerfile
echo "1️⃣ 测试原始构建方式..."
test_build "Dockerfile" "original"
original_time=$?

echo "2️⃣ 测试优化构建方式..."
test_build "Dockerfile.optimized" "optimized" 
optimized_time=$?

# 性能对比
echo "📈 性能对比结果"
echo "========================"
echo "原始构建时间: ${original_time}秒 ($(($original_time/60))分$(($original_time%60))秒)"
echo "优化构建时间: ${optimized_time}秒 ($(($optimized_time/60))分$(($optimized_time%60))秒)"

if [ $optimized_time -lt $original_time ]; then
    improvement=$((original_time - optimized_time))
    percentage=$((improvement * 100 / original_time))
    echo "🎉 优化成功！节省了 ${improvement}秒 (${percentage}%)"
else
    echo "⚠️  优化效果不明显，可能需要进一步调整"
fi

echo ""
echo "💡 后续建议："
echo "1. 使用优化后的 Dockerfile 进行开发"
echo "2. 启用 Docker BuildKit 以获得更好的缓存"
echo "3. 考虑使用本地 Go 模块代理"
echo "4. 定期清理不必要的依赖"
