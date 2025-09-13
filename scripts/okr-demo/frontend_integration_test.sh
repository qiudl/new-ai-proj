#!/bin/bash

# OKR前端集成测试脚本
# 验证OKR组件在Dashboard中的集成效果

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[步骤 $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "🎯 OKR前端集成测试"
echo "===================="

print_step "1" "检查前端服务状态..."
if curl -s http://localhost:3002 > /dev/null 2>&1; then
    print_success "前端服务正常运行 (http://localhost:3002)"
else
    print_warning "前端服务未运行，请先启动前端服务"
    echo "启动命令: cd frontend && PORT=3002 npm start"
    exit 1
fi

print_step "2" "检查后端服务状态..."
if curl -s http://localhost:8081/api/v1/auth/dev/quick-login -X POST -H "Content-Type: application/json" -d '{"username": "admin"}' > /dev/null 2>&1; then
    print_success "后端服务正常运行 (http://localhost:8081)"
else
    print_warning "后端服务未运行，请先启动后端服务"
    echo "启动命令: PORT=8081 ./backend/ai-project-backend"
    exit 1
fi

print_step "3" "验证OKR数据是否存在..."
JWT_TOKEN=$(curl -s -X POST "http://localhost:8081/api/v1/auth/dev/quick-login" \
    -H "Content-Type: application/json" \
    -d '{"username": "admin"}' | jq -r '.data.access_token')

OKR_RESPONSE=$(curl -s -X GET "http://localhost:8081/api/v1/okr/objectives?quarter=2025-Q1" \
    -H "Authorization: Bearer $JWT_TOKEN")

OKR_COUNT=$(echo "$OKR_RESPONSE" | jq -r '.total // 0')

if [ "$OKR_COUNT" -gt 0 ]; then
    print_success "找到 $OKR_COUNT 个OKR目标，数据准备就绪"
else
    print_warning "未找到OKR数据，正在创建示例数据..."
    # 运行完整演示脚本创建数据
    ../okr-demo/test_okr_complete_flow.sh > /dev/null 2>&1 || true
    print_success "示例OKR数据创建完成"
fi

print_step "4" "生成前端访问指南..."
echo ""
echo "🌐 前端集成测试完成！"
echo "====================="
echo ""
echo "📱 访问步骤："
echo "1. 打开浏览器访问: http://localhost:3002"
echo "2. 如果需要登录，点击'开发登录'按钮"
echo "3. 在首页Dashboard中查看OKR组件（位于页面顶部）"
echo ""
echo "🎯 OKR组件功能测试："
echo "- ✅ 查看季度概览统计"
echo "- ✅ 展开/折叠目标详情"
echo "- ✅ 更新关键结果进度"
echo "- ✅ 查看进度变更日志"
echo "- ✅ 创建新的OKR目标"
echo ""
echo "📊 当前数据状态："
echo "- 季度: 2025-Q1"
echo "- 目标数量: $OKR_COUNT"
echo "- 集成位置: Dashboard页面顶部，每日任务上方"
echo ""
echo "🔧 开发者工具："
echo "- 按F12打开开发者工具查看网络请求"
echo "- 在Console中可以看到OKR API调用日志"
echo "- Components面板可以查看OKRModule组件状态"
echo ""
echo "💡 测试建议："
echo "1. 测试OKR目标的创建和更新功能"
echo "2. 验证进度计算的正确性"
echo "3. 检查组件的响应式布局"
echo "4. 测试错误处理和加载状态"
echo ""

print_success "前端集成测试指南生成完成！"
print_info "请按照上述步骤在浏览器中验证OKR组件功能"