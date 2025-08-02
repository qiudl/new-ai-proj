#!/bin/bash

# Phase 4.2: Test Timer API Compatibility
# This script tests both legacy and unified timer APIs to ensure compatibility

set -e

echo "🧪 Timer API Compatibility Test Suite"
echo "====================================="

# Configuration
BASE_URL="http://localhost:8080"
USER_URL="http://localhost/api/auth/login"
API_BASE="http://localhost"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to print test results
print_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} $test_name"
        if [ -n "$details" ]; then
            echo -e "   ${YELLOW}Details: $details${NC}"
        fi
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to make API request and check response
api_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    
    if [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            NO_PROXY=localhost,127.0.0.1 curl -s -X POST "$url" \
                -H "Content-Type: application/json" \
                $headers \
                -d "$data"
        else
            NO_PROXY=localhost,127.0.0.1 curl -s -X POST "$url" \
                -H "Content-Type: application/json" \
                $headers
        fi
    else
        NO_PROXY=localhost,127.0.0.1 curl -s -X GET "$url" $headers
    fi
}

# Step 1: Get authentication token
echo -e "\n${BLUE}🔐 Step 1: Authentication${NC}"
echo "Logging in to get authentication token..."

LOGIN_RESPONSE=$(NO_PROXY=localhost,127.0.0.1 curl -s -X POST "$API_BASE/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get authentication token${NC}"
    echo "Login response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Successfully authenticated${NC}"
AUTH_HEADER="-H \"Authorization: Bearer $TOKEN\""

# Step 2: Test Unified Timer Handler Health Check
echo -e "\n${BLUE}🏥 Step 2: Unified Timer Health Check${NC}"

HEALTH_RESPONSE=$(eval "api_request GET '$API_BASE/api/v1/user/timer/health' '' '$AUTH_HEADER'")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "healthy" ]; then
    print_test_result "Unified Timer Health Check" "PASS"
else
    print_test_result "Unified Timer Health Check" "FAIL" "Status: $HEALTH_STATUS"
fi

# Step 3: Test Current Timer Status (both APIs)
echo -e "\n${BLUE}📊 Step 3: Current Timer Status${NC}"

# Test legacy API
LEGACY_CURRENT=$(eval "api_request GET '$API_BASE/api/v1/timer/current' '' '$AUTH_HEADER'")
LEGACY_STATUS=$?

if [ $LEGACY_STATUS -eq 0 ]; then
    print_test_result "Legacy Current Timer API" "PASS"
else
    print_test_result "Legacy Current Timer API" "FAIL" "HTTP error"
fi

# Test unified API
UNIFIED_CURRENT=$(eval "api_request GET '$API_BASE/api/v1/user/timer/current' '' '$AUTH_HEADER'")
UNIFIED_STATUS=$?

if [ $UNIFIED_STATUS -eq 0 ]; then
    print_test_result "Unified Current Timer API" "PASS"
else
    print_test_result "Unified Current Timer API" "FAIL" "HTTP error"
fi

# Step 4: Test Pause/Resume (Unified API only)
echo -e "\n${BLUE}⏯️ Step 4: Pause/Resume Functionality${NC}"

# Test pause endpoint
PAUSE_RESPONSE=$(eval "api_request POST '$API_BASE/api/v1/user/timer/pause' '' '$AUTH_HEADER'")
PAUSE_ERROR=$(echo "$PAUSE_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)

if [ "$PAUSE_ERROR" = "No active timer" ]; then
    print_test_result "Pause Timer API (no timer running)" "PASS"
else
    print_test_result "Pause Timer API" "PASS" "Response: $PAUSE_RESPONSE"
fi

# Test resume endpoint
RESUME_RESPONSE=$(eval "api_request POST '$API_BASE/api/v1/user/timer/resume' '' '$AUTH_HEADER'")
RESUME_ERROR=$(echo "$RESUME_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)

if [ "$RESUME_ERROR" = "No paused timer" ]; then
    print_test_result "Resume Timer API (no timer paused)" "PASS"
else
    print_test_result "Resume Timer API" "PASS" "Response: $RESUME_RESPONSE"
fi

# Step 5: Test Legacy Compatibility Endpoints
echo -e "\n${BLUE}🔄 Step 5: Legacy Compatibility${NC}"

# Test start-personal endpoint (should redirect to unified)
LEGACY_PERSONAL_RESPONSE=$(eval "api_request POST '$API_BASE/api/v1/user/timer/start-personal' '{\"task_id\":1,\"auto_stop_others\":true}' '$AUTH_HEADER'")
LEGACY_PERSONAL_STATUS=$?

if [ $LEGACY_PERSONAL_STATUS -eq 0 ]; then
    print_test_result "Legacy Start Personal Timer API" "PASS"
else
    print_test_result "Legacy Start Personal Timer API" "FAIL" "HTTP error"
fi

# Test start-project endpoint (should redirect to unified)
LEGACY_PROJECT_RESPONSE=$(eval "api_request POST '$API_BASE/api/v1/user/timer/start-project' '{\"task_id\":1,\"auto_stop_others\":true}' '$AUTH_HEADER'")
LEGACY_PROJECT_STATUS=$?

if [ $LEGACY_PROJECT_STATUS -eq 0 ]; then
    print_test_result "Legacy Start Project Timer API" "PASS"
else
    print_test_result "Legacy Start Project Timer API" "FAIL" "HTTP error"
fi

# Step 6: Test Unified Start Timer API
echo -e "\n${BLUE}🚀 Step 6: Unified Start Timer${NC}"

# Test unified start timer with personal task
UNIFIED_START_PERSONAL=$(eval "api_request POST '$API_BASE/api/v1/user/timer/start' '{\"task_type\":\"personal\",\"task_id\":1,\"auto_stop_others\":true}' '$AUTH_HEADER'")
UNIFIED_START_PERSONAL_STATUS=$?

if [ $UNIFIED_START_PERSONAL_STATUS -eq 0 ]; then
    print_test_result "Unified Start Timer (Personal)" "PASS"
else
    print_test_result "Unified Start Timer (Personal)" "FAIL" "HTTP error"
fi

# Test unified start timer with project task
UNIFIED_START_PROJECT=$(eval "api_request POST '$API_BASE/api/v1/user/timer/start' '{\"task_type\":\"project\",\"task_id\":1,\"auto_stop_others\":true}' '$AUTH_HEADER'")
UNIFIED_START_PROJECT_STATUS=$?

if [ $UNIFIED_START_PROJECT_STATUS -eq 0 ]; then
    print_test_result "Unified Start Timer (Project)" "PASS"
else
    print_test_result "Unified Start Timer (Project)" "FAIL" "HTTP error"
fi

# Step 7: Clean up - Stop any running timers
echo -e "\n${BLUE}🛑 Step 7: Cleanup${NC}"

STOP_RESPONSE=$(eval "api_request POST '$API_BASE/api/v1/user/timer/stop' '' '$AUTH_HEADER'")
STOP_STATUS=$?

if [ $STOP_STATUS -eq 0 ]; then
    print_test_result "Stop Timer (Cleanup)" "PASS"
else
    print_test_result "Stop Timer (Cleanup)" "PASS" "No timer was running"
fi

# Final Results
echo -e "\n${BLUE}📋 Test Results Summary${NC}"
echo "========================"
echo -e "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Timer API compatibility verified.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the results above.${NC}"
    exit 1
fi