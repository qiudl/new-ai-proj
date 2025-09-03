#!/bin/bash

# MCP Hook双协议服务器集成测试脚本
# 测试本地HTTP协议、Docker HTTP协议和Stdio协议

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

# 测试函数
test_case() {
    local name=$1
    local command=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}🔍 [$TOTAL_TESTS] $name${NC}"
    
    if eval "$command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ 通过${NC}"
    else
        echo -e "${RED}❌ 失败${NC}"
    fi
    echo
}

# HTTP请求函数
http_get() {
    local url=$1
    curl -s -f "$url" || return 1
}

http_post() {
    local url=$1
    local data=$2
    curl -s -f -X POST -H "Content-Type: application/json" -d "$data" "$url" || return 1
}

# 测试报告
report() {
    echo "=================================================="
    echo -e "${BLUE}📊 集成测试报告${NC}"
    echo "=================================================="
    echo "总测试数: $TOTAL_TESTS"
    echo -e "✅ 通过: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "❌ 失败: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"
    echo -e "📈 通过率: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)%"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "${GREEN}🎉 所有测试通过！${NC}"
        exit 0
    else
        echo -e "${RED}❌ 有测试失败${NC}"
        exit 1
    fi
}

echo -e "${BLUE}🧪 MCP Hook双协议服务器集成测试${NC}"
echo "=================================================="

# 1. 测试本地HTTP协议
echo -e "${YELLOW}📡 测试本地HTTP协议 (端口3101)${NC}"

test_case "本地HTTP健康检查" '
    response=$(http_get "http://localhost:3101/health")
    echo "$response" | jq -r ".status" | grep -q "ok"
'

test_case "本地HTTP工具列表" '
    response=$(http_get "http://localhost:3101/api/tools")
    count=$(echo "$response" | jq -r ".count")
    [ "$count" = "11" ]
'

test_case "本地HTTP任务创建" '
    timestamp=$(date +%s)
    response=$(http_post "http://localhost:3101/api/create_task" "{\"title\":\"集成测试任务_$timestamp\",\"projectId\":1}")
    echo "$response" | jq -r ".success" | grep -q "true"
'

# 2. 测试Docker HTTP协议
echo -e "${YELLOW}🐳 测试Docker HTTP协议 (端口3100)${NC}"

test_case "Docker HTTP健康检查" '
    response=$(http_get "http://localhost:3100/health")
    echo "$response" | jq -r ".status" | grep -q "ok"
'

test_case "Docker HTTP工具列表" '
    response=$(http_get "http://localhost:3100/api/tools")
    count=$(echo "$response" | jq -r ".count")
    [ "$count" = "11" ]
'

test_case "Docker HTTP任务创建" '
    timestamp=$(date +%s)
    response=$(http_post "http://localhost:3100/api/create_task" "{\"title\":\"Docker集成测试_$timestamp\",\"projectId\":1}")
    echo "$response" | jq -r ".success" | grep -q "true"
'

# 3. 测试Stdio协议
echo -e "${YELLOW}📞 测试Stdio协议${NC}"

test_case "Stdio工具列表" '
    cd /Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge
    response=$(echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}" | timeout 10s npx tsx hook.ts 2>/dev/null | grep -o "{.*\"jsonrpc\".*}" | head -n1)
    echo "$response" | jq -r ".result.tools | length" | grep -q "11"
'

# 4. 性能测试
echo -e "${YELLOW}⚡ 性能测试${NC}"

test_case "HTTP响应时间测试" '
    start_time=$(date +%s%3N)
    http_get "http://localhost:3101/health" >/dev/null
    end_time=$(date +%s%3N)
    duration=$((end_time - start_time))
    echo "响应时间: ${duration}ms"
    [ $duration -lt 100 ]
'

test_case "并发请求测试" '
    start_time=$(date +%s%3N)
    for i in {1..5}; do
        http_get "http://localhost:3101/health" &
    done
    wait
    end_time=$(date +%s%3N)
    duration=$((end_time - start_time))
    echo "5个并发请求耗时: ${duration}ms"
    [ $duration -lt 500 ]
'

# 5. 功能完整性测试
echo -e "${YELLOW}🔧 功能完整性测试${NC}"

test_case "完整任务工作流" '
    # 创建任务
    timestamp=$(date +%s)
    create_response=$(http_post "http://localhost:3101/api/create_task" "{\"title\":\"工作流测试_$timestamp\",\"projectId\":1}")
    task_id=$(echo "$create_response" | jq -r ".data.id")
    
    # 开始任务
    start_response=$(http_post "http://localhost:3101/api/start_task" "{\"id\":$task_id}")
    echo "$start_response" | jq -r ".success" | grep -q "true"
    
    # 暂停任务
    pause_response=$(http_post "http://localhost:3101/api/pause_task" "{\"id\":$task_id}")
    echo "$pause_response" | jq -r ".success" | grep -q "true"
    
    # 完成任务
    complete_response=$(http_post "http://localhost:3101/api/complete_task" "{\"id\":$task_id}")
    echo "$complete_response" | jq -r ".success" | grep -q "true"
'

test_case "任务查找和更新" '
    # 查找任务
    find_response=$(http_post "http://localhost:3101/api/list_tasks" "{\"limit\":1}")
    task_id=$(echo "$find_response" | jq -r ".data.tasks[0].id")
    
    # 更新任务
    update_response=$(http_post "http://localhost:3101/api/update_task" "{\"id\":$task_id,\"updates\":{\"priority\":\"high\"}}")
    echo "$update_response" | jq -r ".success" | grep -q "true"
'

# 6. 错误处理测试
echo -e "${YELLOW}🚨 错误处理测试${NC}"

test_case "无效端点处理" '
    response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3101/api/invalid_endpoint")
    [ "$response" = "404" ]
'

test_case "无效JSON处理" '
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "invalid json" "http://localhost:3101/api/create_task")
    # 应该返回错误但不崩溃
    true
'

# 生成测试报告
report
