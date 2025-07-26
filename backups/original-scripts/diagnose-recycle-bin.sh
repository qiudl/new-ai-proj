#!/bin/bash

# 回收站功能快速诊断脚本

echo "🔍 回收站功能诊断开始..."
echo "=================================="

# 1. 检查后端服务是否运行
echo "1. 检查后端服务状态"
if curl -s -f "http://localhost:8080/health" > /dev/null 2>&1; then
    echo "✅ 后端服务正在运行"
    
    # 获取健康检查信息
    echo "   服务信息:"
    curl -s "http://localhost:8080/health" | jq '.' 2>/dev/null || echo "   无法解析健康检查响应"
else
    echo "❌ 后端服务未运行或无法访问"
    echo "   请启动后端服务: cd backend && go run main.go"
fi

echo ""

# 2. 检查数据库连接
echo "2. 检查数据库连接"
if curl -s -f "http://localhost:8080/health" > /dev/null 2>&1; then
    health_response=$(curl -s "http://localhost:8080/health")
    if echo "$health_response" | grep -q "connected" 2>/dev/null; then
        echo "✅ 数据库连接正常"
    else
        echo "❌ 数据库连接可能有问题"
    fi
else
    echo "⚠️  无法检查数据库状态（后端服务未运行）"
fi

echo ""

# 3. 测试回收站API端点
echo "3. 测试回收站API端点"

# 测试项目回收站
echo "   测试项目回收站API:"
if response=$(curl -s "http://localhost:8080/api/system/recycle/projects?page=1&page_size=5" 2>/dev/null); then
    echo "   ✅ 项目回收站API响应成功"
    
    # 检查响应结构
    if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
        echo "   ✅ 响应包含data字段"
    else
        echo "   ❌ 响应缺少data字段"
    fi
    
    if echo "$response" | jq -e '.pagination' > /dev/null 2>&1; then
        echo "   ✅ 响应包含pagination字段"
    else
        echo "   ❌ 响应缺少pagination字段"
    fi
    
    # 显示响应结构
    echo "   响应结构预览:"
    echo "$response" | jq 'keys' 2>/dev/null || echo "   无法解析JSON响应"
    
else
    echo "   ❌ 项目回收站API请求失败"
fi

echo ""

# 测试任务回收站
echo "   测试任务回收站API:"
if response=$(curl -s "http://localhost:8080/api/system/recycle/tasks?page=1&page_size=5" 2>/dev/null); then
    echo "   ✅ 任务回收站API响应成功"
    
    # 检查响应结构
    if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
        echo "   ✅ 响应包含data字段"
    else
        echo "   ❌ 响应缺少data字段"
    fi
    
    if echo "$response" | jq -e '.pagination' > /dev/null 2>&1; then
        echo "   ✅ 响应包含pagination字段"
    else
        echo "   ❌ 响应缺少pagination字段"
    fi
    
else
    echo "   ❌ 任务回收站API请求失败"
fi

echo ""

# 4. 检查前端构建状态
echo "4. 检查前端状态"
if [ -d "frontend/build" ] || [ -d "frontend/dist" ]; then
    echo "✅ 前端已构建"
else
    echo "⚠️  前端可能需要构建"
fi

if [ -f "frontend/package.json" ]; then
    echo "✅ 前端项目文件存在"
else
    echo "❌ 找不到前端项目文件"
fi

echo ""

# 5. 检查修复的文件
echo "5. 检查修复文件状态"

# 检查SystemService修复
if grep -q "response.data as RecycledProject" "frontend/src/services/systemService.ts" 2>/dev/null; then
    echo "✅ SystemService.ts 已修复"
else
    echo "❌ SystemService.ts 需要修复"
fi

# 检查RecycleBinPage修复
if grep -q "paginationData.total" "frontend/src/pages/RecycleBinPage.tsx" 2>/dev/null; then
    echo "✅ RecycleBinPage.tsx 已修复"
else
    echo "❌ RecycleBinPage.tsx 需要修复"
fi

echo ""
echo "=================================="
echo "📋 诊断完成"

# 给出建议
echo ""
echo "💡 修复建议:"
echo "1. 如果后端未运行: cd backend && go run main.go"
echo "2. 如果前端未启动: cd frontend && npm start"
echo "3. 如果API响应结构有问题，请检查上述修复是否正确应用"
echo "4. 访问 http://localhost:3000 查看前端页面"
echo "5. 查看浏览器控制台是否还有错误"
