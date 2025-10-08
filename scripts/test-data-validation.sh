#!/bin/bash

# Data Validation Testing Script
# Tests the data validation functionality

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
ACCESS_TOKEN="${ACCESS_TOKEN}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# API request helper
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    local curl_cmd="curl -s -X $method"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $ACCESS_TOKEN'"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    eval $curl_cmd
}

# Test functions
test_health_metrics() {
    print_header "Testing Health Metrics Endpoint"
    
    local response
    response=$(api_request "GET" "/data-validation/health")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Health metrics endpoint working"
        
        # Check if health data is present
        if echo "$response" | jq -e '.health.status' > /dev/null 2>&1; then
            local status=$(echo "$response" | jq -r '.health.status')
            local score=$(echo "$response" | jq -r '.health.score')
            echo "  Status: $status"
            echo "  Score: $score"
            print_success "Health data structure valid"
        else
            print_warning "Health data structure incomplete"
        fi
    else
        print_error "Health metrics endpoint failed"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    fi
}

test_validation_status() {
    print_header "Testing Validation Status Endpoint"
    
    local response
    response=$(api_request "GET" "/data-validation/status")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Validation status endpoint working"
        
        # Check status structure
        if echo "$response" | jq -e '.status.status' > /dev/null 2>&1; then
            local status=$(echo "$response" | jq -r '.status.status')
            local message=$(echo "$response" | jq -r '.status.message')
            echo "  Status: $status"
            echo "  Message: $message"
            print_success "Status data structure valid"
        else
            print_warning "Status data structure incomplete"
        fi
    else
        print_error "Validation status endpoint failed"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    fi
}

test_quick_validation() {
    print_header "Testing Quick Validation"
    
    local request_data='{"quick": true}'
    local response
    response=$(api_request "POST" "/data-validation/run" "$request_data")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Quick validation working"
        
        # Check response type
        local type=$(echo "$response" | jq -r '.type // "unknown"')
        echo "  Response type: $type"
        
        if [ "$type" = "quick" ]; then
            print_success "Quick validation response structure correct"
        else
            print_warning "Unexpected response type for quick validation"
        fi
    else
        print_error "Quick validation failed"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    fi
}

test_comprehensive_validation() {
    print_header "Testing Comprehensive Validation"
    
    local request_data='{"quick": false}'
    local response
    response=$(api_request "POST" "/data-validation/run" "$request_data")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Comprehensive validation working"
        
        # Check response type
        local type=$(echo "$response" | jq -r '.type // "unknown"')
        echo "  Response type: $type"
        
        if [ "$type" = "comprehensive" ]; then
            print_success "Comprehensive validation response structure correct"
            
            # Check if report structure is present
            if echo "$response" | jq -e '.report.overall_score' > /dev/null 2>&1; then
                local score=$(echo "$response" | jq -r '.report.overall_score')
                local status=$(echo "$response" | jq -r '.report.overall_status')
                echo "  Overall score: $score"
                echo "  Overall status: $status"
                print_success "Validation report structure valid"
            else
                print_warning "Validation report structure incomplete"
            fi
        else
            print_warning "Unexpected response type for comprehensive validation"
        fi
    else
        print_error "Comprehensive validation failed"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    fi
}

test_validation_summary() {
    print_header "Testing Validation Summary Endpoint"
    
    local response
    response=$(api_request "GET" "/data-validation/summary")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Validation summary endpoint working"
        
        # Check summary structure
        if echo "$response" | jq -e '.summary.overall_score' > /dev/null 2>&1; then
            local score=$(echo "$response" | jq -r '.summary.overall_score')
            local checks=$(echo "$response" | jq -r '.summary.total_checks')
            echo "  Overall score: $score"
            echo "  Total checks: $checks"
            print_success "Summary data structure valid"
        else
            print_warning "Summary data structure incomplete"
        fi
    else
        print_error "Validation summary endpoint failed"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    fi
}

test_validation_report() {
    print_header "Testing Validation Report Endpoint"
    
    local response
    response=$(api_request "GET" "/data-validation/report")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_success "Validation report endpoint working"
        
        # Check report structure
        if echo "$response" | jq -e '.report.validation_results' > /dev/null 2>&1; then
            local results_count=$(echo "$response" | jq '.report.validation_results | length')
            echo "  Validation results count: $results_count"
            
            if [ "$results_count" -gt 0 ]; then
                print_success "Validation results present"
                
                # Show first result as example
                local first_check=$(echo "$response" | jq -r '.report.validation_results[0].check_name // "unknown"')
                local first_status=$(echo "$response" | jq -r '.report.validation_results[0].status // "unknown"')
                echo "  First check: $first_check ($first_status)"
            else
                print_warning "No validation results found"
            fi
        else
            print_warning "Report structure incomplete"
        fi
    else
        print_error "Validation report endpoint failed"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    fi
}

# Check dependencies
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed. Please install jq."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed. Please install curl."
        exit 1
    fi
}

# Main execution
main() {
    print_header "Data Validation API Testing"
    
    check_dependencies
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_warning "ACCESS_TOKEN not set. Some tests may fail."
        echo "Please set ACCESS_TOKEN environment variable."
        echo "Example: export ACCESS_TOKEN=\"your_jwt_token_here\""
        echo ""
    fi
    
    echo "Testing against: $BASE_URL"
    echo ""
    
    # Run all tests
    test_health_metrics
    test_validation_status
    test_quick_validation
    test_comprehensive_validation
    test_validation_summary
    test_validation_report
    
    print_header "Testing Summary"
    print_success "Data validation testing completed"
    echo ""
    echo "If you see any errors above, please check:"
    echo "1. Backend service is running"
    echo "2. Database is accessible"
    echo "3. ACCESS_TOKEN is valid"
    echo "4. Data validation routes are properly registered"
}

# Script usage information
usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  BASE_URL       API base URL (default: http://localhost:8080/api/v1)"
    echo "  ACCESS_TOKEN   JWT access token for authentication"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  BASE_URL=http://localhost:8080/api/v1 ACCESS_TOKEN=your_token $0"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac