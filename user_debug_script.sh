#!/bin/bash

echo "=== 用户管理模块调试脚本 ==="
echo "当前时间: $(date)"
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_BASE_URL="http://localhost:8080"
PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"

echo -e "${BLUE}1. 检查项目结构${NC}"
echo "================================"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${GREEN}✓ 项目目录存在${NC}"
    
    # 检查关键文件
    echo "检查关键文件:"
    files=(
        "backend/models/user.go"
        "backend/handlers/user_management_handlers.go"
        "backend/database/user_management_repository.go"
        "frontend/src/types/user.ts"
        "frontend/src/services/userService.ts"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
        else
            echo -e "  ${RED}✗${NC} $file ${YELLOW}(缺失)${NC}"
        fi
    done
else
    echo -e "${RED}✗ 项目目录不存在: $PROJECT_DIR${NC}"
    exit 1
fi

echo
echo -e "${BLUE}2. 检查后端服务状态${NC}"
echo "================================"

# 检查服务是否运行
if curl -s --connect-timeout 5 "$API_BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务运行正常${NC}"
else
    echo -e "${YELLOW}⚠ 后端服务未响应，尝试检查其他端口...${NC}"
    
    # 检查常见端口
    ports=(8080 3000 8000 9000)
    for port in "${ports[@]}"; do
        if curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 发现服务运行在端口 $port${NC}"
            API_BASE_URL="http://localhost:$port"
            break
        fi
    done
fi

echo
echo -e "${BLUE}3. 测试用户管理API${NC}"
echo "================================"

# 测试用户列表API
echo "测试用户列表API..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE_URL/api/users" -H "Content-Type: application/json")
http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ 用户列表API响应正常 (HTTP $http_code)${NC}"
    echo "响应内容预览:"
    echo "$body" | head -c 500
    echo "..."
    
    # 检查响应结构
    if echo "$body" | grep -q '"users"'; then
        echo -e "${GREEN}✓ 包含users字段${NC}"
    else
        echo -e "${RED}✗ 缺少users字段${NC}"
    fi
    
    if echo "$body" | grep -q '"total"'; then
        echo -e "${GREEN}✓ 包含total字段${NC}"
    else
        echo -e "${RED}✗ 缺少total字段${NC}"
    fi
else
    echo -e "${RED}✗ 用户列表API响应异常 (HTTP $http_code)${NC}"
    echo "错误内容: $body"
fi

echo
# 测试用户统计API
echo "测试用户统计API..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE_URL/api/users/stats" -H "Content-Type: application/json")
http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ 用户统计API响应正常 (HTTP $http_code)${NC}"
    echo "响应内容: $body"
    
    # 检查统计字段
    stats_fields=("total_users" "active_users" "inactive_users" "pending_users")
    for field in "${stats_fields[@]}"; do
        if echo "$body" | grep -q "\"$field\""; then
            echo -e "${GREEN}✓ 包含$field字段${NC}"
        else
            echo -e "${RED}✗ 缺少$field字段${NC}"
        fi
    done
else
    echo -e "${RED}✗ 用户统计API响应异常 (HTTP $http_code)${NC}"
    echo "错误内容: $body"
fi

echo
echo -e "${BLUE}4. 检查数据库连接${NC}"
echo "================================"

# 如果有数据库检查命令，在这里添加
echo "请手动检查数据库连接状态"

echo
echo -e "${BLUE}5. 分析可能的问题${NC}"
echo "================================"

# 检查Go模型文件
if [ -f "$PROJECT_DIR/backend/models/user.go" ]; then
    echo "检查用户模型定义..."
    
    # 检查JSON标签
    if grep -q 'json:"id"' "$PROJECT_DIR/backend/models/user.go"; then
        echo -e "${GREEN}✓ 发现小写id的JSON标签${NC}"
    elif grep -q 'json:"ID"' "$PROJECT_DIR/backend/models/user.go"; then
        echo -e "${YELLOW}⚠ 发现大写ID的JSON标签，建议改为小写${NC}"
    else
        echo -e "${RED}✗ 未找到ID字段的JSON标签${NC}"
    fi
    
    # 检查用户名字段
    if grep -q 'json:"username"' "$PROJECT_DIR/backend/models/user.go"; then
        echo -e "${GREEN}✓ 发现正确的username JSON标签${NC}"
    elif grep -q 'json:"Username"' "$PROJECT_DIR/backend/models/user.go"; then
        echo -e "${YELLOW}⚠ 发现大写Username标签，建议改为小写${NC}"
    fi
fi

echo
echo -e "${BLUE}6. 建议的修复步骤${NC}"
echo "================================"

echo "基于检查结果，建议按以下顺序修复:"
echo "1. 检查后端JSON标签是否为小写下划线格式"
echo "2. 确认前端API调用的字段名匹配"
echo "3. 验证数据库中是否有用户数据"
echo "4. 检查网络请求的错误处理"
echo "5. 添加调试日志查看数据流"

echo
echo -e "${BLUE}7. 快速修复命令${NC}"
echo "================================"

cat << 'EOF'
# 如果需要创建测试用户数据，可以运行：
curl -X POST "$API_BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "password123"
  }'

# 检查前端控制台错误：
# 1. 打开浏览器开发者工具
# 2. 切换到Console标签页
# 3. 刷新用户管理页面
# 4. 查看是否有JavaScript错误

# 检查网络请求：
# 1. 打开浏览器开发者工具
# 2. 切换到Network标签页
# 3. 刷新页面
# 4. 查看API请求的状态和响应
EOF

echo
echo -e "${GREEN}调试脚本执行完成！${NC}"
echo "请根据上述检查结果进行相应修复。"