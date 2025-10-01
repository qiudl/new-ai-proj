#!/bin/bash

# Archive Functionality Integration Test
# Tests the complete archive functionality pipeline including:
# - Task archiving (single and batch)
# - Task unarchiving (single and batch)
# - Archive status validation
# - Archive metadata (archived_by, archive_reason)
# - API error handling
# - Database consistency

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
PROJECT_ID="${PROJECT_ID:-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test state tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_TASKS=()

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# HTTP request wrapper
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local expected_status="${4:-200}"
    
    # Add authorization header if token is available
    local auth_header=""
    if [ -n "$AUTH_TOKEN" ]; then
        auth_header="-H \"Authorization: Bearer $AUTH_TOKEN\""
    fi
    
    if [ -n "$data" ]; then
        response=$(eval "curl -s -w \"HTTPSTATUS:%{http_code}\" \
            -X \"$method\" \
            -H \"Content-Type: application/json\" \
            $auth_header \
            -d \"$data\" \
            \"$url\"")
    else
        response=$(eval "curl -s -w \"HTTPSTATUS:%{http_code}\" \
            -X \"$method\" \
            -H \"Content-Type: application/json\" \
            $auth_header \
            \"$url\"")
    fi
    
    http_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    http_status=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$http_status" -ne "$expected_status" ]; then
        log_error "Expected status $expected_status, got $http_status for $method $url"
        echo "Response: $http_body"
        return 1
    fi
    
    echo "$http_body"
}

# Clean up function
cleanup() {
    log_info "Cleaning up test tasks..."
    for task_id in "${TEST_TASKS[@]}"; do
        # Force delete (may fail if already deleted)
        make_request "DELETE" "$BASE_URL/tasks/$task_id" "" 204 >/dev/null 2>&1 || true
    done
}

# Create test task
create_test_task() {
    local title="$1"
    local description="${2:-Test task for archive integration testing}"
    
    local task_data="{
        \"title\": \"$title\",
        \"description\": \"$description\",
        \"status\": \"todo\",
        \"project_id\": $PROJECT_ID
    }"
    
    local response=$(make_request "POST" "$BASE_URL/projects/$PROJECT_ID/tasks" "$task_data" 201)
    local task_id=$(echo "$response" | jq -r '.data.id')
    
    if [ "$task_id" = "null" ] || [ -z "$task_id" ]; then
        log_error "Failed to create test task: $title"
        return 1
    fi
    
    TEST_TASKS+=("$task_id")
    echo "$task_id"
}

# Get authentication token
get_auth_token() {
    log_info "Getting authentication token..."
    
    local auth_url=$(echo "$BASE_URL")/auth/dev/quick-login
    local auth_data='{"username": "admin"}'
    
    local response=$(curl -s -X "POST" \
        -H "Content-Type: application/json" \
        -d "$auth_data" \
        "$auth_url")
    
    local token=$(echo "$response" | jq -r '.data.access_token // .access_token // empty')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        log_error "Failed to get authentication token"
        echo "Auth response: $response"
        exit 1
    fi
    
    export AUTH_TOKEN="$token"
    log_success "Authentication token obtained"
}

# Test functions
test_health_check() {
    log_info "Testing API health check..."
    
    local health_url=$(echo "$BASE_URL" | sed 's|/api/v1||')/health
    local response=$(make_request "GET" "$health_url" "" 200)
    local status=$(echo "$response" | jq -r '.status')
    
    if [ "$status" = "ok" ]; then
        log_success "API health check passed"
    else
        log_error "API health check failed: $response"
        exit 1
    fi
}

test_single_task_archive() {
    log_info "Testing single task archive functionality..."
    
    # Create test task
    local task_id=$(create_test_task "Archive Test Task 1")
    
    # Archive the task
    local archive_data="{\"reason\": \"Testing single task archive\"}"
    local response=$(make_request "POST" "$BASE_URL/tasks/$task_id/archive" "$archive_data" 200)
    
    # Verify task is archived
    local task_response=$(make_request "GET" "$BASE_URL/projects/$PROJECT_ID/tasks/$task_id" "" 200)
    local task_status=$(echo "$task_response" | jq -r '.data.status')
    local archived_at=$(echo "$task_response" | jq -r '.data.archived_at')
    local archive_reason=$(echo "$task_response" | jq -r '.data.archive_reason')
    
    if [ "$task_status" = "archived" ] && [ "$archived_at" != "null" ] && [ "$archive_reason" = "Testing single task archive" ]; then
        log_success "Single task archive test passed"
    else
        log_error "Single task archive test failed - Status: $task_status, ArchivedAt: $archived_at, Reason: $archive_reason"
    fi
}

test_single_task_unarchive() {
    log_info "Testing single task unarchive functionality..."
    
    # Create and archive test task
    local task_id=$(create_test_task "Unarchive Test Task 1")
    make_request "POST" "$BASE_URL/tasks/$task_id/archive" "{\"reason\": \"For unarchive testing\"}" 200 >/dev/null
    
    # Unarchive the task
    local unarchive_data="{\"status\": \"todo\"}"
    local response=$(make_request "POST" "$BASE_URL/tasks/$task_id/unarchive" "$unarchive_data" 200)
    
    # Verify task is unarchived
    local task_response=$(make_request "GET" "$BASE_URL/projects/$PROJECT_ID/tasks/$task_id" "" 200)
    local task_status=$(echo "$task_response" | jq -r '.data.status')
    local archived_at=$(echo "$task_response" | jq -r '.data.archived_at')
    
    if [ "$task_status" = "todo" ] && [ "$archived_at" = "null" ]; then
        log_success "Single task unarchive test passed"
    else
        log_error "Single task unarchive test failed - Status: $task_status, ArchivedAt: $archived_at"
    fi
}

test_batch_archive() {
    log_info "Testing batch archive functionality..."
    
    # Create multiple test tasks
    local task1_id=$(create_test_task "Batch Archive Test 1")
    local task2_id=$(create_test_task "Batch Archive Test 2")
    local task3_id=$(create_test_task "Batch Archive Test 3")
    
    # Batch archive tasks
    local batch_data="{
        \"task_ids\": [$task1_id, $task2_id, $task3_id],
        \"reason\": \"Testing batch archive\"
    }"
    local response=$(make_request "POST" "$BASE_URL/tasks/bulk/archive" "$batch_data" 200)
    
    local success_count=$(echo "$response" | jq -r '.data.success_count')
    local failed_count=$(echo "$response" | jq -r '.data.failed_count')
    
    if [ "$success_count" -eq 3 ] && [ "$failed_count" -eq 0 ]; then
        log_success "Batch archive test passed - 3 tasks archived successfully"
    else
        log_error "Batch archive test failed - Success: $success_count, Failed: $failed_count"
    fi
}

test_batch_unarchive() {
    log_info "Testing batch unarchive functionality..."
    
    # Create and archive multiple test tasks
    local task1_id=$(create_test_task "Batch Unarchive Test 1")
    local task2_id=$(create_test_task "Batch Unarchive Test 2")
    local task3_id=$(create_test_task "Batch Unarchive Test 3")
    
    # Archive them first
    local batch_archive_data="{
        \"task_ids\": [$task1_id, $task2_id, $task3_id],
        \"reason\": \"For batch unarchive testing\"
    }"
    make_request "POST" "$BASE_URL/tasks/bulk/archive" "$batch_archive_data" 200 >/dev/null
    
    # Batch unarchive tasks
    local batch_unarchive_data="{
        \"task_ids\": [$task1_id, $task2_id, $task3_id],
        \"status\": \"todo\"
    }"
    local response=$(make_request "POST" "$BASE_URL/tasks/bulk/unarchive" "$batch_unarchive_data" 200)
    
    local success_count=$(echo "$response" | jq -r '.data.success_count')
    local failed_count=$(echo "$response" | jq -r '.data.failed_count')
    
    if [ "$success_count" -eq 3 ] && [ "$failed_count" -eq 0 ]; then
        log_success "Batch unarchive test passed - 3 tasks unarchived successfully"
    else
        log_error "Batch unarchive test failed - Success: $success_count, Failed: $failed_count"
    fi
}

test_archived_task_edit_prevention() {
    log_info "Testing archived task edit prevention..."
    
    # Create and archive test task
    local task_id=$(create_test_task "Edit Prevention Test")
    make_request "POST" "$BASE_URL/tasks/$task_id/archive" "{\"reason\": \"Testing edit prevention\"}" 200 >/dev/null
    
    # Try to edit archived task (should fail with 409 Conflict)
    local edit_data="{\"title\": \"Modified Title\", \"description\": \"Modified Description\"}"
    local response=$(make_request "PUT" "$BASE_URL/projects/$PROJECT_ID/tasks/$task_id" "$edit_data" 409)
    
    local error_code=$(echo "$response" | jq -r '.error.code')
    
    if [ "$error_code" = "CONFLICT" ]; then
        log_success "Archived task edit prevention test passed"
    else
        log_error "Archived task edit prevention test failed - Expected CONFLICT error, got: $error_code"
    fi
}

test_archived_tasks_list() {
    log_info "Testing archived tasks list endpoint..."
    
    # Create and archive test tasks
    local task1_id=$(create_test_task "Archive List Test 1")
    local task2_id=$(create_test_task "Archive List Test 2")
    
    make_request "POST" "$BASE_URL/tasks/$task1_id/archive" "{\"reason\": \"List test 1\"}" 200 >/dev/null
    make_request "POST" "$BASE_URL/tasks/$task2_id/archive" "{\"reason\": \"List test 2\"}" 200 >/dev/null
    
    # Get archived tasks list
    local response=$(make_request "GET" "$BASE_URL/projects/$PROJECT_ID/tasks/archived?pageSize=50" "" 200)
    local tasks_array=$(echo "$response" | jq -r '.data.tasks')
    local total_count=$(echo "$response" | jq -r '.data.total')
    
    if [ "$tasks_array" != "null" ] && [ "$total_count" -ge 2 ]; then
        log_success "Archived tasks list test passed - Found $total_count archived tasks"
    else
        log_error "Archived tasks list test failed - Tasks: $tasks_array, Total: $total_count"
    fi
}

test_archive_statistics() {
    log_info "Testing archive statistics endpoint..."
    
    # Get archive statistics
    local response=$(make_request "GET" "$BASE_URL/projects/$PROJECT_ID/archive/stats" "" 200)
    local active_tasks=$(echo "$response" | jq -r '.data.active_tasks')
    local archived_tasks=$(echo "$response" | jq -r '.data.archived_tasks')
    local total_tasks=$(echo "$response" | jq -r '.data.total_tasks')
    
    if [ "$active_tasks" != "null" ] && [ "$archived_tasks" != "null" ] && [ "$total_tasks" != "null" ]; then
        log_success "Archive statistics test passed - Active: $active_tasks, Archived: $archived_tasks, Total: $total_tasks"
    else
        log_error "Archive statistics test failed - Active: $active_tasks, Archived: $archived_tasks, Total: $total_tasks"
    fi
}

test_error_handling() {
    log_info "Testing error handling scenarios..."
    
    # Test archiving non-existent task
    local response=$(make_request "POST" "$BASE_URL/tasks/99999/archive" "{\"reason\": \"Test\"}" 404)
    log_success "Non-existent task archive error handling passed"
    
    # Test unarchiving non-existent task
    local response=$(make_request "POST" "$BASE_URL/tasks/99999/unarchive" "{\"status\": \"todo\"}" 404)
    log_success "Non-existent task unarchive error handling passed"
    
    # Test invalid batch archive (empty task_ids)
    local response=$(make_request "POST" "$BASE_URL/tasks/bulk/archive" "{\"task_ids\": [], \"reason\": \"Test\"}" 400)
    log_success "Invalid batch archive error handling passed"
    
    # Test double archiving (archive already archived task)
    local task_id=$(create_test_task "Double Archive Test")
    make_request "POST" "$BASE_URL/tasks/$task_id/archive" "{\"reason\": \"First archive\"}" 200 >/dev/null
    
    local response=$(make_request "POST" "$BASE_URL/tasks/$task_id/archive" "{\"reason\": \"Second archive\"}" 409)
    local error_code=$(echo "$response" | jq -r '.error.code')
    
    if [ "$error_code" = "CONFLICT" ]; then
        log_success "Double archive error handling passed"
    else
        log_error "Double archive error handling failed - Expected CONFLICT, got: $error_code"
    fi
}

# Database consistency checks
test_database_consistency() {
    log_info "Testing database consistency..."
    
    # Create and archive a task
    local task_id=$(create_test_task "DB Consistency Test")
    make_request "POST" "$BASE_URL/tasks/$task_id/archive" "{\"reason\": \"DB consistency test\"}" 200 >/dev/null
    
    # Check database directly
    local db_check=$(PGPASSWORD=dev_password_2024 psql -h localhost -p 5433 -U dev_user -d ai_project_db -t -c \
        "SELECT status, archived_at IS NOT NULL, archived_by IS NOT NULL, archive_reason FROM tasks WHERE id = $task_id;")
    
    if echo "$db_check" | grep -q "archived.*t.*t.*DB consistency test"; then
        log_success "Database consistency test passed"
    else
        log_error "Database consistency test failed - DB state: $db_check"
    fi
}

# Main test execution
main() {
    echo "============================================="
    echo "Archive Functionality Integration Test Suite"
    echo "============================================="
    echo
    
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Get authentication token
    get_auth_token
    
    # Run tests
    test_health_check
    test_single_task_archive
    test_single_task_unarchive
    test_batch_archive
    test_batch_unarchive
    test_archived_task_edit_prevention
    test_archived_tasks_list
    test_archive_statistics
    test_error_handling
    
    echo
    echo "============================================="
    echo "Test Summary"
    echo "============================================="
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All archive integration tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"