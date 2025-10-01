#!/bin/bash

# AI项目管理系统 - 本地开发环境状态检查脚本

echo "🔍 AI项目管理系统 - 服务状态检查"
echo "========================================"

# 检查后端服务
if curl -s http://localhost:8080/health > /dev/null; then
    BACKEND_STATUS="✅ 运行中"
    BACKEND_HEALTH=$(curl -s http://localhost:8080/health | python -c 'import json, sys; print(json.load(sys.stdin).get("status", "unknown"))')
else
    BACKEND_STATUS="❌ 离线"
    BACKEND_HEALTH="不可用"
fi

# 检查前端服务
if curl -s http://localhost:3000 > /dev/null; then
    FRONTEND_STATUS="✅ 运行中"
else
    FRONTEND_STATUS="❌ 离线"
fi

# 检查数据库
if brew services list | grep -q "postgresql@16.*started"; then
    DB_STATUS="✅ 运行中"
else
    DB_STATUS="❌ 未启动"
fi

echo "📊 服务状态:"
echo "  后端 (8080):    $BACKEND_STATUS ($BACKEND_HEALTH)"
echo "  前端 (3000):    $FRONTEND_STATUS"
echo "  PostgreSQL:     $DB_STATUS"

echo ""
echo "🔗 服务链接:"
echo "  前端应用:       http://localhost:3000"
echo "  后端 API:       http://localhost:8080/api/v1"
echo "  健康检查:       http://localhost:8080/health"
echo "  API 文档:       http://localhost:8080/docs"

echo ""
echo "💾 日志文件:"
echo "  后端日志:       backend/backend.log"
echo "  前端日志:       frontend/frontend.log"