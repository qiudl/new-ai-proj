#!/bin/bash

# Timer Debug & Health Check Script
# 计时器问题排查工具

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔍 Timer System Health Check & Debug Tool${NC}"
echo "=================================================="

# Function to run SQL query
run_sql() {
    local query="$1"
    docker-compose exec -T db psql -U user -d main_db -c "$query" 2>/dev/null
}

# Function to test API endpoint
test_api() {
    local method="$1"
    local endpoint="$2" 
    local data="$3"
    local auth_header="$4"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" -H "Content-Type: application/json" ${auth_header:+-H "$auth_header"} -d "$data" "http://localhost$endpoint"
    else
        curl -s -X "$method" ${auth_header:+-H "$auth_header"} "http://localhost$endpoint"
    fi
}

# Get authentication token
echo -e "\n${BLUE}1. Authentication Test${NC}"
echo "================================"
LOGIN_RESPONSE=$(test_api "POST" "/api/v1/auth/login" '{"username":"admin","password":"password123"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['token'] if data.get('success') else 'FAILED')" 2>/dev/null)

if [ "$TOKEN" = "FAILED" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "Token length: ${#TOKEN}"
fi

# Test basic connectivity
echo -e "\n${BLUE}2. Service Connectivity${NC}"
echo "================================"
HEALTH=$(test_api "GET" "/health")
echo "Backend Health: $(echo "$HEALTH" | jq -r '.data.status // "ERROR"')"

FRONTEND_STATUS=$(curl -s -w "%{http_code}" -o /dev/null http://localhost/)
echo "Frontend Status: $FRONTEND_STATUS"

# Database schema check
echo -e "\n${BLUE}3. Database Schema Check${NC}"
echo "================================"
echo "Checking task_time_logs table structure:"
SCHEMA_CHECK=$(run_sql "\d task_time_logs")
if echo "$SCHEMA_CHECK" | grep -q "created_by"; then
    echo -e "${GREEN}✅ created_by field exists${NC}"
else
    echo -e "${RED}❌ created_by field missing${NC}"
fi

echo -e "\nChecking users timer fields:"
USER_SCHEMA=$(run_sql "\d users" | grep timing)
echo "$USER_SCHEMA"

# Check current timer state
echo -e "\n${BLUE}4. Current Timer State${NC}"
echo "================================"
CURRENT_TIMER=$(test_api "GET" "/api/v1/user/timer/current" "" "Authorization: Bearer $TOKEN")
echo "Timer API Response:"
echo "$CURRENT_TIMER" | jq . 2>/dev/null || echo "$CURRENT_TIMER"

# Check user timing state in database
echo -e "\nDatabase timer state for admin:"
USER_STATE=$(run_sql "SELECT id, username, timing_status, timing_start_time, timing_accumulated_seconds, timing_paused_time FROM users WHERE username='admin';")
echo "$USER_STATE"

# Check for orphaned time logs
echo -e "\n${BLUE}5. Data Integrity Check${NC}"
echo "================================"
echo "Checking for incomplete time logs:"
INCOMPLETE_LOGS=$(run_sql "SELECT COUNT(*) as incomplete_count FROM task_time_logs WHERE end_time IS NULL;")
echo "$INCOMPLETE_LOGS"

echo -e "\nRecent time log entries:"
RECENT_LOGS=$(run_sql "SELECT id, user_id, task_id, start_time, end_time, duration_seconds FROM task_time_logs ORDER BY start_time DESC LIMIT 3;")
echo "$RECENT_LOGS"

# Test timer API endpoints
echo -e "\n${BLUE}6. Timer API Endpoints Test${NC}"
echo "================================"

# Test unified start endpoint
echo "Testing unified start endpoint..."
START_TEST=$(test_api "POST" "/api/v1/user/timer/start" '{"task_type":"personal","task_id":1,"auto_stop_others":true}' "Authorization: Bearer $TOKEN")
echo "Start API: $(echo "$START_TEST" | jq -r '.success // .error // "Unknown response"')"

# Test pause endpoint
echo "Testing pause endpoint..."
PAUSE_TEST=$(test_api "POST" "/api/v1/user/timer/pause" "" "Authorization: Bearer $TOKEN")
echo "Pause API: $(echo "$PAUSE_TEST" | jq -r '.success // .error // "Unknown response"')"

# Test resume endpoint  
echo "Testing resume endpoint..."
RESUME_TEST=$(test_api "POST" "/api/v1/user/timer/resume" "" "Authorization: Bearer $TOKEN")
echo "Resume API: $(echo "$RESUME_TEST" | jq -r '.success // .error // "Unknown response"')"

# Check backend logs for errors
echo -e "\n${BLUE}7. Recent Backend Logs${NC}"
echo "================================"
echo "Last 10 backend log entries:"
docker-compose logs --tail=10 backend 2>/dev/null || echo "Unable to fetch backend logs"

# Frontend service check
echo -e "\n${BLUE}8. Frontend Service Check${NC}"
echo "================================"
FRONTEND_LOGS=$(docker-compose logs --tail=5 frontend 2>/dev/null | grep -i error || echo "No recent frontend errors")
echo "$FRONTEND_LOGS"

# API endpoint mapping check
echo -e "\n${BLUE}9. API Endpoint Mapping${NC}"
echo "================================"
echo "Checking for timer endpoints in backend:"
TIMER_ROUTES=$(grep -n "timer" backend/main.go 2>/dev/null | head -5 || echo "Unable to check routes")
echo "$TIMER_ROUTES"

# Performance check
echo -e "\n${BLUE}10. Performance Check${NC}"
echo "================================"
START_TIME=$(date +%s%N)
PERF_TEST=$(test_api "GET" "/api/v1/user/timer/current" "" "Authorization: Bearer $TOKEN")
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
echo "Timer API response time: ${RESPONSE_TIME}ms"

# Summary and recommendations
echo -e "\n${PURPLE}📋 Summary & Recommendations${NC}"
echo "=============================================="

# Check for common issues
if echo "$CURRENT_TIMER" | grep -q "UNAUTHORIZED"; then
    echo -e "${RED}🔴 CRITICAL: Authentication issues detected${NC}"
    echo "   - Check JWT token format and middleware"
fi

if echo "$SCHEMA_CHECK" | grep -q "created_by"; then
    echo -e "${GREEN}✅ Database schema looks good${NC}"
else
    echo -e "${RED}🔴 CRITICAL: Database schema missing required fields${NC}"
    echo "   - Run migration: 004_add_timer_pause_fields.sql"
fi

if [ "$RESPONSE_TIME" -gt 1000 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Slow API response time (${RESPONSE_TIME}ms)${NC}"
fi

# Generate fix suggestions
echo -e "\n${CYAN}🛠️  Suggested Fix Commands:${NC}"
echo "================================"
echo "# Fix database schema:"
echo "docker-compose exec db psql -U user -d main_db -f /tmp/004_add_timer_pause_fields.sql"
echo ""
echo "# Reset accumulated timer seconds:"
echo "docker-compose exec db psql -U user -d main_db -c \"UPDATE users SET timing_accumulated_seconds = 0 WHERE username = 'admin';\""
echo ""
echo "# Clean up incomplete time logs:"
echo "docker-compose exec db psql -U user -d main_db -c \"DELETE FROM task_time_logs WHERE end_time IS NULL AND start_time < NOW() - INTERVAL '1 day';\""

echo -e "\n${GREEN}🎯 Debug complete! Check the output above for issues.${NC}"