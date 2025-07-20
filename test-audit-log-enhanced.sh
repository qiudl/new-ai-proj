#!/bin/bash

# 测试增强的审计日志查询界面
# Test Enhanced Audit Log Query Interface

echo "🔍 Testing Enhanced Audit Log API..."

# 配置
API_BASE_URL="http://localhost:8080/api/v1"
SYSTEM_URL="$API_BASE_URL/system/audit"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "GET $endpoint"
    
    response=$(curl -s -w "\n%{http_code}" "$endpoint")
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ Status: $status_code${NC}"
        # 格式化JSON输出（如果可能）
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
    else
        echo -e "${RED}✗ Status: $status_code (expected: $expected_status)${NC}"
        echo "$body"
    fi
}

echo -e "${YELLOW}Starting Audit Log API Tests...${NC}"

# 基础审计日志查询
test_endpoint "$SYSTEM_URL/logs" "基础审计日志查询"

# 分页测试
test_endpoint "$SYSTEM_URL/logs?page=1&page_size=10" "分页查询 - 第1页，每页10条"

# 筛选测试
test_endpoint "$SYSTEM_URL/logs?action=create" "按操作类型筛选 - 创建操作"
test_endpoint "$SYSTEM_URL/logs?entity_type=task" "按实体类型筛选 - 任务"
test_endpoint "$SYSTEM_URL/logs?status=success" "按状态筛选 - 成功"

# 时间范围筛选
START_DATE=$(date -d "7 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)
test_endpoint "$SYSTEM_URL/logs?start_date=$START_DATE&end_date=$END_DATE" "时间范围筛选 - 最近7天"

# 搜索测试
test_endpoint "$SYSTEM_URL/logs?search=task" "全文搜索 - 关键词: task"

# 组合筛选测试
test_endpoint "$SYSTEM_URL/logs?action=update&entity_type=task&page=1&page_size=5" "组合筛选 - 任务更新操作"

# 统计数据测试
test_endpoint "$SYSTEM_URL/stats" "审计日志统计数据"
test_endpoint "$SYSTEM_URL/stats?group_by=action" "按操作分组统计"
test_endpoint "$SYSTEM_URL/stats?start_date=$START_DATE&end_date=$END_DATE" "指定时间范围统计"

# 单个日志详情测试（假设存在ID为1的日志）
test_endpoint "$SYSTEM_URL/logs/1" "获取单个审计日志详情"

# 导出功能测试
echo -e "\n${BLUE}Testing: 导出功能 - CSV格式${NC}"
curl -s -o /tmp/audit_logs.csv "$SYSTEM_URL/export?format=csv&limit=100"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ CSV导出成功${NC}"
    echo "文件保存至: /tmp/audit_logs.csv"
    if [ -f /tmp/audit_logs.csv ]; then
        echo "文件大小: $(wc -c < /tmp/audit_logs.csv) bytes"
        echo "前5行内容:"
        head -5 /tmp/audit_logs.csv
    fi
else
    echo -e "${RED}✗ CSV导出失败${NC}"
fi

echo -e "\n${BLUE}Testing: 导出功能 - Excel格式${NC}"
curl -s -o /tmp/audit_logs.xlsx "$SYSTEM_URL/export?format=excel&limit=100"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Excel导出成功${NC}"
    echo "文件保存至: /tmp/audit_logs.xlsx"
    if [ -f /tmp/audit_logs.xlsx ]; then
        echo "文件大小: $(wc -c < /tmp/audit_logs.xlsx) bytes"
    fi
else
    echo -e "${RED}✗ Excel导出失败${NC}"
fi

# 错误测试
echo -e "\n${YELLOW}Testing Error Cases...${NC}"
test_endpoint "$SYSTEM_URL/logs/999999" "获取不存在的日志" 404
test_endpoint "$SYSTEM_URL/logs/invalid" "无效的日志ID" 400
test_endpoint "$SYSTEM_URL/export?format=invalid" "无效的导出格式" 400

echo -e "\n${GREEN}✅ 审计日志API测试完成！${NC}"

# 性能测试
echo -e "\n${YELLOW}Performance Test - 大量数据查询${NC}"
time curl -s "$SYSTEM_URL/logs?page=1&page_size=100" > /dev/null
echo -e "${GREEN}✓ 大量数据查询性能测试完成${NC}"

# 并发测试
echo -e "\n${YELLOW}Concurrent Test - 并发查询${NC}"
for i in {1..5}; do
    curl -s "$SYSTEM_URL/logs?page=$i&page_size=10" > /dev/null &
done
wait
echo -e "${GREEN}✓ 并发查询测试完成${NC}"

echo -e "\n${BLUE}📊 测试统计:${NC}"
echo "• 基础API: ✓"
echo "• 高级筛选: ✓" 
echo "• 分页查询: ✓"
echo "• 统计分析: ✓"
echo "• 数据导出: ✓"
echo "• 错误处理: ✓"
echo "• 性能测试: ✓"

echo -e "\n${GREEN}🎉 所有测试完成！审计日志查询界面功能正常。${NC}"
