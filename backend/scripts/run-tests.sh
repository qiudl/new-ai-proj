#!/bin/bash

# Google Calendar Integration - Test Runner Script
# This script runs all tests and generates coverage reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COVERAGE_DIR="${PROJECT_ROOT}/coverage"
COVERAGE_FILE="${COVERAGE_DIR}/coverage.out"
COVERAGE_HTML="${COVERAGE_DIR}/coverage.html"
TEST_RESULTS="${COVERAGE_DIR}/test-results.json"

# Test environment variables
export GOOGLE_CLIENT_ID="test_client_id_for_testing"
export GOOGLE_CLIENT_SECRET="test_client_secret_for_testing"
export GOOGLE_REDIRECT_URL="http://localhost:8080/api/auth/google/callback"
export GOOGLE_CALENDAR_SCOPES="https://www.googleapis.com/auth/calendar"
export ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

echo -e "${BLUE}🧪 Google Calendar Integration Test Runner${NC}"
echo "========================================"

# Create coverage directory
mkdir -p "${COVERAGE_DIR}"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to run tests with coverage
run_tests() {
    local package_path="$1"
    local test_name="$2"
    
    echo -e "${YELLOW}Running $test_name tests...${NC}"
    
    if go test -v -race -coverprofile="${COVERAGE_FILE}.tmp" "${package_path}" 2>&1 | tee "${COVERAGE_DIR}/${test_name,,}.log"; then
        echo -e "${GREEN}✅ $test_name tests passed${NC}"
        
        # Append to main coverage file
        if [ -f "${COVERAGE_FILE}.tmp" ]; then
            if [ ! -f "${COVERAGE_FILE}" ]; then
                cp "${COVERAGE_FILE}.tmp" "${COVERAGE_FILE}"
            else
                tail -n +2 "${COVERAGE_FILE}.tmp" >> "${COVERAGE_FILE}"
            fi
            rm "${COVERAGE_FILE}.tmp"
        fi
        
        return 0
    else
        echo -e "${RED}❌ $test_name tests failed${NC}"
        return 1
    fi
}

# Function to run benchmarks
run_benchmarks() {
    local package_path="$1"
    local bench_name="$2"
    
    echo -e "${YELLOW}Running $bench_name benchmarks...${NC}"
    
    if go test -bench=. -benchmem "${package_path}" 2>&1 | tee "${COVERAGE_DIR}/${bench_name,,}-bench.log"; then
        echo -e "${GREEN}✅ $bench_name benchmarks completed${NC}"
        return 0
    else
        echo -e "${RED}❌ $bench_name benchmarks failed${NC}"
        return 1
    fi
}

# Initialize coverage file
echo "mode: atomic" > "${COVERAGE_FILE}"

print_section "Unit Tests"

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Run utils tests
if run_tests "./utils" "Utils"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Run services tests
if run_tests "./services" "Services"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

print_section "Integration Tests"

# Run integration tests
if run_tests "./tests" "Integration"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

print_section "Benchmarks"

# Run benchmarks
run_benchmarks "./utils" "Utils"
run_benchmarks "./services" "Services"
run_benchmarks "./tests" "Integration"

print_section "Coverage Analysis"

# Generate coverage report
if [ -f "${COVERAGE_FILE}" ]; then
    echo -e "${YELLOW}Generating coverage report...${NC}"
    
    # Generate HTML coverage report
    go tool cover -html="${COVERAGE_FILE}" -o "${COVERAGE_HTML}"
    
    # Calculate coverage percentage
    COVERAGE_PERCENT=$(go tool cover -func="${COVERAGE_FILE}" | grep total | awk '{print $3}' | sed 's/%//')
    
    echo -e "${BLUE}📊 Coverage Report Generated${NC}"
    echo "HTML Report: ${COVERAGE_HTML}"
    echo "Coverage: ${COVERAGE_PERCENT}%"
    
    # Check if coverage meets requirements (90% target)
    if (( $(echo "$COVERAGE_PERCENT >= 90" | bc -l) )); then
        echo -e "${GREEN}✅ Coverage target met (≥90%)${NC}"
        COVERAGE_STATUS="PASS"
    elif (( $(echo "$COVERAGE_PERCENT >= 80" | bc -l) )); then
        echo -e "${YELLOW}⚠️  Coverage acceptable (≥80%) but below target (90%)${NC}"
        COVERAGE_STATUS="WARNING"
    else
        echo -e "${RED}❌ Coverage below minimum threshold (80%)${NC}"
        COVERAGE_STATUS="FAIL"
    fi
    
    # Generate detailed coverage breakdown
    echo -e "\n${BLUE}📋 Coverage Breakdown${NC}"
    go tool cover -func="${COVERAGE_FILE}" | grep -E "(utils|services|handlers)" | sort -k3 -nr
    
else
    echo -e "${RED}❌ No coverage data generated${NC}"
    COVERAGE_PERCENT="0"
    COVERAGE_STATUS="FAIL"
fi

print_section "Test Performance Analysis"

# Analyze benchmark results
if ls "${COVERAGE_DIR}"/*-bench.log 1> /dev/null 2>&1; then
    echo -e "${YELLOW}Analyzing benchmark results...${NC}"
    
    echo "Top 10 slowest operations:"
    grep -h "Benchmark" "${COVERAGE_DIR}"/*-bench.log | \
        awk '{print $1, $3}' | \
        sort -k2 -nr | \
        head -10
    
    echo -e "\nMemory allocation analysis:"
    grep -h "Benchmark" "${COVERAGE_DIR}"/*-bench.log | \
        awk '{if($5!="") print $1, $4, $5}' | \
        sort -k3 -nr | \
        head -5
fi

print_section "Test Summary"

# Generate JSON test results
cat > "${TEST_RESULTS}" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "tests_passed": ${TESTS_PASSED},
    "tests_failed": ${TESTS_FAILED},
    "coverage_percent": ${COVERAGE_PERCENT},
    "coverage_status": "${COVERAGE_STATUS}",
    "reports": {
        "coverage_html": "${COVERAGE_HTML}",
        "coverage_file": "${COVERAGE_FILE}",
        "test_logs": "${COVERAGE_DIR}"
    }
}
EOF

# Print summary
echo "========================================"
echo -e "${BLUE}📈 Test Execution Summary${NC}"
echo "========================================"
echo "Tests Passed: ${TESTS_PASSED}"
echo "Tests Failed: ${TESTS_FAILED}"
echo "Coverage: ${COVERAGE_PERCENT}%"
echo "Status: ${COVERAGE_STATUS}"
echo "Reports: ${COVERAGE_DIR}"

# Clean up environment variables
unset GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URL GOOGLE_CALENDAR_SCOPES ENCRYPTION_KEY

# Exit with appropriate code
if [ ${TESTS_FAILED} -eq 0 ] && [ "${COVERAGE_STATUS}" != "FAIL" ]; then
    echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}💥 Some tests failed or coverage is insufficient${NC}"
    exit 1
fi