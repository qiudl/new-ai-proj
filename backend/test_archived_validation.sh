#!/bin/bash

# Test script for archived task validation
set -e

BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=1
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwiZXhwIjoxNzU3NzEyMDE4LCJpYXQiOjE3NTc2MjU2MTgsImp0aSI6ImQxZDY1MTE0LTVkM2UtNDkxZC05NzlkLTM2NzQwZmY5NGNiMCJ9.fKMZb_Vt5hD7kGX4Yy8I5_r9zJLnPw7XjPmEn7zZd7Y"

echo "🧪 Testing Archived Task Validation Mechanism"
echo "============================================="

# Create a test task first
echo "1️⃣ Creating test task..."
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "归档测试任务",
    "description": "用于测试归档任务拦截机制",
    "status": "todo",
    "priority": "medium"
  }')

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data.id')
echo "Created task with ID: $TASK_ID"

# Archive the task
echo "2️⃣ Archiving task..."
ARCHIVE_RESPONSE=$(curl -s -X PUT "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "归档测试任务",
    "description": "用于测试归档任务拦截机制",
    "status": "archived",
    "priority": "medium"
  }')
echo "Archive response: $ARCHIVE_RESPONSE"

# Test 1: Try to update archived task (should fail)
echo "3️⃣ Testing update of archived task (should fail with 409)..."
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "尝试修改已归档任务",
    "description": "这应该失败",
    "status": "archived",
    "priority": "high"
  }')

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "409" ]; then
    echo "✅ Update validation PASSED - returned 409 Conflict"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Update validation FAILED - expected 409, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 2: Try to delete archived task (should fail)
echo "4️⃣ Testing delete of archived task (should fail with 409)..."
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$DELETE_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "409" ]; then
    echo "✅ Delete validation PASSED - returned 409 Conflict"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Delete validation FAILED - expected 409, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 3: Try to move archived task (should fail)
echo "5️⃣ Testing move of archived task (should fail with 409)..."
MOVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/move" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "position": 1
  }')

HTTP_CODE=$(echo "$MOVE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$MOVE_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "409" ]; then
    echo "✅ Move validation PASSED - returned 409 Conflict"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Move validation FAILED - expected 409, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 4: Try to reorder archived task (should fail)
echo "6️⃣ Testing reorder of archived task (should fail with 409)..."
REORDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/reorder" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": 2
  }')

HTTP_CODE=$(echo "$REORDER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REORDER_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "409" ]; then
    echo "✅ Reorder validation PASSED - returned 409 Conflict"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Reorder validation FAILED - expected 409, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 5: Try to unarchive (restore) task (should succeed)
echo "7️⃣ Testing unarchive task (should succeed with 200)..."
UNARCHIVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "已恢复的测试任务",
    "description": "任务已从归档状态恢复",
    "status": "todo",
    "priority": "medium"
  }')

HTTP_CODE=$(echo "$UNARCHIVE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UNARCHIVE_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Unarchive validation PASSED - returned 200 OK"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Unarchive validation FAILED - expected 200, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Cleanup: Delete the test task
echo "8️⃣ Cleaning up test task..."
curl -s -X DELETE "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

echo ""
echo "🎯 Archived Task Validation Test Complete!"