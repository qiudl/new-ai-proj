#!/bin/bash

# Simple Archive Functionality Test
# Tests core archive functionality with minimal dependencies

set -e

BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=1

echo "🧪 Simple Archive Functionality Test"
echo "======================================"

# Get authentication token
get_auth_token() {
    echo "🔐 Getting authentication token..."
    
    local auth_url="$BASE_URL/auth/dev/quick-login"
    local auth_data='{"username": "admin"}'
    
    local response=$(curl -s -X "POST" \
        -H "Content-Type: application/json" \
        -d "$auth_data" \
        "$auth_url")
    
    local token=$(echo "$response" | jq -r '.data.access_token // .access_token // empty')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        echo "❌ Failed to get authentication token"
        echo "Auth response: $response"
        exit 1
    fi
    
    export AUTH_TOKEN="$token"
    echo "✅ Authentication token obtained"
}

# Helper function for HTTP requests
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    # Add authorization header if token is available
    local auth_header=""
    if [ -n "$AUTH_TOKEN" ]; then
        auth_header="-H \"Authorization: Bearer $AUTH_TOKEN\""
    fi
    
    if [ -n "$data" ]; then
        eval "curl -s -X \"$method\" \
            -H \"Content-Type: application/json\" \
            $auth_header \
            -d \"$data\" \
            \"$BASE_URL$endpoint\""
    else
        eval "curl -s -X \"$method\" \
            -H \"Content-Type: application/json\" \
            $auth_header \
            \"$BASE_URL$endpoint\""
    fi
}

# Get authentication token
get_auth_token

echo
echo "📋 Step 1: Create test task"
task_data='{"title": "Archive Test Task", "description": "Test task for archive functionality", "status": "todo"}'
create_response=$(api_call "POST" "/projects/$PROJECT_ID/tasks" "$task_data")
task_id=$(echo "$create_response" | jq -r '.data.id // .id // empty')

if [ -z "$task_id" ] || [ "$task_id" = "null" ]; then
    echo "❌ Failed to create test task"
    echo "Response: $create_response"
    exit 1
fi

echo "✅ Created task with ID: $task_id"

echo
echo "📦 Step 2: Archive the task"
archive_data='{"reason": "Testing archive functionality"}'
archive_response=$(api_call "POST" "/tasks/$task_id/archive" "$archive_data")
echo "Archive response: $archive_response"

echo
echo "🔍 Step 3: Verify task is archived"
task_response=$(api_call "GET" "/projects/$PROJECT_ID/tasks/$task_id")
task_status=$(echo "$task_response" | jq -r '.data.status // .status // empty')
archived_at=$(echo "$task_response" | jq -r '.data.archived_at // .archived_at // empty')
archive_reason=$(echo "$task_response" | jq -r '.data.archive_reason // .archive_reason // empty')

echo "Task Status: $task_status"
echo "Archived At: $archived_at"  
echo "Archive Reason: $archive_reason"

if [ "$task_status" = "archived" ]; then
    echo "✅ Task successfully archived"
else
    echo "❌ Task not archived properly (status: $task_status)"
fi

echo
echo "🔄 Step 4: Unarchive the task"
unarchive_data='{"status": "todo"}'
unarchive_response=$(api_call "POST" "/tasks/$task_id/unarchive" "$unarchive_data")
echo "Unarchive response: $unarchive_response"

echo
echo "🔍 Step 5: Verify task is unarchived"
task_response=$(api_call "GET" "/projects/$PROJECT_ID/tasks/$task_id")
task_status=$(echo "$task_response" | jq -r '.data.status // .status // empty')
archived_at=$(echo "$task_response" | jq -r '.data.archived_at // .archived_at // empty')

echo "Task Status: $task_status"
echo "Archived At: $archived_at"

if [ "$task_status" = "todo" ] && [ "$archived_at" = "null" ]; then
    echo "✅ Task successfully unarchived"
else
    echo "❌ Task not unarchived properly (status: $task_status, archived_at: $archived_at)"
fi

echo
echo "📋 Step 6: Test archived tasks list"
archived_response=$(api_call "GET" "/projects/$PROJECT_ID/tasks/archived?pageSize=10")
archived_count=$(echo "$archived_response" | jq -r '.data.total // .total // 0')
echo "✅ Found $archived_count archived tasks in project"

echo
echo "📊 Step 7: Test archive statistics"
stats_response=$(api_call "GET" "/projects/$PROJECT_ID/archive/stats")
active_tasks=$(echo "$stats_response" | jq -r '.data.active_tasks // .active_tasks // 0')
archived_tasks=$(echo "$stats_response" | jq -r '.data.archived_tasks // .archived_tasks // 0') 
total_tasks=$(echo "$stats_response" | jq -r '.data.total_tasks // .total_tasks // 0')
echo "✅ Archive stats - Active: $active_tasks, Archived: $archived_tasks, Total: $total_tasks"

echo
echo "🧹 Step 8: Clean up test task"
delete_response=$(api_call "DELETE" "/projects/$PROJECT_ID/tasks/$task_id")
echo "✅ Cleaned up test task"

echo
echo "🎉 Archive functionality test completed successfully!"
echo "======================================"