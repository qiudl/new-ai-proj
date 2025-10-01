#!/bin/bash

# Archive Functionality Validation Test
# Focused test for archive functionality without complex framework

set -e

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
PROJECT_ID="${PROJECT_ID:-1}"

echo "🧪 Archive Functionality Validation Test"
echo "========================================"

# Get authentication token
echo "🔐 Getting authentication token..."
AUTH_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"username": "admin"}' \
    "$BASE_URL/auth/dev/quick-login")

AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.data.access_token')

if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" = "null" ]; then
    echo "❌ Failed to get authentication token"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Authentication token obtained"

# Test 1: Create a test task
echo
echo "📋 Test 1: Creating test task"
TASK_DATA='{"title": "Archive Validation Test", "description": "Test task for archive validation", "status": "todo"}'
CREATE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$TASK_DATA" \
    "$BASE_URL/projects/$PROJECT_ID/tasks")

TASK_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')

if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
    echo "❌ Failed to create test task"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

echo "✅ Created task with ID: $TASK_ID"

# Test 2: Archive the task
echo
echo "📦 Test 2: Archiving task"
ARCHIVE_DATA='{"reason": "Testing archive validation"}'
ARCHIVE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$ARCHIVE_DATA" \
    "$BASE_URL/tasks/$TASK_ID/archive")

if echo "$ARCHIVE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Task archived successfully"
else
    echo "❌ Failed to archive task"
    echo "Response: $ARCHIVE_RESPONSE"
    exit 1
fi

# Test 3: Verify task is archived
echo
echo "🔍 Test 3: Verifying task is archived"
TASK_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID")

TASK_STATUS=$(echo "$TASK_RESPONSE" | jq -r '.data.status')
ARCHIVED_AT=$(echo "$TASK_RESPONSE" | jq -r '.data.archived_at')

if [ "$TASK_STATUS" = "archived" ] && [ "$ARCHIVED_AT" != "null" ]; then
    echo "✅ Task successfully archived (status: $TASK_STATUS, archived_at: $ARCHIVED_AT)"
else
    echo "❌ Task not properly archived (status: $TASK_STATUS, archived_at: $ARCHIVED_AT)"
fi

# Test 4: Unarchive the task
echo
echo "🔄 Test 4: Unarchiving task"
UNARCHIVE_DATA='{"status": "todo"}'
UNARCHIVE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$UNARCHIVE_DATA" \
    "$BASE_URL/tasks/$TASK_ID/unarchive")

if echo "$UNARCHIVE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Task unarchived successfully"
else
    echo "❌ Failed to unarchive task"
    echo "Response: $UNARCHIVE_RESPONSE"
fi

# Test 5: Verify task is unarchived
echo
echo "🔍 Test 5: Verifying task is unarchived"
TASK_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID")

TASK_STATUS=$(echo "$TASK_RESPONSE" | jq -r '.data.status')
ARCHIVED_AT=$(echo "$TASK_RESPONSE" | jq -r '.data.archived_at')

if [ "$TASK_STATUS" = "todo" ] && [ "$ARCHIVED_AT" = "null" ]; then
    echo "✅ Task successfully unarchived (status: $TASK_STATUS, archived_at: $ARCHIVED_AT)"
else
    echo "❌ Task not properly unarchived (status: $TASK_STATUS, archived_at: $ARCHIVED_AT)"
fi

# Test 6: Test archived tasks list
echo
echo "📋 Test 6: Testing archived tasks list endpoint"
ARCHIVED_LIST_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$BASE_URL/projects/$PROJECT_ID/tasks/archived?pageSize=10")

if echo "$ARCHIVED_LIST_RESPONSE" | jq -e '.success' > /dev/null; then
    TOTAL_COUNT=$(echo "$ARCHIVED_LIST_RESPONSE" | jq -r '.data.total')
    echo "✅ Archived tasks list endpoint works (found $TOTAL_COUNT archived tasks)"
else
    echo "❌ Archived tasks list endpoint failed"
    echo "Response: $ARCHIVED_LIST_RESPONSE"
fi

# Test 7: Test archive statistics
echo
echo "📊 Test 7: Testing archive statistics endpoint"
STATS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$BASE_URL/projects/$PROJECT_ID/archive/stats")

if echo "$STATS_RESPONSE" | jq -e '.success' > /dev/null; then
    ACTIVE_TASKS=$(echo "$STATS_RESPONSE" | jq -r '.data.active_tasks')
    ARCHIVED_TASKS=$(echo "$STATS_RESPONSE" | jq -r '.data.archived_tasks')
    echo "✅ Archive statistics endpoint works (active: $ACTIVE_TASKS, archived: $ARCHIVED_TASKS)"
else
    echo "❌ Archive statistics endpoint failed"
    echo "Response: $STATS_RESPONSE"
fi

# Cleanup
echo
echo "🧹 Cleaning up test task"
DELETE_RESPONSE=$(curl -s -X DELETE \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID")

echo "✅ Cleanup completed"

echo
echo "🎉 Archive functionality validation test completed!"
echo "========================================"