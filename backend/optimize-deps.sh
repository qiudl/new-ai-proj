#!/bin/bash

# Go 依赖优化脚本
# 用于清理不必要的依赖，优化 go.mod

set -e

echo "🚀 开始 Go 依赖优化..."

cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend

echo "📋 当前依赖统计："
echo "直接依赖: $(grep -c '^\s*[^/]' go.mod || echo 0)"
echo "间接依赖: $(grep -c '// indirect' go.mod || echo 0)"

echo "🧹 清理模块缓存..."
go clean -modcache

echo "📥 重新下载依赖..."
export GOPROXY=https://goproxy.cn,https://goproxy.io,direct
export GOSUMDB=sum.golang.google.cn
go mod download

echo "🔧 整理依赖..."
go mod tidy

echo "✅ 验证依赖..."
go mod verify

echo "📊 优化后依赖统计："
echo "直接依赖: $(grep -c '^\s*[^/]' go.mod || echo 0)"
echo "间接依赖: $(grep -c '// indirect' go.mod || echo 0)"

echo "🎯 依赖优化完成！"
echo "💡 提示：可以考虑移除以下重复功能的包："
echo "  - 如果只使用基础功能，可以考虑替换某些重型依赖"
echo "  - 检查是否真的需要 Google API 相关依赖"
echo "  - 考虑使用更轻量的替代方案"

# 检查潜在的重复依赖
echo "🔍 检查潜在重复依赖..."
echo "HTTP路由: gin"
echo "数据库: sqlx + gorm (可能重复?)"
echo "缓存: redis + go-cache (功能重叠)"
