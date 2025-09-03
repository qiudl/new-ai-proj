#!/bin/bash

# 优化的性能测试脚本
# 修复时间戳计算和提供更详细的性能分析

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 性能测试配置
HTTP_BASE_URL="http://localhost:3101"
DOCKER_BASE_URL="http://localhost:3100"
CONCURRENT_REQUESTS=10
STRESS_REQUESTS=50
STRESS_DURATION=30

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

# 高精度时间戳函数（兼容不同系统）
get_timestamp_ms() {
    if command -v gdate >/dev/null 2>&1; then
        # macOS with GNU date
        gdate +%s%3N
    elif date --version >/dev/null 2>&1; then
        # GNU date (Linux)
        date +%s%3N
    else
        # Fallback for other systems
        python3 -c "import time; print(int(time.time() * 1000))"
    fi
}

# 高精度时间戳函数（微秒级）
get_timestamp_us() {
    if command -v gdate >/dev/null 2>&1; then
        gdate +%s%6N
    elif date --version >/dev/null 2>&1; then
        date +%s%6N  
    else
        python3 -c "import time; print(int(time.time() * 1000000))"
    fi
}

# 测试函数
performance_test() {
    local name=$1
    local test_command=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}🔍 [$TOTAL_TESTS] $name${NC}"
    
    if eval "$test_command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ 通过${NC}"
    else
        echo -e "${RED}❌ 失败${NC}"
    fi
    echo
}

# HTTP请求函数（带性能统计）
http_request_with_stats() {
    local url=$1
    local method=${2:-GET}
    local data=${3:-""}
    
    local temp_file=$(mktemp)
    local start_time=$(get_timestamp_us)
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl -s -w "%{http_code},%{time_total},%{time_namelookup},%{time_connect},%{time_starttransfer}" \
             -o "$temp_file" \
             -X POST \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$url"
    else
        curl -s -w "%{http_code},%{time_total},%{time_namelookup},%{time_connect},%{time_starttransfer}" \
             -o "$temp_file" \
             "$url"
    fi
    
    local end_time=$(get_timestamp_us)
    local client_duration=$(( (end_time - start_time) / 1000 )) # 转换为毫秒
    
    echo "$client_duration"
    rm -f "$temp_file"
}

# 批量并发请求测试
concurrent_request_test() {
    local url=$1
    local request_count=$2
    local description=$3
    
    echo "    📊 测试: $description"
    echo "    📊 并发数: $request_count"
    
    local pids=()
    local results_file=$(mktemp)
    local start_time=$(get_timestamp_ms)
    
    # 启动并发请求
    for ((i=1; i<=request_count; i++)); do
        {
            local req_start=$(get_timestamp_us)
            local response=$(curl -s -w "%{http_code},%{time_total}" "$url" 2>/dev/null)
            local req_end=$(get_timestamp_us)
            local req_duration=$(( (req_end - req_start) / 1000 ))
            echo "$req_duration,$response" >> "$results_file"
        } &
        pids+=($!)
    done
    
    # 等待所有请求完成
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    local end_time=$(get_timestamp_ms)
    local total_duration=$((end_time - start_time))
    
    # 分析结果
    local success_count=0
    local total_time=0
    local min_time=999999
    local max_time=0
    
    while IFS=',' read -r duration http_code curl_time; do
        if [ "$http_code" = "200" ]; then
            success_count=$((success_count + 1))
        fi
        
        total_time=$((total_time + duration))
        
        if [ "$duration" -lt "$min_time" ]; then
            min_time=$duration
        fi
        
        if [ "$duration" -gt "$max_time" ]; then
            max_time=$duration
        fi
    done < "$results_file"
    
    local avg_time=$((total_time / request_count))
    local success_rate=$(echo "scale=1; $success_count * 100 / $request_count" | bc -l)
    local rps=$(echo "scale=2; $request_count * 1000 / $total_duration" | bc -l)
    
    echo "    📊 总耗时: ${total_duration}ms"
    echo "    📊 成功率: ${success_rate}%"
    echo "    📊 平均响应时间: ${avg_time}ms"
    echo "    📊 最快响应: ${min_time}ms"
    echo "    📊 最慢响应: ${max_time}ms"
    echo "    📊 每秒请求数: ${rps} RPS"
    
    rm -f "$results_file"
    
    # 性能标准检查
    if [ "$success_rate" != "100.0" ]; then
        echo "    ⚠️ 成功率低于100%"
        return 1
    fi
    
    if [ "$avg_time" -gt 1000 ]; then
        echo "    ⚠️ 平均响应时间过长"
        return 1
    fi
    
    return 0
}

# 压力测试
stress_test() {
    local url=$1
    local duration=$2
    
    echo "    📊 压力测试持续时间: ${duration}秒"
    
    local results_file=$(mktemp)
    local end_time=$(($(date +%s) + duration))
    local request_count=0
    local success_count=0
    local total_time=0
    
    echo "    🔥 压力测试进行中..."
    
    while [ $(date +%s) -lt $end_time ]; do
        local req_start=$(get_timestamp_us)
        local http_code=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null)
        local req_end=$(get_timestamp_us)
        local req_duration=$(( (req_end - req_start) / 1000 ))
        
        request_count=$((request_count + 1))
        total_time=$((total_time + req_duration))
        
        if [ "$http_code" = "200" ]; then
            success_count=$((success_count + 1))
        fi
        
        # 每10个请求输出一次进度
        if [ $((request_count % 10)) -eq 0 ]; then
            echo -n "."
        fi
    done
    
    echo # 换行
    
    local avg_time=$((total_time / request_count))
    local success_rate=$(echo "scale=1; $success_count * 100 / $request_count" | bc -l)
    local rps=$(echo "scale=2; $request_count / $duration" | bc -l)
    
    echo "    📊 总请求数: $request_count"
    echo "    📊 成功请求数: $success_count"
    echo "    📊 成功率: ${success_rate}%"
    echo "    📊 平均响应时间: ${avg_time}ms"
    echo "    📊 平均RPS: ${rps}"
    
    # 压力测试标准
    if [ "$success_rate" != "100.0" ]; then
        echo "    ⚠️ 压力测试成功率低于100%"
        return 1
    fi
    
    if [ "$avg_time" -gt 2000 ]; then
        echo "    ⚠️ 压力测试平均响应时间过长"
        return 1
    fi
    
    return 0
}

# 延迟分布测试
latency_distribution_test() {
    local url=$1
    local sample_count=100
    
    echo "    📊 延迟分布测试 (样本数: $sample_count)"
    
    local latencies=()
    local temp_file=$(mktemp)
    
    for ((i=1; i<=sample_count; i++)); do
        local start_time=$(get_timestamp_us)
        curl -s -o /dev/null "$url" 2>/dev/null
        local end_time=$(get_timestamp_us)
        local duration=$(( (end_time - start_time) / 1000 ))
        latencies+=($duration)
        echo "$duration" >> "$temp_file"
    done
    
    # 排序并计算百分位数
    sort -n "$temp_file" -o "$temp_file"
    
    local p50=$(sed -n "${sample_count}p; $((sample_count/2))p" "$temp_file" | tail -1)
    local p90=$(sed -n "$((sample_count*90/100))p" "$temp_file")
    local p95=$(sed -n "$((sample_count*95/100))p" "$temp_file")
    local p99=$(sed -n "$((sample_count*99/100))p" "$temp_file")
    
    local min_latency=$(head -1 "$temp_file")
    local max_latency=$(tail -1 "$temp_file")
    
    echo "    📊 最小延迟: ${min_latency}ms"
    echo "    📊 P50延迟: ${p50}ms"
    echo "    📊 P90延迟: ${p90}ms"  
    echo "    📊 P95延迟: ${p95}ms"
    echo "    📊 P99延迟: ${p99}ms"
    echo "    📊 最大延迟: ${max_latency}ms"
    
    rm -f "$temp_file"
    
    # P95延迟标准
    if [ "$p95" -gt 500 ]; then
        echo "    ⚠️ P95延迟过高"
        return 1
    fi
    
    return 0
}

# 测试报告
report() {
    echo "=================================================="
    echo -e "${BLUE}📊 性能测试报告${NC}"
    echo "=================================================="
    echo "总测试数: $TOTAL_TESTS"
    echo -e "✅ 通过: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "❌ 失败: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"
    echo -e "📈 通过率: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)%"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "${GREEN}🎉 所有性能测试通过！${NC}"
        exit 0
    else
        echo -e "${RED}❌ 有性能测试失败${NC}"
        exit 1
    fi
}

echo -e "${BLUE}⚡ Hook双协议服务器性能测试（优化版）${NC}"
echo "=================================================="

# 1. 基础性能测试
echo -e "${YELLOW}📈 基础响应性能测试${NC}"

performance_test "健康检查响应时间" '
    times=()
    for i in {1..10}; do
        start_time=$(get_timestamp_us)
        curl -s "$HTTP_BASE_URL/health" >/dev/null
        end_time=$(get_timestamp_us)
        duration=$(( (end_time - start_time) / 1000 ))
        times+=($duration)
    done
    
    total=0
    for time in "${times[@]}"; do
        total=$((total + time))
    done
    avg=$((total / 10))
    
    echo "    📊 10次请求平均响应时间: ${avg}ms"
    echo "    📊 单次响应时间分布: ${times[*]}"
    
    [ $avg -lt 100 ]
'

performance_test "工具列表响应性能" '
    start_time=$(get_timestamp_ms)
    response=$(curl -s "$HTTP_BASE_URL/api/tools")
    end_time=$(get_timestamp_ms)
    duration=$((end_time - start_time))
    
    tool_count=$(echo "$response" | jq -r ".count")
    
    echo "    📊 响应时间: ${duration}ms"
    echo "    📊 工具数量: $tool_count"
    echo "    📊 数据大小: $(echo "$response" | wc -c) bytes"
    
    [ $duration -lt 200 ] && [ "$tool_count" = "11" ]
'

# 2. 并发性能测试
echo -e "${YELLOW}🚀 并发性能测试${NC}"

performance_test "健康检查并发测试" '
    concurrent_request_test "$HTTP_BASE_URL/health" $CONCURRENT_REQUESTS "健康检查并发"
'

performance_test "任务创建并发测试" '
    local pids=()
    local results_file=$(mktemp)
    local start_time=$(get_timestamp_ms)
    local concurrent_count=5
    
    for ((i=1; i<=concurrent_count; i++)); do
        {
            local timestamp=$(date +%s%3N)
            local req_start=$(get_timestamp_us)
            local response=$(curl -s -X POST -H "Content-Type: application/json" \
                -d "{\"title\":\"并发测试任务_$timestamp\",\"projectId\":1}" \
                "$HTTP_BASE_URL/api/create_task")
            local req_end=$(get_timestamp_us)
            local duration=$(( (req_end - req_start) / 1000 ))
            local success=$(echo "$response" | jq -r ".success")
            echo "$duration,$success" >> "$results_file"
        } &
        pids+=($!)
    done
    
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    local end_time=$(get_timestamp_ms)
    local total_duration=$((end_time - start_time))
    
    local success_count=0
    local total_time=0
    
    while IFS="," read -r duration success; do
        total_time=$((total_time + duration))
        if [ "$success" = "true" ]; then
            success_count=$((success_count + 1))
        fi
    done < "$results_file"
    
    local avg_time=$((total_time / concurrent_count))
    
    echo "    📊 总耗时: ${total_duration}ms"
    echo "    📊 成功数: ${success_count}/${concurrent_count}"
    echo "    📊 平均创建时间: ${avg_time}ms"
    
    rm -f "$results_file"
    
    [ "$success_count" -eq "$concurrent_count" ] && [ "$avg_time" -lt 1000 ]
'

# 3. 延迟分布测试
echo -e "${YELLOW}📊 延迟分布分析${NC}"

performance_test "健康检查延迟分布" '
    latency_distribution_test "$HTTP_BASE_URL/health"
'

performance_test "API延迟分布" '
    latency_distribution_test "$HTTP_BASE_URL/api/tools"
'

# 4. 压力测试
echo -e "${YELLOW}🔥 压力测试${NC}"

performance_test "短期压力测试" '
    stress_test "$HTTP_BASE_URL/health" 10
'

# 5. 跨协议性能对比
echo -e "${YELLOW}🔄 协议性能对比${NC}"

performance_test "HTTP vs Docker性能对比" '
    echo "    📊 本地HTTP测试 (端口3101):"
    local_times=()
    for i in {1..5}; do
        local start_time=$(get_timestamp_us)
        curl -s "$HTTP_BASE_URL/health" >/dev/null 2>&1
        local end_time=$(get_timestamp_us)
        local duration=$(( (end_time - start_time) / 1000 ))
        local_times+=($duration)
    done
    
    local local_avg=0
    for time in "${local_times[@]}"; do
        local_avg=$((local_avg + time))
    done
    local_avg=$((local_avg / 5))
    
    echo "      平均响应时间: ${local_avg}ms"
    
    echo "    📊 Docker HTTP测试 (端口3100):"
    docker_times=()
    for i in {1..5}; do
        local start_time=$(get_timestamp_us)
        curl -s "$DOCKER_BASE_URL/health" >/dev/null 2>&1
        local end_time=$(get_timestamp_us)
        local duration=$(( (end_time - start_time) / 1000 ))
        docker_times+=($duration)
    done
    
    local docker_avg=0
    for time in "${docker_times[@]}"; do
        docker_avg=$((docker_avg + time))
    done
    docker_avg=$((docker_avg / 5))
    
    echo "      平均响应时间: ${docker_avg}ms"
    
    echo "    📊 性能对比:"
    if [ $local_avg -lt $docker_avg ]; then
        local diff=$((docker_avg - local_avg))
        echo "      本地环境快 ${diff}ms (${local_avg}ms vs ${docker_avg}ms)"
    else
        local diff=$((local_avg - docker_avg))
        echo "      Docker环境快 ${diff}ms (${docker_avg}ms vs ${local_avg}ms)"
    fi
    
    # 两个环境都应该有合理的性能
    [ $local_avg -lt 200 ] && [ $docker_avg -lt 300 ]
'

# 生成测试报告
report
