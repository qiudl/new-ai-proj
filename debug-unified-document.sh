#!/bin/bash

# 调试统一文档API问题

set -e

echo "🔍 深度调试统一文档API问题"

# 基础配置
BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=1
TASK_ID=2

# 函数：获取登录token
get_token() {
    echo "🔑 获取登录token..."
    TOKEN_RESPONSE=$(NO_PROXY=localhost,127.0.0.1 curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"password123"}' \
        "$BASE_URL/auth/login")
    
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "❌ 登录失败"
        echo "响应: $TOKEN_RESPONSE"
        exit 1
    fi
    
    echo "✅ 登录成功"
}

# 函数：检查健康状态
check_health() {
    echo ""
    echo "🏥 检查统一文档服务健康状态..."
    HEALTH_RESPONSE=$(NO_PROXY=localhost,127.0.0.1 curl -s "http://localhost:8080/documents/health")
    echo "健康检查响应: $HEALTH_RESPONSE"
    
    if echo "$HEALTH_RESPONSE" | grep -q '"success":true'; then
        echo "✅ 统一文档服务健康"
    else
        echo "❌ 统一文档服务不健康"
        return 1
    fi
}

# 函数：检查文件系统
check_filesystem() {
    echo ""
    echo "📁 检查文件系统状态..."
    
    # 检查根目录docs
    if [ -d "./docs" ]; then
        echo "✅ 根目录 ./docs 存在"
        ls -la ./docs/ | head -5
    else
        echo "❌ 根目录 ./docs 不存在"
    fi
    
    # 检查backend/docs
    if [ -d "./backend/docs" ]; then
        echo "✅ backend/docs 存在"
        ls -la ./backend/docs/ | head -5
    else
        echo "❌ backend/docs 不存在"
    fi
    
    # 检查项目文档目录
    TARGET_DIR="./docs/projects/project-$PROJECT_ID"
    if [ -d "$TARGET_DIR" ]; then
        echo "✅ 目标目录 $TARGET_DIR 存在"
        ls -la "$TARGET_DIR/"
    else
        echo "⚠️ 目标目录 $TARGET_DIR 不存在，需要创建"
        mkdir -p "$TARGET_DIR"
        echo "✅ 已创建目录 $TARGET_DIR"
    fi
}

# 函数：详细测试创建
test_create_detailed() {
    echo ""
    echo "📝 详细测试创建文档..."
    
    CREATE_RESPONSE=$(NO_PROXY=localhost,127.0.0.1 curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "content": "# 调试测试文档\n\n这是用于调试的测试文档。\n\n- 项目ID: '$PROJECT_ID'\n- 任务ID: '$TASK_ID'\n- 创建时间: '$(date)'",
            "format": "markdown"
        }' \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents")
    
    echo "创建响应详情:"
    echo "$CREATE_RESPONSE"
    
    HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')
    
    echo "HTTP状态码: $HTTP_CODE"
    echo "响应体: $RESPONSE_BODY"
    
    if [ "$HTTP_CODE" = "201" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
        echo "✅ 创建成功"
        return 0
    else
        echo "❌ 创建失败"
        return 1
    fi
}

# 函数：详细测试读取
test_read_detailed() {
    echo ""
    echo "📖 详细测试读取文档..."
    
    READ_RESPONSE=$(NO_PROXY=localhost,127.0.0.1 curl -s -w "\nHTTP_CODE:%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents")
    
    echo "读取响应详情:"
    echo "$READ_RESPONSE"
    
    HTTP_CODE=$(echo "$READ_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$READ_RESPONSE" | sed '/HTTP_CODE:/d')
    
    echo "HTTP状态码: $HTTP_CODE"
    echo "响应体: $RESPONSE_BODY"
    
    if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
        echo "✅ 读取成功"
        return 0
    else
        echo "❌ 读取失败"
        return 1
    fi
}

# 函数：检查实际文件
check_actual_file() {
    echo ""
    echo "🔍 检查实际生成的文件..."
    
    FILE_PATH="./docs/projects/project-$PROJECT_ID/task-$TASK_ID.md"
    if [ -f "$FILE_PATH" ]; then
        echo "✅ 文件存在: $FILE_PATH"
        echo "文件大小: $(wc -c < "$FILE_PATH") 字节"
        echo "文件内容预览:"
        head -10 "$FILE_PATH"
    else
        echo "❌ 文件不存在: $FILE_PATH"
    fi
}

# 主测试流程
main() {
    echo "开始详细调试..."
    
    # 1. 获取token
    get_token
    
    # 2. 检查健康状态
    if ! check_health; then
        echo "❌ 服务不健康，停止测试"
        exit 1
    fi
    
    # 3. 检查文件系统
    check_filesystem
    
    # 4. 尝试创建文档
    if test_create_detailed; then
        echo "✅ 创建测试通过"
    else
        echo "❌ 创建测试失败，停止后续测试"
        exit 1
    fi
    
    # 5. 检查实际文件
    check_actual_file
    
    # 6. 尝试读取文档
    if test_read_detailed; then
        echo "✅ 读取测试通过"
    else
        echo "❌ 读取测试失败"
        exit 1
    fi
    
    echo ""
    echo "🎉 所有测试完成！"
    echo ""
    echo "📊 调试总结："
    echo "- 统一文档服务: ✅ 健康"
    echo "- 文档创建: ✅ 成功"
    echo "- 文档读取: ✅ 成功"
    echo "- 文件系统: ✅ 正常"
    echo ""
    echo "🔗 查看测试文档: file://$PWD/docs/projects/project-$PROJECT_ID/task-$TASK_ID.md"
}

# 运行主函数
main "$@"