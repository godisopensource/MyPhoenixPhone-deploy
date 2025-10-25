#!/bin/bash

# Performance Test Runner
# Runs all k6 performance tests sequentially
# Usage: ./run-all-performance-tests.sh

set -e

echo "🚀 MyPhoenixPhone Performance Test Suite"
echo "=========================================="
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-test-api-key-12345}"
RESULTS_DIR="test/performance/results"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo "Install k6: brew install k6"
    exit 1
fi

echo -e "${GREEN}✓ k6 found: $(k6 version | head -n 1)${NC}"

# Check if server is running
if ! curl -s -f -o /dev/null "${BASE_URL}/health"; then
    echo -e "${YELLOW}⚠️  Backend server not responding at ${BASE_URL}${NC}"
    echo "Please start the server: npm run start:dev"
    exit 1
fi

echo -e "${GREEN}✓ Backend server is running${NC}"
echo ""

# Ensure results directory exists
mkdir -p "${RESULTS_DIR}"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo "📊 Running: ${test_name}"
    echo "----------------------------------------"
    
    if k6 run -e BASE_URL="${BASE_URL}" -e API_KEY="${API_KEY}" "${test_file}"; then
        echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ ${test_name} FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    
    echo ""
    
    # Wait between tests to avoid interference
    if [ "$test_file" != "test/performance/workers-benchmark.js" ]; then
        echo "Waiting 10 seconds before next test..."
        sleep 10
        echo ""
    fi
}

# Run tests
echo "Starting performance tests..."
echo ""

run_test "test/performance/eligibility-api.js" "Eligibility API Test"
run_test "test/performance/consent-api.js" "Consent API Test"
run_test "test/performance/verification-api.js" "Verification API Test"
run_test "test/performance/workers-benchmark.js" "Workers Benchmark Test"

# Summary
echo "=========================================="
echo "📈 Performance Test Suite Complete"
echo "=========================================="
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""
echo "📁 Results saved in: ${RESULTS_DIR}/"
echo ""

# Exit with failure if any tests failed
if [ ${TESTS_FAILED} -gt 0 ]; then
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All tests passed${NC}"
    exit 0
fi
