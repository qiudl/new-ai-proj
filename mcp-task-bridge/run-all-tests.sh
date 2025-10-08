#!/bin/bash

# 任务2498 - MCP远端连接和Token管理完整测试套件
# 使用新开发的Token持久化、加密和监控功能

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "╔════════════════════════════════════════════════════════╗"
echo "║   MCP远端连接和Token管理完整测试套件                    ║"
echo "║   任务: #2498                                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查编译文件
echo -e "${BLUE}检查编译文件...${NC}"
if [ ! -d "dist-test" ]; then
    echo -e "${YELLOW}编译测试文件...${NC}"
    npx tsc token-storage.ts token-monitor.ts base-client.ts task-mcp.ts \
        --esModuleInterop --moduleResolution node --module esnext --target es2020 --outDir dist-test
    echo -e "${GREEN}✓ 编译完成${NC}"
fi

# 编译测试脚本
echo -e "${YELLOW}编译测试脚本...${NC}"
npx tsc test-remote-connection.ts test-token-management.ts test-token-refresh.ts test-e2e-integration.ts \
    --esModuleInterop --moduleResolution node --module esnext --target es2020 --outDir dist-test

echo -e "${GREEN}✓ 测试脚本编译完成${NC}"
echo ""

# 运行测试函数
run_test() {
    local test_name=$1
    local test_file=$2

    echo ""
    echo "════════════════════════════════════════════════════════"
    echo -e "${BLUE}运行测试: ${test_name}${NC}"
    echo "════════════════════════════════════════════════════════"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if node "dist-test/${test_file}"; then
        echo -e "${GREEN}✓ ${test_name} 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ ${test_name} 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 测试1: 远端连接和基础API测试
run_test "远端连接和基础API测试" "test-remote-connection.js" || true

# 测试2: Token生成和持久化测试
run_test "Token生成和持久化测试" "test-token-management.js" || true

# 测试3: Token自动刷新测试
run_test "Token自动刷新测试" "test-token-refresh.js" || true

# 测试4: 端到端集成测试
run_test "端到端集成测试" "test-e2e-integration.js" || true

# 测试结果汇总
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   测试结果汇总                                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "总测试套件数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"

# 成功率
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "成功率: ${SUCCESS_RATE}%"
fi

echo ""

# 显示测试文件位置
echo "╔════════════════════════════════════════════════════════╗"
echo "║   测试输出文件                                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Token持久化文件: ~/.mcp-task-bridge/token-storage.enc"
echo "加密密钥文件: ~/.mcp-task-bridge/.encryption-key"
echo "监控日志文件: ~/.mcp-task-bridge/token-refresh.log"
echo ""

# 退出码
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
