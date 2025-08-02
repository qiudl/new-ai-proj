#!/bin/bash

# 创建测试数据 - 带子任务的任务
echo "🚀 创建测试数据..."

API_BASE="http://localhost:8080/api/v1"

# 生成JWT token
echo "🔑 生成JWT token..."
TOKEN=$(node generate-jwt-proper.js | grep -A1 "生成的JWT Token:" | tail -1 | tr -d '\n\r ')

if [ -z "$TOKEN" ]; then
    echo "❌ JWT token生成失败"
    exit 1
fi

echo "✅ JWT token生成成功"

# 1. 获取第一个项目ID
echo "📋 获取项目列表..."
PROJECT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/projects")
PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$PROJECT_ID" ]; then
    echo "📁 没有找到项目，创建测试项目..."
    # 创建一个测试项目
    CREATE_PROJECT_RESPONSE=$(curl -s -X POST "$API_BASE/projects" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "子任务表格测试项目",
            "description": "用于测试子任务表格功能的项目"
        }')
    
    PROJECT_ID=$(echo "$CREATE_PROJECT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    
    if [ -z "$PROJECT_ID" ]; then
        echo "❌ 项目创建失败"
        echo "Response: $CREATE_PROJECT_RESPONSE"
        exit 1
    fi
    
    echo "✅ 测试项目创建成功，ID: $PROJECT_ID"
fi

echo "✅ 使用项目ID: $PROJECT_ID"

# 2. 创建父任务
echo "👨‍👩‍👧‍👦 创建父任务..."
PARENT_TASK_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "子任务表格测试-父任务",
        "description": "用于测试子任务表格功能的父任务",
        "status": "in_progress",
        "custom_fields": {
            "priority": "high"
        }
    }')

PARENT_TASK_ID=$(echo "$PARENT_TASK_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$PARENT_TASK_ID" ]; then
    echo "❌ 父任务创建失败"
    echo "Response: $PARENT_TASK_RESPONSE"
    exit 1
fi

echo "✅ 父任务创建成功，ID: $PARENT_TASK_ID"

# 3. 创建子任务
echo "👶 创建子任务..."

# 子任务1
echo "  创建子任务1..."
SUBTASK1_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"title\": \"子任务1-前端开发\",
        \"description\": \"开发前端界面功能\",
        \"status\": \"todo\",
        \"parent_id\": $PARENT_TASK_ID,
        \"custom_fields\": {
            \"priority\": \"high\"
        }
    }")

# 子任务2
echo "  创建子任务2..."
SUBTASK2_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"title\": \"子任务2-后端API\",
        \"description\": \"开发后端API接口\",
        \"status\": \"in_progress\",
        \"parent_id\": $PARENT_TASK_ID,
        \"custom_fields\": {
            \"priority\": \"medium\"
        }
    }")

# 子任务3
echo "  创建子任务3..."
SUBTASK3_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"title\": \"子任务3-数据库设计\",
        \"description\": \"设计数据库表结构\",
        \"status\": \"completed\",
        \"parent_id\": $PARENT_TASK_ID,
        \"custom_fields\": {
            \"priority\": \"low\"
        }
    }")

# 子任务4
echo "  创建子任务4..."
SUBTASK4_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"title\": \"子任务4-测试用例编写\",
        \"description\": \"编写单元测试和集成测试\",
        \"status\": \"todo\",
        \"parent_id\": $PARENT_TASK_ID,
        \"custom_fields\": {
            \"priority\": \"medium\"
        }
    }")

# 子任务5
echo "  创建子任务5..."
SUBTASK5_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"title\": \"子任务5-文档编写\",
        \"description\": \"编写技术文档和用户手册\",
        \"status\": \"todo\",
        \"parent_id\": $PARENT_TASK_ID,
        \"custom_fields\": {
            \"priority\": \"low\"
        }
    }")

echo "🎉 测试数据创建完成！"
echo "📄 父任务详情页: http://localhost:3000/projects/$PROJECT_ID/tasks/$PARENT_TASK_ID"
echo ""
echo "🔍 手动测试步骤:"
echo "1. 打开浏览器访问 http://localhost:3000"
echo "2. 使用 admin/admin123 登录"
echo "3. 访问父任务详情页: http://localhost:3000/projects/$PROJECT_ID/tasks/$PARENT_TASK_ID"
echo "4. 检查子任务列表中的第一列是否为'任务ID'"
echo "5. 检查各列标题是否有排序图标"
echo "6. 点击各列标题测试排序功能"
