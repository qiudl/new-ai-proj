#!/bin/bash

# 测试项目更新API - 验证3个字段是否能正常保存
# 1. project_number (项目编号)
# 2. company_id (关联客户)  
# 3. progress (项目进度)

API_URL="http://localhost:8081/api/v1"
PROJECT_ID=1  # 测试项目ID

echo "========================================"
echo "测试项目字段更新"
echo "========================================"

# 0. 登录获取token
echo "0. 登录获取认证token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
if [ -z "$TOKEN" ]; then
  echo "❌ 无法获取认证token"
  exit 1
fi
echo "✅ 成功获取token"

# 1. 获取当前项目信息
echo -e "\n1. 获取项目当前信息..."
CURRENT_PROJECT=$(curl -s -X GET "${API_URL}/projects/${PROJECT_ID}" \
  -H "Authorization: Bearer $TOKEN")
echo "当前项目信息："
echo $CURRENT_PROJECT | jq '.data | {project_number, company_id, progress, name}'

# 2. 更新项目 - 设置3个关键字段
echo -e "\n2. 更新项目的3个关键字段..."
UPDATE_DATA='{
  "project_number": "TEST-2024-001",
  "name": "测试项目更新",
  "description": "测试项目编号、关联客户和进度字段",
  "company_id": 8,
  "progress": 75,
  "status": "active",
  "priority": "high",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}'

UPDATE_RESPONSE=$(curl -s -X PUT \
  "${API_URL}/projects/${PROJECT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$UPDATE_DATA")

echo "更新响应："
echo $UPDATE_RESPONSE | jq '.'

# 3. 重新获取项目信息，验证更新是否成功
echo -e "\n3. 验证更新结果..."
UPDATED_PROJECT=$(curl -s -X GET "${API_URL}/projects/${PROJECT_ID}" \
  -H "Authorization: Bearer $TOKEN")
echo "更新后的项目信息："
echo $UPDATED_PROJECT | jq '.data | {project_number, company_id, progress, name}'

# 4. 检查字段是否正确更新
echo -e "\n4. 验证结果："
PROJECT_NUMBER=$(echo $UPDATED_PROJECT | jq -r '.data.project_number')
COMPANY_ID=$(echo $UPDATED_PROJECT | jq -r '.data.company_id')  
PROGRESS=$(echo $UPDATED_PROJECT | jq -r '.data.progress')

if [ "$PROJECT_NUMBER" = "TEST-2024-001" ]; then
  echo "✅ 项目编号更新成功: $PROJECT_NUMBER"
else
  echo "❌ 项目编号更新失败: 期望 TEST-2024-001, 实际 $PROJECT_NUMBER"
fi

if [ "$COMPANY_ID" = "8" ]; then
  echo "✅ 关联客户更新成功: $COMPANY_ID"
else
  echo "❌ 关联客户更新失败: 期望 8, 实际 $COMPANY_ID"
fi

if [ "$PROGRESS" = "75" ]; then
  echo "✅ 项目进度更新成功: $PROGRESS%"
else
  echo "❌ 项目进度更新失败: 期望 75, 实际 $PROGRESS"
fi

echo -e "\n========================================"
echo "测试完成"
echo "========================================"

# 5. 恢复原始值（可选）
echo -e "\n5. 恢复原始值..."
RESTORE_DATA='{
  "project_number": "P101",
  "name": "AI上下文任务系统",
  "description": "智能上下文系统平台的最小可行产品开发",
  "company_id": 10,
  "progress": 70,
  "status": "planning",
  "priority": "medium",
  "start_date": "2025-08-01",
  "end_date": "2026-09-30"
}'

RESTORE_RESPONSE=$(curl -s -X PUT \
  "${API_URL}/projects/${PROJECT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$RESTORE_DATA")

if [ $(echo $RESTORE_RESPONSE | jq -r '.success') = "true" ]; then
  echo "✅ 已恢复原始值"
else
  echo "⚠️  恢复原始值失败"
fi
