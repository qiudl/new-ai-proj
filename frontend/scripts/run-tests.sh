#!/bin/bash

# 企业用户模拟系统测试执行脚本
# 用于执行完整的测试套件

set -e

echo "🧪 开始执行企业用户模拟系统测试套件"
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

# 检查依赖
echo -e "${BLUE}📦 检查测试依赖...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

if ! npm list jest &> /dev/null; then
    echo -e "${YELLOW}⚠️ Jest 未安装，正在安装测试依赖...${NC}"
    npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
fi

# 测试类型选择
TEST_TYPE=${1:-all}
COVERAGE=${2:-true}

echo -e "${BLUE}🎯 测试类型: $TEST_TYPE${NC}"
echo -e "${BLUE}📊 生成覆盖率报告: $COVERAGE${NC}"

# 创建测试结果目录
mkdir -p test-results
mkdir -p coverage

case $TEST_TYPE in
    "unit")
        echo -e "${BLUE}🔬 执行单元测试...${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="__tests__" --watchAll=false --verbose
        else
            npm test -- --testPathPattern="__tests__" --watchAll=false --verbose
        fi
        ;;
    "integration")
        echo -e "${BLUE}🔗 执行集成测试...${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="integration|Integration" --watchAll=false --verbose
        else
            npm test -- --testPathPattern="integration|Integration" --watchAll=false --verbose
        fi
        ;;
    "impersonation")
        echo -e "${BLUE}👤 执行模拟功能专项测试...${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="impersonation|Impersonation|Enterprise" --watchAll=false --verbose
        else
            npm test -- --testPathPattern="impersonation|Impersonation|Enterprise" --watchAll=false --verbose
        fi
        ;;
    "components")
        echo -e "${BLUE}🧩 执行组件测试...${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="components/__tests__" --watchAll=false --verbose
        else
            npm test -- --testPathPattern="components/__tests__" --watchAll=false --verbose
        fi
        ;;
    "services")
        echo -e "${BLUE}⚙️ 执行服务层测试...${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="services/__tests__" --watchAll=false --verbose
        else
            npm test -- --testPathPattern="services/__tests__" --watchAll=false --verbose
        fi
        ;;
    "hooks")
        echo -e "${BLUE}🎣 执行Hook测试...${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="hooks/__tests__" --watchAll=false --verbose
        else
            npm test -- --testPathPattern="hooks/__tests__" --watchAll=false --verbose
        fi
        ;;
    "contexts")
        echo -e "${BLUE}🌐 执行Context测试...${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="contexts/__tests__" --watchAll=false --verbose
        else
            npm test -- --testPathPattern="contexts/__tests__" --watchAll=false --verbose
        fi
        ;;
    "all"|*)
        echo -e "${BLUE}🎯 执行完整测试套件...${NC}"
        
        echo -e "${YELLOW}📋 1/5 - 单元测试${NC}"
        if [ "$COVERAGE" = "true" ]; then
            npm test -- --coverage --testPathPattern="__tests__" --watchAll=false --passWithNoTests --silent
        else
            npm test -- --testPathPattern="__tests__" --watchAll=false --passWithNoTests --silent
        fi
        
        echo -e "${YELLOW}📋 2/5 - 集成测试${NC}"
        npm test -- --testPathPattern="integration" --watchAll=false --passWithNoTests --silent
        
        echo -e "${YELLOW}📋 3/5 - Hook测试${NC}"
        npm test -- --testPathPattern="hooks" --watchAll=false --passWithNoTests --silent
        
        echo -e "${YELLOW}📋 4/5 - 组件测试${NC}"
        npm test -- --testPathPattern="components" --watchAll=false --passWithNoTests --silent
        
        echo -e "${YELLOW}📋 5/5 - 服务测试${NC}"
        npm test -- --testPathPattern="services" --watchAll=false --passWithNoTests --silent
        ;;
esac

# 生成测试报告
if [ "$COVERAGE" = "true" ]; then
    echo -e "${BLUE}📊 生成覆盖率报告...${NC}"
    
    if [ -d "coverage" ]; then
        echo -e "${GREEN}✅ 覆盖率报告生成完成${NC}"
        echo -e "${BLUE}📂 报告位置: $(pwd)/coverage/lcov-report/index.html${NC}"
        
        # 显示覆盖率摘要
        if [ -f "coverage/coverage-summary.json" ]; then
            echo -e "${BLUE}📈 覆盖率摘要:${NC}"
            if command -v jq &> /dev/null; then
                jq '.total | {lines: .lines.pct, functions: .functions.pct, branches: .branches.pct, statements: .statements.pct}' coverage/coverage-summary.json
            else
                echo "   (安装 jq 以查看详细覆盖率数据)"
            fi
        fi
    fi
fi

# 检查测试结果
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 所有测试通过！${NC}"
    echo "================================================="
    echo -e "${GREEN}🎉 测试执行完成${NC}"
    
    # 显示测试统计
    echo -e "${BLUE}📊 测试统计信息:${NC}"
    if [ -f "test-results.json" ]; then
        echo "   详细结果已保存到 test-results.json"
    fi
    
else
    echo -e "${RED}❌ 测试失败 (退出码: $TEST_EXIT_CODE)${NC}"
    echo "================================================="
    echo -e "${RED}请检查失败的测试并修复问题${NC}"
    exit $TEST_EXIT_CODE
fi

# 清理临时文件（可选）
# rm -f test-results.json

echo -e "${BLUE}🔍 测试命令参考:${NC}"
echo "   单元测试:     ./scripts/run-tests.sh unit"
echo "   集成测试:     ./scripts/run-tests.sh integration" 
echo "   组件测试:     ./scripts/run-tests.sh components"
echo "   服务测试:     ./scripts/run-tests.sh services"
echo "   Hook测试:     ./scripts/run-tests.sh hooks"
echo "   模拟功能:     ./scripts/run-tests.sh impersonation"
echo "   完整测试:     ./scripts/run-tests.sh all"
echo "   无覆盖率:     ./scripts/run-tests.sh all false"