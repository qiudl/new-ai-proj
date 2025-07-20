#!/bin/bash

echo "生成中间件测试数据..."

API_BASE="http://localhost:8080/api/v1"

# 创建测试用户
echo "创建测试用户..."
curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin",
        "password": "admin123"
    }' | jq .

# 创建一些测试项目和任务以生成审计日志
echo "创建测试项目..."
ADMIN_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    curl -s -X POST "$API_BASE/projects" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "name": "中间件测试项目",
            "description": "用于测试审计和权限系统的项目"
        }' | jq .

    echo "创建测试任务..."
    curl -s -X POST "$API_BASE/projects/1/tasks" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "title": "测试任务",
            "description": "用于测试审计日志的任务",
            "status": "todo"
        }' | jq .

    echo "查看生成的审计日志..."
    curl -s -X GET "$API_BASE/system/audit/logs?limit=10" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
else
    echo "无法获取管理员token，请检查登录凭据"
fi
