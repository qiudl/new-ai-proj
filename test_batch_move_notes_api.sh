#!/bin/bash

# T2.6 批量移动笔记到目录 API 测试脚本
# 测试批量移动工作笔记到指定目录的功能

set -e

# 配置
API_BASE="http://localhost:8081/api/v1"
TOKEN_FILE=".env.mcp-token"

# 获取token
if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(grep "^MCP_SYSTEM_TOKEN=" "$TOKEN_FILE" | cut -d= -f2)
    if [ -z "$TOKEN" ]; then
        echo "❌ Token not found in $TOKEN_FILE"
        exit 1
    fi
else
    echo "❌ Token file $TOKEN_FILE not found"
    exit 1
fi

echo "🚀 Testing T2.6 Batch Move Work Notes to Folder API"
echo "================================================"

# 函数：调用API
call_api() {
    local method="$1"
    local endpoint="$2" 
    local data="$3"
    local description="$4"
    
    echo ""
    echo "📡 $description"
    echo "   $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "   Data: $data"
        response=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data" \
            "$API_BASE$endpoint")
    else
        response=$(curl -s -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            "$API_BASE$endpoint")
    fi
    
    echo "   Response: $response"
    echo "$response"
}

# 1. 创建测试工作笔记
echo "1️⃣ 创建测试工作笔记"
note1_response=$(call_api "POST" "/work-notes" '{
    "title": "Test Note 1 for Batch Move",
    "content": "This is test note 1 content",
    "work_note_type": "general",
    "visibility": "private"
}' "创建测试笔记1")

note2_response=$(call_api "POST" "/work-notes" '{
    "title": "Test Note 2 for Batch Move", 
    "content": "This is test note 2 content",
    "work_note_type": "meeting",
    "visibility": "private"
}' "创建测试笔记2")

note3_response=$(call_api "POST" "/work-notes" '{
    "title": "Test Note 3 for Batch Move",
    "content": "This is test note 3 content", 
    "work_note_type": "idea",
    "visibility": "private"
}' "创建测试笔记3")

# 提取笔记ID
note1_id=$(echo "$note1_response" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)
note2_id=$(echo "$note2_response" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)
note3_id=$(echo "$note3_response" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)

echo ""
echo "📝 创建的笔记ID: $note1_id, $note2_id, $note3_id"

# 2. 测试批量移动到根目录（target_folder_id: null）
echo ""
echo "2️⃣ 批量移动笔记到根目录"
call_api "POST" "/work-notes/batch/move" "{
    \"note_ids\": [$note1_id, $note2_id],
    \"target_folder_id\": null,
    \"transaction_mode\": true
}" "批量移动到根目录（事务模式）"

# 3. 测试批量移动（非事务模式）
echo ""
echo "3️⃣ 批量移动笔记（非事务模式）"
call_api "POST" "/work-notes/batch/move" "{
    \"note_ids\": [$note1_id, $note2_id, $note3_id],
    \"target_folder_id\": null,
    \"transaction_mode\": false
}" "批量移动（非事务模式）"

# 4. 测试错误情况：无效的笔记ID
echo ""
echo "4️⃣ 测试错误情况：无效的笔记ID"
call_api "POST" "/work-notes/batch/move" '{
    "note_ids": [99999, 99998],
    "target_folder_id": null,
    "transaction_mode": true
}' "尝试移动不存在的笔记"

# 5. 测试错误情况：空的笔记ID列表
echo ""
echo "5️⃣ 测试错误情况：空的笔记ID列表"
call_api "POST" "/work-notes/batch/move" '{
    "note_ids": [],
    "target_folder_id": null,
    "transaction_mode": false
}' "空的笔记ID列表"

# 6. 验证笔记状态
echo ""
echo "6️⃣ 验证笔记移动结果"
if [ -n "$note1_id" ]; then
    call_api "GET" "/work-notes/$note1_id" "" "获取笔记1状态"
fi

echo ""
echo "✅ T2.6 批量移动笔记到目录 API 测试完成"
echo "================================================"
