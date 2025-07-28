#!/bin/bash

echo "🔍 时间段任务统计组件集成测试"
echo "=============================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查模拟API服务器
echo -e "${BLUE}1. 检查模拟统计API服务器...${NC}"
if curl -s http://localhost:8888/health > /dev/null; then
    echo -e "${GREEN}✅ 模拟API服务器运行正常 (端口 8888)${NC}"
else
    echo -e "${RED}❌ 模拟API服务器未运行${NC}"
    echo "请运行: node mock-statistics-server.js"
    exit 1
fi

echo ""

# 检查前端服务器
echo -e "${BLUE}2. 检查前端服务器...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ 前端服务器运行正常 (端口 3000)${NC}"
else
    echo -e "${RED}❌ 前端服务器未运行${NC}"
    echo "请在frontend目录下运行: npm start"
    exit 1
fi

echo ""

# 测试统计API
echo -e "${BLUE}3. 测试统计API响应...${NC}"
api_response=$(curl -s http://localhost:8888/api/statistics/today-stats)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 统计API响应成功${NC}"
    
    # 解析并显示关键数据
    total_tasks=$(echo "$api_response" | jq -r '.totalTasks // 0' 2>/dev/null || echo "0")
    completed_tasks=$(echo "$api_response" | jq -r '.completedTasks // 0' 2>/dev/null || echo "0")
    completion_rate=$(echo "$api_response" | jq -r '.completionRate // 0' 2>/dev/null || echo "0")
    
    echo "   📊 总任务数: $total_tasks"
    echo "   ✅ 已完成: $completed_tasks"
    echo "   📈 完成率: $completion_rate%"
else
    echo -e "${RED}❌ 统计API请求失败${NC}"
    exit 1
fi

echo ""

# 提供访问链接
echo -e "${BLUE}4. 访问链接${NC}"
echo -e "${GREEN}🌐 前端应用: http://localhost:3000${NC}"
echo -e "${GREEN}📊 时间管理页面: http://localhost:3000/time-management${NC}"
echo -e "${GREEN}📈 统计API: http://localhost:8888/api/statistics/today-stats${NC}"

echo ""

# 使用说明
echo -e "${YELLOW}📝 使用说明:${NC}"
echo "1. 打开浏览器访问: http://localhost:3000/time-management"
echo "2. 查看页面上的统计数据卡片"
echo "3. 点击'刷新数据'按钮查看新的随机数据"
echo "4. 打开浏览器开发者工具查看网络请求"

echo ""

# 故障排除
echo -e "${YELLOW}🔧 故障排除:${NC}"
echo "- 如果看不到数据，请检查浏览器控制台是否有错误"
echo "- 如果API调用失败，请确认两个服务器都在运行"
echo "- 刷新页面重新加载最新的前端代码"

echo ""
echo -e "${GREEN}🎉 集成测试完成！${NC}"
echo "=============================================="
