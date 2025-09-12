#!/bin/bash

# E2E测试执行脚本
# 支持不同的测试类型和环境配置

set -e

echo "🎭 开始执行企业用户模拟系统E2E测试"
echo "================================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 切换到项目目录
cd "$PROJECT_DIR"

# 参数解析
TEST_TYPE=${1:-all}
BROWSER=${2:-chromium}
ENVIRONMENT=${3:-development}
HEADLESS=${4:-true}

echo -e "${BLUE}📋 测试配置:${NC}"
echo "  测试类型: $TEST_TYPE"
echo "  浏览器: $BROWSER"
echo "  环境: $ENVIRONMENT"
echo "  无头模式: $HEADLESS"
echo ""

# 检查依赖
echo -e "${BLUE}🔍 检查依赖...${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

if ! npx playwright --version &> /dev/null; then
    echo -e "${YELLOW}⚠️ Playwright 未安装，正在安装...${NC}"
    npm install --save-dev @playwright/test
    npx playwright install
fi

# 环境配置
case $ENVIRONMENT in
    "development")
        export E2E_BASE_URL="http://localhost:3000"
        export E2E_API_BASE_URL="http://localhost:8081/api/v1"
        ;;
    "staging")
        export E2E_BASE_URL="https://staging.example.com"
        export E2E_API_BASE_URL="https://api-staging.example.com/api/v1"
        ;;
    "production")
        echo -e "${RED}⚠️ 生产环境测试需要特殊权限${NC}"
        read -p "确认在生产环境运行E2E测试? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "测试取消"
            exit 0
        fi
        export E2E_BASE_URL="https://app.example.com"
        export E2E_API_BASE_URL="https://api.example.com/api/v1"
        ;;
esac

echo -e "${BLUE}🌐 目标环境: $E2E_BASE_URL${NC}"

# 确保应用服务运行（仅限开发环境）
if [[ "$ENVIRONMENT" == "development" ]]; then
    echo -e "${BLUE}🚀 检查本地服务...${NC}"
    
    # 检查前端服务
    if ! curl -s "$E2E_BASE_URL" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 前端服务未启动，尝试启动...${NC}"
        npm start &
        FRONTEND_PID=$!
        
        # 等待服务启动
        for i in {1..30}; do
            if curl -s "$E2E_BASE_URL" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ 前端服务已启动${NC}"
                break
            fi
            echo "等待前端服务启动... ($i/30)"
            sleep 2
        done
        
        if ! curl -s "$E2E_BASE_URL" > /dev/null 2>&1; then
            echo -e "${RED}❌ 前端服务启动失败${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ 前端服务已运行${NC}"
    fi
    
    # 检查后端服务
    if ! curl -s "${E2E_API_BASE_URL}/health" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 后端服务可能未启动${NC}"
    else
        echo -e "${GREEN}✅ 后端服务已运行${NC}"
    fi
fi

# 创建测试结果目录
mkdir -p test-results/e2e
mkdir -p e2e/debug-screenshots

# 构建Playwright命令
PLAYWRIGHT_CMD="npx playwright test"

# 浏览器配置
case $BROWSER in
    "all")
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=chromium --project=firefox --project=webkit"
        ;;
    "mobile")
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project='Mobile Chrome' --project='Mobile Safari'"
        ;;
    *)
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$BROWSER"
        ;;
esac

# 测试类型配置
case $TEST_TYPE in
    "impersonation")
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD e2e/impersonation.spec.ts"
        ;;
    "security")
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD e2e/security.spec.ts"
        ;;
    "performance")
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD e2e/performance.spec.ts"
        ;;
    "smoke")
        echo -e "${BLUE}🚗 执行冒烟测试...${NC}"
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --grep='登录|基本功能|首页加载'"
        ;;
    "regression")
        echo -e "${BLUE}🔄 执行回归测试...${NC}"
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD e2e/impersonation.spec.ts e2e/security.spec.ts"
        ;;
    "all"|*)
        echo -e "${BLUE}🎯 执行完整测试套件...${NC}"
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD"
        ;;
esac

# 无头模式配置
if [[ "$HEADLESS" == "false" ]]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
fi

# 其他选项
PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --reporter=html,json,junit"

# 执行测试
echo -e "${BLUE}🎭 开始执行E2E测试...${NC}"
echo "命令: $PLAYWRIGHT_CMD"
echo ""

# 运行测试并捕获退出码
if eval $PLAYWRIGHT_CMD; then
    TEST_EXIT_CODE=0
    echo -e "${GREEN}✅ E2E测试执行完成${NC}"
else
    TEST_EXIT_CODE=$?
    echo -e "${RED}❌ E2E测试执行失败 (退出码: $TEST_EXIT_CODE)${NC}"
fi

# 生成测试报告
echo -e "${BLUE}📊 生成测试报告...${NC}"

if [[ -f "test-results/junit-results.xml" ]]; then
    echo "  JUnit报告: test-results/junit-results.xml"
fi

if [[ -f "test-results/results.json" ]]; then
    echo "  JSON报告: test-results/results.json"
fi

if [[ -d "playwright-report" ]]; then
    echo "  HTML报告: playwright-report/index.html"
    echo -e "${BLUE}💻 查看报告: npx playwright show-report${NC}"
fi

# 清理（如果启动了前端服务）
if [[ -n "$FRONTEND_PID" ]]; then
    echo -e "${BLUE}🧹 清理启动的服务...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
fi

# 测试结果摘要
if [[ $TEST_EXIT_CODE -eq 0 ]]; then
    echo ""
    echo "================================================="
    echo -e "${GREEN}🎉 所有E2E测试通过！${NC}"
    
    # 显示测试统计（如果有JSON报告）
    if [[ -f "test-results/results.json" ]] && command -v jq &> /dev/null; then
        echo ""
        echo -e "${BLUE}📈 测试统计:${NC}"
        jq '.stats | {passed: .passed, failed: .failed, skipped: .skipped, duration: "\(.duration)ms"}' test-results/results.json
    fi
    
else
    echo ""
    echo "================================================="
    echo -e "${RED}❌ E2E测试失败${NC}"
    echo -e "${YELLOW}请查看详细报告以了解失败原因${NC}"
    
    # 显示失败的截图（如果有）
    if [[ -d "test-results" ]]; then
        FAILED_SCREENSHOTS=$(find test-results -name "*.png" | head -5)
        if [[ -n "$FAILED_SCREENSHOTS" ]]; then
            echo -e "${BLUE}📷 失败截图:${NC}"
            echo "$FAILED_SCREENSHOTS"
        fi
    fi
fi

echo ""
echo -e "${BLUE}🔍 E2E测试命令参考:${NC}"
echo "  冒烟测试:     ./scripts/run-e2e-tests.sh smoke"
echo "  模拟功能:     ./scripts/run-e2e-tests.sh impersonation"
echo "  安全验证:     ./scripts/run-e2e-tests.sh security"
echo "  性能测试:     ./scripts/run-e2e-tests.sh performance"
echo "  回归测试:     ./scripts/run-e2e-tests.sh regression"
echo "  有头模式:     ./scripts/run-e2e-tests.sh all chromium development false"
echo "  移动端测试:   ./scripts/run-e2e-tests.sh all mobile"

exit $TEST_EXIT_CODE