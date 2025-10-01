#!/bin/bash

# Test script for archive/unarchive APIs
set -e

BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=1
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwiZXhwIjoxNzU3NzEyMDE4LCJpYXQiOjE3NTc2MjU2MTgsImp0aSI6ImQxZDY1MTE0LTVkM2UtNDkxZC05NzlkLTM2NzQwZmY5NGNiMCJ9.fKMZb_Vt5hD7kGX4Yy8I5_r9zJLnPw7XjPmEn7zZd7Y"

echo "🧪 Testing Archive/Unarchive API Interfaces"
echo "==========================================="

# Create a test task first
echo "1️⃣ Creating test task..."
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "归档API测试任务",
    "description": "用于测试归档和取消归档API",
    "status": "todo",
    "priority": "medium"
  }')

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data.id')
echo "Created task with ID: $TASK_ID"
echo "Task creation response: $TASK_RESPONSE"

# Test 1: Archive the task
echo ""
echo "2️⃣ Testing Archive API (should succeed with 200)..."
ARCHIVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$ARCHIVE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ARCHIVE_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Archive API PASSED - returned 200 OK"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Archive API FAILED - expected 200, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 2: Try to archive already archived task (should fail)
echo ""
echo "3️⃣ Testing Archive already archived task (should fail with 409)..."
ARCHIVE_AGAIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$ARCHIVE_AGAIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ARCHIVE_AGAIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "409" ]; then
    echo "✅ Archive duplicate PASSED - returned 409 Conflict"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Archive duplicate FAILED - expected 409, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 3: Unarchive with specific status
echo ""
echo "4️⃣ Testing Unarchive API with target status 'in_progress' (should succeed with 200)..."
UNARCHIVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/unarchive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }')

HTTP_CODE=$(echo "$UNARCHIVE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UNARCHIVE_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Unarchive API PASSED - returned 200 OK"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Unarchive API FAILED - expected 200, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 4: Try to unarchive non-archived task (should fail)
echo ""
echo "5️⃣ Testing Unarchive non-archived task (should fail with 409)..."
UNARCHIVE_AGAIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/unarchive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "todo"
  }')

HTTP_CODE=$(echo "$UNARCHIVE_AGAIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UNARCHIVE_AGAIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "409" ]; then
    echo "✅ Unarchive non-archived PASSED - returned 409 Conflict"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Unarchive non-archived FAILED - expected 409, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 5: Archive again to test default unarchive
echo ""
echo "6️⃣ Re-archiving task for default unarchive test..."
curl -s -X POST "$BASE_URL/tasks/$TASK_ID/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" > /dev/null

echo "7️⃣ Testing Unarchive API without target status (should default to 'todo')..."
UNARCHIVE_DEFAULT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/unarchive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$UNARCHIVE_DEFAULT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UNARCHIVE_DEFAULT_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Unarchive default status PASSED - returned 200 OK"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Unarchive default status FAILED - expected 200, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 6: Test with invalid target status
echo ""
echo "8️⃣ Re-archiving task for invalid status test..."
curl -s -X POST "$BASE_URL/tasks/$TASK_ID/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" > /dev/null

echo "9️⃣ Testing Unarchive API with invalid target status (should fail with 400)..."
UNARCHIVE_INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/$TASK_ID/unarchive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "invalid_status"
  }')

HTTP_CODE=$(echo "$UNARCHIVE_INVALID_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UNARCHIVE_INVALID_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "400" ]; then
    echo "✅ Unarchive invalid status PASSED - returned 400 Bad Request"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Unarchive invalid status FAILED - expected 400, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 7: Test with non-existent task
echo ""
echo "🔟 Testing Archive API with non-existent task (should fail with 404)..."
ARCHIVE_NONEXISTENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/999999/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$ARCHIVE_NONEXISTENT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ARCHIVE_NONEXISTENT_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "404" ]; then
    echo "✅ Archive non-existent task PASSED - returned 404 Not Found"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Archive non-existent task FAILED - expected 404, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Cleanup: Delete the test task
echo ""
echo "🧹 Cleaning up test task..."
curl -s -X DELETE "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

echo ""
echo "🎯 Archive/Unarchive API Test Complete!"