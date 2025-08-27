#!/bin/bash

# Go 依赖分析脚本
# 分析当前依赖，找出可以优化的部分

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj/backend"
cd "$PROJECT_ROOT"

echo "🔍 Go 依赖分析报告"
echo "========================"

echo "📦 当前依赖统计："
echo "直接依赖: $(grep -v '// indirect' go.mod | grep -c '^\t' || echo 0)"
echo "间接依赖: $(grep -c '// indirect' go.mod || echo 0)"
echo "总依赖数: $(grep -c '^\t' go.mod || echo 0)"

echo ""
echo "🔍 重点分析："

echo "1. 数据库相关:"
echo "   - gorm.io/gorm (ORM)"
echo "   - github.com/jmoiron/sqlx (SQL扩展)" 
echo "   - github.com/lib/pq (PostgreSQL驱动)"
echo "   💡 建议: sqlx 和 gorm 功能重叠，可考虑只保留一个"

echo ""
echo "2. 缓存相关:"
echo "   - github.com/go-redis/redis/v8 (Redis客户端)"
echo "   - github.com/patrickmn/go-cache (内存缓存)"
echo "   💡 建议: 功能互补，但可评估是否都需要"

echo ""
echo "3. Google API 相关:"
echo "   - google.golang.org/api"
echo "   - golang.org/x/oauth2"
echo "   💡 建议: 如果不使用Google服务，可以移除"

echo ""
echo "4. 监控相关:"
echo "   - github.com/prometheus/client_golang"
echo "   💡 建议: 开发环境可选，生产环境保留"

echo ""
echo "🎯 优化建议:"
echo "1. 移除不使用的 Google API 依赖"
echo "2. 选择 gorm 或 sqlx 其中一个作为主要数据库访问方式"
echo "3. 评估是否需要两种缓存方案"
echo "4. 考虑使用更轻量的 JWT 库"

echo ""
echo "📊 依赖大小分析:"
go list -m -u all | wc -l
echo "总模块数: $(go list -m -u all | wc -l)"

echo ""
echo "🔧 运行优化脚本:"
echo "./optimize-deps.sh"
