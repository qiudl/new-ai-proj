#!/bin/bash

# Test script for customer detail page functionality
echo "🧪 测试客户详情页功能"
echo "=================================="

# Test 1: Check if services are running
echo "1. 检查服务状态..."
if curl -s http://localhost/health > /dev/null; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常"
    exit 1
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务异常"
    exit 1
fi

# Test 2: Check customer data exists
echo "2. 检查客户数据..."
CUSTOMER_COUNT=$(docker-compose exec -T db psql -U user -d main_db -t -c "SELECT COUNT(*) FROM customers;" 2>/dev/null | xargs)
if [[ "$CUSTOMER_COUNT" =~ ^[0-9]+$ ]] && [ "$CUSTOMER_COUNT" -gt 0 ]; then
    echo "✅ 客户数据存在 ($CUSTOMER_COUNT 条记录)"
    
    # Get first customer ID for testing
    FIRST_CUSTOMER_ID=$(docker-compose exec -T db psql -U user -d main_db -t -c "SELECT id FROM customers ORDER BY id LIMIT 1;" 2>/dev/null | xargs)
    echo "   测试客户ID: $FIRST_CUSTOMER_ID"
else
    echo "❌ 客户数据不存在"
    exit 1
fi

# Test 3: Check TypeScript compilation
echo "3. 检查TypeScript编译..."
cd frontend
if npm run type-check > /dev/null 2>&1; then
    echo "✅ TypeScript编译成功"
else
    echo "❌ TypeScript编译失败"
    exit 1
fi
cd ..

# Test 4: Check if customer routes are properly configured
echo "4. 检查路由配置..."
if grep -q "CustomerDetailPage" frontend/src/App.tsx; then
    echo "✅ 客户详情页路由已配置"
else
    echo "❌ 客户详情页路由未配置"
    exit 1
fi

if grep -q "/customers/:customerId" frontend/src/App.tsx; then
    echo "✅ 动态路由参数已配置"
else
    echo "❌ 动态路由参数未配置"
    exit 1
fi

# Test 5: Check if formatter functions are available
echo "5. 检查工具函数..."
if grep -q "formatDateTime" frontend/src/utils/formatters.ts; then
    echo "✅ formatDateTime 函数已定义"
else
    echo "❌ formatDateTime 函数缺失"
    exit 1
fi

if grep -q "formatCurrency" frontend/src/utils/formatters.ts; then
    echo "✅ formatCurrency 函数已定义"
else
    echo "❌ formatCurrency 函数缺失"
    exit 1
fi

# Test 6: Check if customer types are properly defined
echo "6. 检查类型定义..."
if grep -q "CustomerContact" frontend/src/types/customer.ts; then
    echo "✅ CustomerContact 类型已定义"
else
    echo "❌ CustomerContact 类型缺失"
    exit 1
fi

if grep -q "CustomerUserRequest" frontend/src/types/customer.ts; then
    echo "✅ CustomerUserRequest 类型已定义"
else
    echo "❌ CustomerUserRequest 类型缺失"
    exit 1
fi

echo ""
echo "🎉 所有测试通过！客户详情页功能已就绪。"
echo ""
echo "测试客户详情页功能："
echo "1. 访问 http://localhost:3000"
echo "2. 使用 admin/password123 登录"
echo "3. 导航到 客户管理 -> 客户列表"
echo "4. 点击任意客户的"查看详情"按钮"
echo "5. 测试以下功能："
echo "   - 查看客户基本信息"
echo "   - 编辑客户信息"
echo "   - 添加联系记录"
echo "   - 查看活动时间线"
echo "   - 删除客户"
echo ""
echo "可用路由："
echo "- /customers (客户列表)"
echo "- /customers/create (创建客户)"
echo "- /customers/:id (客户详情)"
echo "- /customers/:id/edit (编辑客户)"
echo ""
echo "示例客户ID: $FIRST_CUSTOMER_ID"
echo "直接访问: http://localhost:3000/customers/$FIRST_CUSTOMER_ID"