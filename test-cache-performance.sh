#!/bin/bash

# Cache Performance Test Script
# This script tests the cache implementation and compares performance

set -e

echo "🚀 Starting Cache Performance Test..."

# Configuration
BACKEND_URL="http://localhost:8080"
API_ENDPOINT="/api/tasks"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to measure API response time
measure_api_response() {
    local url="$1"
    local description="$2"
    local iterations=${3:-5}
    
    echo -e "${BLUE}Testing: $description${NC}"
    
    local total_time=0
    local cache_hits=0
    
    for i in $(seq 1 $iterations); do
        # Make request and capture timing and headers
        response=$(curl -w "%{time_total},%{http_code}" -s -H "Accept: application/json" "$url" -D /tmp/headers_$i.txt)
        
        # Extract timing and status code
        time_total=$(echo "$response" | tail -1 | cut -d',' -f1)
        http_code=$(echo "$response" | tail -1 | cut -d',' -f2)
        
        # Check cache status
        cache_status=$(grep -i "x-cache-status" /tmp/headers_$i.txt | cut -d':' -f2 | tr -d ' \r\n' || echo "UNKNOWN")
        
        if [ "$cache_status" = "HIT" ]; then
            cache_hits=$((cache_hits + 1))
        fi
        
        # Convert to milliseconds
        time_ms=$(echo "$time_total * 1000" | bc -l)
        total_time=$(echo "$total_time + $time_ms" | bc -l)
        
        echo "  Request $i: ${time_ms}ms (${cache_status})"
        
        # Small delay between requests
        sleep 0.1
    done
    
    # Calculate average
    avg_time=$(echo "scale=2; $total_time / $iterations" | bc -l)
    cache_hit_ratio=$(echo "scale=2; $cache_hits * 100 / $iterations" | bc -l)
    
    echo -e "${GREEN}  Average: ${avg_time}ms, Cache Hit Ratio: ${cache_hit_ratio}%${NC}"
    echo ""
    
    # Cleanup
    rm -f /tmp/headers_*.txt
}

# Function to get cache statistics
get_cache_stats() {
    echo -e "${YELLOW}📊 Cache Statistics:${NC}"
    
    stats=$(curl -s "$BACKEND_URL/api/cache/stats" 2>/dev/null || echo '{"data":{}}')
    
    if echo "$stats" | jq -e '.data' > /dev/null 2>&1; then
        echo "$stats" | jq '.data'
    else
        echo "Cache stats not available (backend may not be running)"
    fi
    echo ""
}

# Function to clear cache
clear_cache() {
    echo -e "${YELLOW}🧹 Clearing cache...${NC}"
    
    response=$(curl -s -X DELETE "$BACKEND_URL/api/cache/clear" 2>/dev/null || echo '{"success":false}')
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✅ Cache cleared successfully${NC}"
    else
        echo -e "${RED}❌ Failed to clear cache (backend may not be running)${NC}"
    fi
    echo ""
}

# Function to warm up cache
warm_up_cache() {
    echo -e "${YELLOW}🔥 Warming up cache...${NC}"
    
    # Make a few requests to populate cache
    for i in {1..3}; do
        curl -s "$BACKEND_URL$API_ENDPOINT?page=$i&page_size=20" > /dev/null 2>&1
        echo "  Warmed page $i"
    done
    echo ""
}

# Function to check if backend is running
check_backend() {
    echo -e "${BLUE}🔍 Checking backend availability...${NC}"
    
    if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not running${NC}"
        echo "Please start the backend server first:"
        echo "  cd backend && go run main_with_cache.go"
        return 1
    fi
    echo ""
}

# Function to test different scenarios
test_scenarios() {
    echo -e "${YELLOW}🧪 Testing Different Scenarios...${NC}"
    
    # Test 1: Cold cache (first requests)
    echo -e "${BLUE}Scenario 1: Cold Cache Performance${NC}"
    clear_cache
    measure_api_response "$BACKEND_URL$API_ENDPOINT?page=1&page_size=20" "Cold cache - First page" 3
    
    # Test 2: Warm cache (repeated requests)
    echo -e "${BLUE}Scenario 2: Warm Cache Performance${NC}"
    measure_api_response "$BACKEND_URL$API_ENDPOINT?page=1&page_size=20" "Warm cache - Same page" 5
    
    # Test 3: Different pages (cache misses)
    echo -e "${BLUE}Scenario 3: Different Pages (Cache Misses)${NC}"
    for page in {2..4}; do
        measure_api_response "$BACKEND_URL$API_ENDPOINT?page=$page&page_size=20" "Page $page (first time)" 1
    done
    
    # Test 4: Repeated access to cached pages
    echo -e "${BLUE}Scenario 4: Mixed Cache Hits and Misses${NC}"
    for page in {1..3}; do
        measure_api_response "$BACKEND_URL$API_ENDPOINT?page=$page&page_size=20" "Page $page (cached)" 2
    done
    
    # Test 5: Cache disabled
    echo -e "${BLUE}Scenario 5: Cache Disabled${NC}"
    measure_api_response "$BACKEND_URL$API_ENDPOINT?page=1&page_size=20&cache=false" "Cache disabled" 3
    
    # Test 6: Large page sizes
    echo -e "${BLUE}Scenario 6: Large Page Sizes${NC}"
    measure_api_response "$BACKEND_URL$API_ENDPOINT?page=1&page_size=100" "Large page size (100)" 3
}

# Function to run load test
run_load_test() {
    echo -e "${YELLOW}⚡ Running Load Test...${NC}"
    
    # Clear cache first
    clear_cache
    
    echo "Testing concurrent requests (10 concurrent for 30 seconds)..."
    
    # Use Apache Bench if available
    if command -v ab > /dev/null 2>&1; then
        echo "Using Apache Bench (ab)..."
        ab -n 100 -c 10 -H "Accept: application/json" "$BACKEND_URL$API_ENDPOINT?page=1&page_size=20"
    elif command -v curl > /dev/null 2>&1; then
        echo "Using curl (sequential)..."
        start_time=$(date +%s)
        
        for i in {1..20}; do
            response_time=$(curl -w "%{time_total}" -s -o /dev/null "$BACKEND_URL$API_ENDPOINT?page=1&page_size=20")
            echo "Request $i: $(echo "$response_time * 1000" | bc -l)ms"
        done
        
        end_time=$(date +%s)
        total_time=$((end_time - start_time))
        echo "Total time: ${total_time}s"
    else
        echo "No load testing tools available (ab or curl)"
    fi
    
    echo ""
}

# Function to analyze results
analyze_results() {
    echo -e "${YELLOW}📈 Performance Analysis Summary${NC}"
    
    echo "=== Key Findings ==="
    echo "1. Cold cache requests take longer (database query required)"
    echo "2. Warm cache requests should be significantly faster"
    echo "3. Cache hit ratio improves with repeated requests"
    echo "4. Large page sizes may not benefit as much from caching"
    echo ""
    
    echo "=== Recommendations ==="
    echo "1. Monitor cache hit ratios in production"
    echo "2. Adjust cache TTL based on data update frequency"
    echo "3. Consider implementing cache warming for popular queries"
    echo "4. Use cache selectively for expensive queries"
    echo ""
}

# Function to show help
show_help() {
    echo "Cache Performance Test Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --scenarios       Run all test scenarios (default)"
    echo "  --load-test      Run load test with concurrent requests"
    echo "  --stats          Show current cache statistics"
    echo "  --clear          Clear cache and exit"
    echo "  --warm           Warm up cache and exit"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all scenarios"
    echo "  $0 --load-test        # Run load test only"
    echo "  $0 --stats           # Show cache stats"
    echo "  $0 --clear           # Clear cache"
    echo ""
}

# Main execution
main() {
    echo -e "${GREEN}🎯 Cache Performance Test Suite${NC}"
    echo -e "${GREEN}===================================${NC}"
    echo ""
    
    # Check if backend is running
    if ! check_backend; then
        exit 1
    fi
    
    case "${1:-scenarios}" in
        "--scenarios"|"scenarios"|"")
            test_scenarios
            get_cache_stats
            analyze_results
            ;;
        "--load-test"|"load-test")
            run_load_test
            get_cache_stats
            ;;
        "--stats"|"stats")
            get_cache_stats
            ;;
        "--clear"|"clear")
            clear_cache
            ;;
        "--warm"|"warm")
            warm_up_cache
            get_cache_stats
            ;;
        "--help"|"help")
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Cache performance testing completed!${NC}"
    
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo "1. Compare cache hit/miss performance"
    echo "2. Monitor cache statistics in production"
    echo "3. Adjust TTL based on data update patterns"
    echo "4. Consider Redis for distributed caching"
    echo ""
}

# Parse arguments and run
main "$@"