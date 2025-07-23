#!/bin/bash

# 企业API集成快速验证脚本

API_BASE="http://localhost:8080"

echo "🏢 企业API集成验证"
echo "===================="

# 检查服务器健康状态
echo "1. 检查服务器连接..."
if curl -s "$API_BASE/health" > /dev/null; then
    echo "✅ 后端服务器运行正常"
else
    echo "❌ 后端服务器未运行，请先启动："
    echo "cd backend && go run main.go"
    exit 1
fi

# 测试企业列表API
echo ""
echo "2. 测试企业列表API..."
response=$(curl -s "$API_BASE/api/v1/companies?page=1&page_size=5")
if echo "$response" | grep -q '"success":true'; then
    echo "✅ 企业列表API正常"
    count=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   企业总数: $count"
else
    echo "❌ 企业列表API失败"
    echo "   响应: $response"
fi

# 测试用户管理API
echo ""
echo "3. 测试用户管理API..."
response=$(curl -s "$API_BASE/api/v1/admin/users?page=1&page_size=5")
if echo "$response" | grep -q '"success":true'; then
    echo "✅ 用户管理API正常"
    count=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   用户总数: $count"
else
    echo "❌ 用户管理API失败"
    echo "   响应: $response"
fi

# 检查是否有企业数据
echo ""
echo "4. 检查企业数据..."
companies_response=$(curl -s "$API_BASE/api/v1/companies?page=1&page_size=1")
if echo "$companies_response" | grep -q '"total":0'; then
    echo "⚠️  当前没有企业数据，将创建测试企业..."
    
    # 创建测试企业
    create_response=$(curl -s -X POST "$API_BASE/api/v1/companies" \
        -H "Content-Type: application/json" \
        -d '{
            "company_name": "测试企业A",
            "company_code": "TEST001",
            "industry": "软件开发",
            "company_type": "limited_company",
            "address": "北京市朝阳区测试大厦",
            "status": "active",
            "priority": "high"
        }')
    
    if echo "$create_response" | grep -q '"success":true'; then
        echo "✅ 测试企业创建成功"
    else
        echo "❌ 测试企业创建失败: $create_response"
    fi
else
    echo "✅ 企业数据存在"
fi

echo ""
echo "5. 前端集成验证清单:"
echo "   □ 启动前端开发服务器: cd frontend && npm start"
echo "   □ 访问用户管理页面: http://localhost:3000"
echo "   □ 点击'新建用户'按钮"
echo "   □ 选择'企业用户'类型"
echo "   □ 验证企业选择器显示企业列表"
echo "   □ 测试企业搜索功能"
echo ""
echo "🎯 企业API集成验证完成!"
