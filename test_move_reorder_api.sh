#!/bin/bash

# Test script for Task Movement and Reordering API

BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=1
TASK_ID=368  # Using the current task as test subject

echo "Testing Task Move and Reorder API..."

# Check if authorization token is provided
if [ -z "$JWT_TOKEN" ]; then
    echo "Warning: JWT_TOKEN environment variable not set. Using placeholder."
    JWT_TOKEN="YOUR_JWT_TOKEN"
fi

echo "=== Setup: Creating test tasks for demonstration ==="
echo "Using Project ID: $PROJECT_ID"
echo "Base Task ID: $TASK_ID"

echo -e "\n=== Test 1: Reorder task within same parent ==="
echo "Reordering task $TASK_ID to position 1"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "new_position": 1,
        "direction": "up"
     }' | jq .

echo -e "\n=== Test 2: Move task to first position ==="
echo "Moving task $TASK_ID to first position"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "new_position": 0,
        "direction": "first"
     }' | jq .

echo -e "\n=== Test 3: Move task to last position ==="
echo "Moving task $TASK_ID to last position"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "direction": "last"
     }' | jq .

echo -e "\n=== Test 4: Move task down one position ==="
echo "Moving task $TASK_ID down one position"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "direction": "down"
     }' | jq .

echo -e "\n=== Test 5: Move task to different parent (if applicable) ==="
echo "Attempting to move task $TASK_ID to a different parent (task 387)"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/move" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "target_parent_id": 387,
        "new_position": 2
     }' | jq .

echo -e "\n=== Test 6: Move task back to root level ==="
echo "Moving task $TASK_ID back to root level"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/move" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "target_parent_id": null,
        "new_position": 0
     }' | jq .

echo -e "\n=== Test 7: Bulk reorder multiple tasks ==="
echo "Bulk reordering multiple tasks (if other tasks exist)"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/bulk-reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "task_orders": [
            {"task_id": 368, "new_position": 0},
            {"task_id": 387, "new_position": 1}
        ],
        "parent_id": null
     }' | jq .

echo -e "\n=== Test 8: Error handling - Invalid task ID ==="
echo "Testing error handling with invalid task ID"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/99999/reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "new_position": 0
     }' | jq .

echo -e "\n=== Test 9: Error handling - Invalid project ID ==="
echo "Testing error handling with invalid project ID"
curl -X POST "${BASE_URL}/projects/99999/tasks/${TASK_ID}/reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
        "new_position": 0
     }' | jq .

echo -e "\n=== Test 10: Error handling - Missing required fields ==="
echo "Testing error handling with missing required fields"
curl -X POST "${BASE_URL}/projects/${PROJECT_ID}/tasks/${TASK_ID}/reorder" \
     -H "Authorization: Bearer ${JWT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{}' | jq .

echo -e "\nTask Move and Reorder API tests completed!"

echo -e "\nUsage Examples:"
echo "1. Set JWT_TOKEN environment variable: export JWT_TOKEN=\"your_actual_jwt_token\""
echo "2. Run specific tests by modifying the TASK_ID and PROJECT_ID variables"
echo "3. Check task positions with: curl -H \"Authorization: Bearer \$JWT_TOKEN\" ${BASE_URL}/projects/${PROJECT_ID}/tasks"
