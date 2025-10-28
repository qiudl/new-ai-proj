#!/bin/bash
#
# RBAC v2 Integration Tests Runner
# ===================================
#
# This script runs the RBAC v2 integration tests against a running backend instance.
#
# Prerequisites:
# - Backend server running on localhost:8080 (or set BACKEND_URL)
# - Test database with test data
# - Valid JWT tokens for test users
#
# Usage:
#   ./run_integration_tests.sh
#   BACKEND_URL=https://test.example.com ./run_integration_tests.sh

set -e

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
SYSTEM_ADMIN_TOKEN="${SYSTEM_ADMIN_TOKEN:-}"
ENTERPRISE_USER_TOKEN="${ENTERPRISE_USER_TOKEN:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "===================================="
echo "RBAC v2 Integration Tests"
echo "===================================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo ""

# Helper functions
test_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

test_skip() {
    echo -e "${YELLOW}⊘${NC} $1 (skipped)"
}

# Check if backend is running
echo "Checking backend health..."
if curl -sf "$BACKEND_URL/health" > /dev/null 2>&1; then
    test_pass "Backend is running"
else
    test_fail "Backend is not accessible at $BACKEND_URL"
fi

# Get admin token if not provided
if [ -z "$SYSTEM_ADMIN_TOKEN" ]; then
    echo ""
    echo "Getting system admin token..."
    LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/dev-quick-login" \
        -H "Content-Type: application/json" \
        -d '{}')

    SYSTEM_ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$SYSTEM_ADMIN_TOKEN" ]; then
        test_fail "Failed to get admin token"
    fi
    test_pass "Got system admin token"
fi

echo ""
echo "===================================="
echo "1. System Domain Routes Tests"
echo "===================================="

# Test: List enterprises
echo ""
echo "Test: GET /api/v1/system/enterprises"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
    "$BACKEND_URL/api/v1/system/enterprises")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$STATUS" = "200" ]; then
    if echo "$BODY" | grep -q '"success":true'; then
        test_pass "List enterprises"
    else
        test_fail "List enterprises - unexpected response body"
    fi
else
    test_fail "List enterprises - HTTP $STATUS"
fi

# Test: List system users
echo "Test: GET /api/v1/system/users"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
    "$BACKEND_URL/api/v1/system/users")
STATUS=$(echo "$RESPONSE" | tail -n1)

if [ "$STATUS" = "200" ]; then
    test_pass "List system users"
else
    test_fail "List system users - HTTP $STATUS"
fi

# Test: List system roles
echo "Test: GET /api/v1/system/roles"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
    "$BACKEND_URL/api/v1/system/roles")
STATUS=$(echo "$RESPONSE" | tail -n1)

if [ "$STATUS" = "200" ]; then
    test_pass "List system roles"
else
    test_fail "List system roles - HTTP $STATUS"
fi

# Test: List system permissions
echo "Test: GET /api/v1/system/permissions"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
    "$BACKEND_URL/api/v1/system/permissions")
STATUS=$(echo "$RESPONSE" | tail -n1)

if [ "$STATUS" = "200" ]; then
    test_pass "List system permissions"
else
    test_fail "List system permissions - HTTP $STATUS"
fi

echo ""
echo "===================================="
echo "2. Enterprise Domain Routes Tests"
echo "===================================="

# Get first enterprise ID for testing
echo ""
echo "Getting test enterprise ID..."
ENTERPRISE_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
    "$BACKEND_URL/api/v1/system/enterprises")

# Extract first enterprise ID (basic parsing)
ENTERPRISE_ID=$(echo "$ENTERPRISE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$ENTERPRISE_ID" ]; then
    test_skip "No enterprise found for testing enterprise routes"
else
    test_pass "Using enterprise ID: $ENTERPRISE_ID"

    # Test: List enterprise users
    echo "Test: GET /api/v1/enterprises/$ENTERPRISE_ID/users"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/$ENTERPRISE_ID/users")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "200" ] || [ "$STATUS" = "403" ]; then
        test_pass "List enterprise users (HTTP $STATUS)"
    else
        test_fail "List enterprise users - HTTP $STATUS"
    fi

    # Test: List enterprise roles
    echo "Test: GET /api/v1/enterprises/$ENTERPRISE_ID/roles"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/$ENTERPRISE_ID/roles")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "200" ] || [ "$STATUS" = "403" ]; then
        test_pass "List enterprise roles (HTTP $STATUS)"
    else
        test_fail "List enterprise roles - HTTP $STATUS"
    fi

    # Test: List enterprise permissions
    echo "Test: GET /api/v1/enterprises/$ENTERPRISE_ID/permissions"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/$ENTERPRISE_ID/permissions")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "200" ] || [ "$STATUS" = "403" ]; then
        test_pass "List enterprise permissions (HTTP $STATUS)"
    else
        test_fail "List enterprise permissions - HTTP $STATUS"
    fi

    # Test: List enterprise projects
    echo "Test: GET /api/v1/enterprises/$ENTERPRISE_ID/projects"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/$ENTERPRISE_ID/projects")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "200" ] || [ "$STATUS" = "403" ]; then
        test_pass "List enterprise projects (HTTP $STATUS)"
    else
        test_fail "List enterprise projects - HTTP $STATUS"
    fi

    # Test: List enterprise documents
    echo "Test: GET /api/v1/enterprises/$ENTERPRISE_ID/documents"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/$ENTERPRISE_ID/documents")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "200" ] || [ "$STATUS" = "403" ]; then
        test_pass "List enterprise documents (HTTP $STATUS)"
    else
        test_fail "List enterprise documents - HTTP $STATUS"
    fi
fi

echo ""
echo "===================================="
echo "3. Permission Enforcement Tests"
echo "===================================="

# Test: Unauthenticated access
echo ""
echo "Test: Unauthenticated access to system routes"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    "$BACKEND_URL/api/v1/system/enterprises")
STATUS=$(echo "$RESPONSE" | tail -n1)

if [ "$STATUS" = "401" ]; then
    test_pass "Unauthenticated access rejected (HTTP 401)"
else
    test_fail "Unauthenticated access - expected 401, got $STATUS"
fi

# Test: Invalid token
echo "Test: Invalid token"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer invalid_token_12345" \
    "$BACKEND_URL/api/v1/system/enterprises")
STATUS=$(echo "$RESPONSE" | tail -n1)

if [ "$STATUS" = "401" ]; then
    test_pass "Invalid token rejected (HTTP 401)"
else
    test_fail "Invalid token - expected 401, got $STATUS"
fi

echo ""
echo "===================================="
echo "4. Route Adapter Tests"
echo "===================================="

if [ -n "$ENTERPRISE_ID" ]; then
    # Test: Invalid enterprise ID
    echo ""
    echo "Test: Invalid enterprise ID parameter"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/invalid/projects")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "400" ] || [ "$STATUS" = "404" ]; then
        test_pass "Invalid enterprise ID rejected (HTTP $STATUS)"
    else
        test_fail "Invalid enterprise ID - expected 400/404, got $STATUS"
    fi

    # Test: Zero enterprise ID
    echo "Test: Zero enterprise ID parameter"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/0/projects")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "400" ] || [ "$STATUS" = "404" ]; then
        test_pass "Zero enterprise ID rejected (HTTP $STATUS)"
    else
        test_fail "Zero enterprise ID - expected 400/404, got $STATUS"
    fi

    # Test: Negative enterprise ID
    echo "Test: Negative enterprise ID parameter"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
        "$BACKEND_URL/api/v1/enterprises/-1/projects")
    STATUS=$(echo "$RESPONSE" | tail -n1)

    if [ "$STATUS" = "400" ] || [ "$STATUS" = "404" ]; then
        test_pass "Negative enterprise ID rejected (HTTP $STATUS)"
    else
        test_fail "Negative enterprise ID - expected 400/404, got $STATUS"
    fi
fi

echo ""
echo "===================================="
echo "✅ Integration Tests Complete"
echo "===================================="
echo ""
echo "All tests passed successfully!"
echo ""
