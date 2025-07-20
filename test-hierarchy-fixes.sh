#!/bin/bash

# 任务层级和项目继承修复验证脚本
# ========================================

echo "🔍 全局任务列表子任务缩进和项目继承问题修复验证"
echo "=================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}测试 $TOTAL_TESTS: $test_name${NC}"
    echo "执行: $test_command"
    
    # 执行测试命令
    result=$(eval "$test_command" 2>/dev/null)
    
    if [[ "$result" == *"$expected_result"* ]]; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 失败${NC}"
        echo "期望包含: $expected_result"
        echo "实际结果: $result"
    fi
}

# 检查服务状态
echo -e "${YELLOW}检查服务状态...${NC}"

# 检查前端是否运行
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ 前端服务正在运行 (http://localhost:3000)${NC}"
else
    echo -e "${RED}❌ 前端服务未运行${NC}"
    echo "请运行: npm start"
    exit 1
fi

# 检查后端是否运行
if curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${GREEN}✅ 后端服务正在运行 (http://localhost:8080)${NC}"
else
    echo -e "${RED}❌ 后端服务未运行${NC}"
    echo "请运行: docker-compose up -d"
    exit 1
fi

# CSS文件检查
echo -e "\n${YELLOW}检查CSS文件...${NC}"

CSS_FILE="frontend/src/styles/task-hierarchy.css"
if [[ -f "$CSS_FILE" ]]; then
    echo -e "${GREEN}✅ CSS文件存在: $CSS_FILE${NC}"
    
    # 检查关键CSS类
    if grep -q "task-hierarchy-item" "$CSS_FILE"; then
        echo -e "${GREEN}✅ 包含 task-hierarchy-item 类${NC}"
    else
        echo -e "${RED}❌ 缺少 task-hierarchy-item 类${NC}"
    fi
    
    if grep -q "depth-1" "$CSS_FILE"; then
        echo -e "${GREEN}✅ 包含层级样式 depth-1${NC}"
    else
        echo -e "${RED}❌ 缺少层级样式${NC}"
    fi
    
    if grep -q "task-connection-line" "$CSS_FILE"; then
        echo -e "${GREEN}✅ 包含连接线样式${NC}"
    else
        echo -e "${RED}❌ 缺少连接线样式${NC}"
    fi
    
    if grep -q "@media.*max-width.*768px" "$CSS_FILE"; then
        echo -e "${GREEN}✅ 包含响应式样式${NC}"
    else
        echo -e "${RED}❌ 缺少响应式样式${NC}"
    fi
    
else
    echo -e "${RED}❌ CSS文件不存在: $CSS_FILE${NC}"
fi

# 检查App.tsx中是否引入了CSS
APP_FILE="frontend/src/App.tsx"
if grep -q "./styles/task-hierarchy.css" "$APP_FILE"; then
    echo -e "${GREEN}✅ App.tsx 中已引入CSS文件${NC}"
else
    echo -e "${RED}❌ App.tsx 中未引入CSS文件${NC}"
fi

# API测试
echo -e "\n${YELLOW}API测试...${NC}"

# 创建测试用的项目和任务
echo "创建测试数据..."

# 先登录获取token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if [[ "$LOGIN_RESPONSE" == *"token"* ]]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ 登录成功，获取到token${NC}"
else
    echo -e "${RED}❌ 登录失败${NC}"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi

# 创建测试项目
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:8080/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"层级测试项目","description":"用于测试任务层级的项目"}')

if [[ "$PROJECT_RESPONSE" == *"id"* ]]; then
    PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ 测试项目创建成功，ID: $PROJECT_ID${NC}"
else
    echo -e "${YELLOW}⚠️  项目可能已存在，尝试获取现有项目${NC}"
    PROJECTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/projects)
    PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    if [[ -n "$PROJECT_ID" ]]; then
        echo -e "${GREEN}✅ 使用现有项目，ID: $PROJECT_ID${NC}"
    else
        echo -e "${RED}❌ 无法获取项目ID${NC}"
        exit 1
    fi
fi

# 创建父任务
PARENT_TASK_RESPONSE=$(curl -s -X POST "http://localhost:8080/projects/$PROJECT_ID/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title":"父任务-环境搭建",
    "description":"这是一个父任务",
    "status":"todo",
    "custom_fields":{"priority":"high","tags":["测试","父任务"]}
  }')

if [[ "$PARENT_TASK_RESPONSE" == *"id"* ]]; then
    PARENT_TASK_ID=$(echo "$PARENT_TASK_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ 父任务创建成功，ID: $PARENT_TASK_ID${NC}"
else
    echo -e "${RED}❌ 父任务创建失败${NC}"
    echo "响应: $PARENT_TASK_RESPONSE"
fi

# 创建子任务
if [[ -n "$PARENT_TASK_ID" ]]; then
    CHILD_TASK_RESPONSE=$(curl -s -X POST "http://localhost:8080/projects/$PROJECT_ID/tasks" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"title\":\"子任务-Docker配置\",
        \"description\":\"这是一个子任务\",
        \"status\":\"todo\",
        \"parent_id\":$PARENT_TASK_ID,
        \"custom_fields\":{\"priority\":\"medium\",\"tags\":[\"测试\",\"子任务\"]}
      }")
    
    if [[ "$CHILD_TASK_RESPONSE" == *"id"* ]]; then
        CHILD_TASK_ID=$(echo "$CHILD_TASK_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        echo -e "${GREEN}✅ 子任务创建成功，ID: $CHILD_TASK_ID${NC}"
    else
        echo -e "${RED}❌ 子任务创建失败${NC}"
        echo "响应: $CHILD_TASK_RESPONSE"
    fi
fi

# 测试全局任务列表API
echo -e "\n${YELLOW}测试全局任务列表API...${NC}"

GLOBAL_TASKS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/tasks")

if [[ "$GLOBAL_TASKS_RESPONSE" == *"data"* ]]; then
    echo -e "${GREEN}✅ 全局任务列表API正常${NC}"
    
    # 检查是否包含项目信息
    if [[ "$GLOBAL_TASKS_RESPONSE" == *"project_name"* ]]; then
        echo -e "${GREEN}✅ 任务包含项目名称信息${NC}"
    else
        echo -e "${RED}❌ 任务缺少项目名称信息${NC}"
    fi
    
    # 检查是否包含父子关系信息
    if [[ "$GLOBAL_TASKS_RESPONSE" == *"parent_id"* ]]; then
        echo -e "${GREEN}✅ 任务包含父子关系信息${NC}"
    else
        echo -e "${RED}❌ 任务缺少父子关系信息${NC}"
    fi
    
else
    echo -e "${RED}❌ 全局任务列表API异常${NC}"
    echo "响应: $GLOBAL_TASKS_RESPONSE"
fi

# 测试项目任务列表API
echo -e "\n${YELLOW}测试项目任务列表API...${NC}"

PROJECT_TASKS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/projects/$PROJECT_ID/tasks")

if [[ "$PROJECT_TASKS_RESPONSE" == *"data"* ]]; then
    echo -e "${GREEN}✅ 项目任务列表API正常${NC}"
else
    echo -e "${RED}❌ 项目任务列表API异常${NC}"
    echo "响应: $PROJECT_TASKS_RESPONSE"
fi

# 前端文件检查
echo -e "\n${YELLOW}检查前端实现...${NC}"

TASKS_PAGE="frontend/src/pages/TasksPage.tsx"
if [[ -f "$TASKS_PAGE" ]]; then
    echo -e "${GREEN}✅ TasksPage.tsx 文件存在${NC}"
    
    # 检查是否包含层级处理逻辑
    if grep -q "buildExpandedDataSource" "$TASKS_PAGE"; then
        echo -e "${GREEN}✅ 包含层级数据构建逻辑${NC}"
    else
        echo -e "${RED}❌ 缺少层级数据构建逻辑${NC}"
    fi
    
    # 检查是否包含CSS类应用
    if grep -q "task-hierarchy-item" "$TASKS_PAGE"; then
        echo -e "${GREEN}✅ 应用了层级CSS类${NC}"
    else
        echo -e "${RED}❌ 未应用层级CSS类${NC}"
    fi
    
    # 检查是否包含项目继承逻辑
    if grep -q "parentTaskForNew?.project_id" "$TASKS_PAGE"; then
        echo -e "${GREEN}✅ 包含项目继承逻辑${NC}"
    else
        echo -e "${RED}❌ 缺少项目继承逻辑${NC}"
    fi
    
    # 检查是否包含层级深度计算
    if grep -q "depth.*record.depth" "$TASKS_PAGE"; then
        echo -e "${GREEN}✅ 包含层级深度计算${NC}"
    else
        echo -e "${RED}❌ 缺少层级深度计算${NC}"
    fi
    
else
    echo -e "${RED}❌ TasksPage.tsx 文件不存在${NC}"
fi

# 网络连通性测试
echo -e "\n${YELLOW}网络连通性测试...${NC}"

# 测试前端到后端的连接
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health)
if [[ "$HEALTH_RESPONSE" == *"OK"* ]] || [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
    echo -e "${GREEN}✅ 后端健康检查正常${NC}"
else
    echo -e "${RED}❌ 后端健康检查异常${NC}"
    echo "响应: $HEALTH_RESPONSE"
fi

# 浏览器功能测试建议
echo -e "\n${YELLOW}手动测试建议...${NC}"
echo "请在浏览器中执行以下手动测试："
echo ""
echo "1. 访问 http://localhost:3000/tasks (全局任务列表)"
echo "   - 检查子任务是否有视觉缩进"
echo "   - 检查项目名称是否正确显示"
echo "   - 检查层级连接线是否显示"
echo ""
echo "2. 创建子任务测试："
echo "   - 在全局模式下为任务创建子任务"
echo "   - 验证子任务是否继承父任务的项目"
echo "   - 验证项目名称显示是否正确"
echo ""
echo "3. 层级展开测试："
echo "   - 点击展开/收起按钮"
echo "   - 验证子任务层级缩进效果"
echo "   - 检查连接线和深度指示器"
echo ""
echo "4. 响应式测试："
echo "   - 调整浏览器窗口大小"
echo "   - 检查移动端的简化样式"
echo ""

# 样式测试页面
echo "5. 查看样式测试页面："
echo "   http://localhost:3000/task-hierarchy-test.html"
echo ""

# 总结
echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}修复验证总结${NC}"
echo -e "${BLUE}===============================================${NC}"

if [[ -f "$CSS_FILE" ]] && grep -q "task-hierarchy-item" "$CSS_FILE" && grep -q "./styles/task-hierarchy.css" "$APP_FILE"; then
    echo -e "${GREEN}✅ CSS样式文件：已正确创建和引入${NC}"
else
    echo -e "${RED}❌ CSS样式文件：存在问题${NC}"
fi

if [[ -f "$TASKS_PAGE" ]] && grep -q "task-hierarchy-item" "$TASKS_PAGE" && grep -q "parentTaskForNew?.project_id" "$TASKS_PAGE"; then
    echo -e "${GREEN}✅ 前端逻辑修复：已完成${NC}"
else
    echo -e "${RED}❌ 前端逻辑修复：存在问题${NC}"
fi

if [[ "$GLOBAL_TASKS_RESPONSE" == *"project_name"* ]] && [[ "$GLOBAL_TASKS_RESPONSE" == *"parent_id"* ]]; then
    echo -e "${GREEN}✅ 后端API数据：包含必要信息${NC}"
else
    echo -e "${RED}❌ 后端API数据：缺少必要信息${NC}"
fi

echo ""
echo -e "${YELLOW}⚠️  注意事项：${NC}"
echo "• 确保Docker服务正在运行"
echo "• 确保前端开发服务器正在运行"
echo "• 建议进行手动UI测试以验证视觉效果"
echo "• 检查浏览器控制台是否有CSS错误"

echo ""
echo -e "${BLUE}下一步：进行步骤4测试验证${NC}"
echo "1. 访问任务列表页面"
echo "2. 创建父子任务进行测试"
echo "3. 验证层级缩进和项目继承功能"
echo "4. 检查响应式设计在不同设备上的表现"

echo -e "\n${GREEN}修复实施完成！${NC}"
