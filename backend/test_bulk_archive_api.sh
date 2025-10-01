#!/bin/bash

# Test script for bulk archive/unarchive APIs
set -e

BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=1
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwiZXhwIjoxNzU3NzEyMDE4LCJpYXQiOjE3NTc2MjU2MTgsImp0aSI6ImQxZDY1MTE0LTVkM2UtNDkxZC05NzlkLTM2NzQwZmY5NGNiMCJ9.fKMZb_Vt5hD7kGX4Yy8I5_r9zJLnPw7XjPmEn7zZd7Y"

echo "🧪 Testing Bulk Archive/Unarchive API Interfaces"
echo "================================================="

# Create test tasks
echo "1️⃣ Creating test tasks..."
TASK_IDS=()
for i in {1..5}; do
    TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/tasks" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"title\": \"批量归档测试任务 $i\",
        \"description\": \"用于测试批量归档功能的任务 $i\",
        \"status\": \"todo\",
        \"priority\": \"medium\"
      }")
    
    TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data.id')
    TASK_IDS+=($TASK_ID)
    echo "Created task $i with ID: $TASK_ID"
done

echo "Created ${#TASK_IDS[@]} test tasks: ${TASK_IDS[*]}"

# Test 1: Bulk Archive with valid task IDs
echo ""
echo "2️⃣ Testing Bulk Archive API with valid task IDs (should succeed with 200/207)..."
BULK_ARCHIVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": [${TASK_IDS[0]}, ${TASK_IDS[1]}, ${TASK_IDS[2]}]
  }")

HTTP_CODE=$(echo "$BULK_ARCHIVE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_ARCHIVE_RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" =~ ^(200|207)$ ]]; then
    echo "✅ Bulk Archive API PASSED - returned $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    # Parse response to check results
    SUCCESS_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.success_count // 0')
    FAILED_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.failed_count // 0')
    echo "📊 Archive Results: $SUCCESS_COUNT succeeded, $FAILED_COUNT failed"
else
    echo "❌ Bulk Archive API FAILED - expected 200/207, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 2: Bulk Archive with duplicate/already archived tasks (should handle gracefully)
echo ""
echo "3️⃣ Testing Bulk Archive with already archived tasks (should skip duplicates)..."
BULK_ARCHIVE_AGAIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": [${TASK_IDS[0]}, ${TASK_IDS[1]}, ${TASK_IDS[3]}]
  }")

HTTP_CODE=$(echo "$BULK_ARCHIVE_AGAIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_ARCHIVE_AGAIN_RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" =~ ^(200|207)$ ]]; then
    echo "✅ Bulk Archive duplicate handling PASSED - returned $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    # Parse response to check results
    SUCCESS_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.success_count // 0')
    SKIPPED_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.skipped_count // 0')
    echo "📊 Archive Results: $SUCCESS_COUNT succeeded, $SKIPPED_COUNT skipped"
else
    echo "❌ Bulk Archive duplicate handling FAILED - expected 200/207, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 3: Bulk Unarchive with specific target status
echo ""
echo "4️⃣ Testing Bulk Unarchive API with target status 'in_progress'..."
BULK_UNARCHIVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/unarchive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": [${TASK_IDS[0]}, ${TASK_IDS[1]}],
    \"status\": \"in_progress\"
  }")

HTTP_CODE=$(echo "$BULK_UNARCHIVE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_UNARCHIVE_RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" =~ ^(200|207)$ ]]; then
    echo "✅ Bulk Unarchive API PASSED - returned $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    # Parse response to check results
    SUCCESS_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.success_count // 0')
    echo "📊 Unarchive Results: $SUCCESS_COUNT succeeded"
else
    echo "❌ Bulk Unarchive API FAILED - expected 200/207, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 4: Bulk Unarchive non-archived tasks (should handle gracefully)
echo ""
echo "5️⃣ Testing Bulk Unarchive with non-archived tasks (should skip appropriately)..."
BULK_UNARCHIVE_NON_ARCHIVED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/unarchive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": [${TASK_IDS[0]}, ${TASK_IDS[4]}],
    \"status\": \"todo\"
  }")

HTTP_CODE=$(echo "$BULK_UNARCHIVE_NON_ARCHIVED_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_UNARCHIVE_NON_ARCHIVED_RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" =~ ^(200|207)$ ]]; then
    echo "✅ Bulk Unarchive non-archived handling PASSED - returned $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    # Parse response to check results
    SUCCESS_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.success_count // 0')
    SKIPPED_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.skipped_count // 0')
    echo "📊 Unarchive Results: $SUCCESS_COUNT succeeded, $SKIPPED_COUNT skipped"
else
    echo "❌ Bulk Unarchive non-archived handling FAILED - expected 200/207, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 5: Bulk operations with invalid task IDs
echo ""
echo "6️⃣ Testing Bulk Archive with invalid task IDs (should handle gracefully)..."
BULK_ARCHIVE_INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": [${TASK_IDS[2]}, 999999, 999998]
  }")

HTTP_CODE=$(echo "$BULK_ARCHIVE_INVALID_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_ARCHIVE_INVALID_RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" =~ ^(200|207)$ ]]; then
    echo "✅ Bulk Archive with invalid IDs handling PASSED - returned $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    # Parse response to check results
    SUCCESS_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.success_count // 0')
    FAILED_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.failed_count // 0')
    echo "📊 Archive Results: $SUCCESS_COUNT succeeded, $FAILED_COUNT failed"
else
    echo "❌ Bulk Archive with invalid IDs handling FAILED - expected 200/207, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 6: Bulk operations with empty task list (should return 400)
echo ""
echo "7️⃣ Testing Bulk Archive with empty task list (should fail with 400)..."
BULK_ARCHIVE_EMPTY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": []
  }")

HTTP_CODE=$(echo "$BULK_ARCHIVE_EMPTY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_ARCHIVE_EMPTY_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "400" ]; then
    echo "✅ Bulk Archive empty list validation PASSED - returned 400 Bad Request"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Bulk Archive empty list validation FAILED - expected 400, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 7: Bulk operations with too many task IDs (should return 400)
echo ""
echo "8️⃣ Testing Bulk Archive with too many task IDs (should fail with 400)..."
BIG_TASK_LIST=""
for i in {1..101}; do
    if [ $i -gt 1 ]; then
        BIG_TASK_LIST="$BIG_TASK_LIST,"
    fi
    BIG_TASK_LIST="$BIG_TASK_LIST$((1000 + i))"
done

BULK_ARCHIVE_TOO_MANY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": [$BIG_TASK_LIST]
  }")

HTTP_CODE=$(echo "$BULK_ARCHIVE_TOO_MANY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_ARCHIVE_TOO_MANY_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "400" ]; then
    echo "✅ Bulk Archive size limit validation PASSED - returned 400 Bad Request"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Bulk Archive size limit validation FAILED - expected 400, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 8: Bulk Unarchive with invalid target status
echo ""
echo "9️⃣ Testing Bulk Unarchive with invalid target status (should fail with 400)..."
BULK_UNARCHIVE_INVALID_STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/tasks/bulk/unarchive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_ids\": [${TASK_IDS[2]}],
    \"status\": \"invalid_status\"
  }")

HTTP_CODE=$(echo "$BULK_UNARCHIVE_INVALID_STATUS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BULK_UNARCHIVE_INVALID_STATUS_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "400" ]; then
    echo "✅ Bulk Unarchive invalid status validation PASSED - returned 400 Bad Request"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Bulk Unarchive invalid status validation FAILED - expected 400, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Cleanup: Delete the test tasks
echo ""
echo "🧹 Cleaning up test tasks..."
for TASK_ID in "${TASK_IDS[@]}"; do
    curl -s -X DELETE "$BASE_URL/tasks/$TASK_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    echo "Deleted task ID: $TASK_ID"
done

echo ""
echo "🎯 Bulk Archive/Unarchive API Test Complete!"
echo "============================================="
echo "📝 Test Summary:"
echo "  - Bulk archive with valid task IDs"
echo "  - Duplicate archive handling" 
echo "  - Bulk unarchive with target status"
echo "  - Non-archived task handling"
echo "  - Invalid task ID handling"
echo "  - Empty task list validation"
echo "  - Task count limit validation"
echo "  - Invalid status validation"