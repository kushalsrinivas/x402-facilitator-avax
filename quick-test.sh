#!/bin/bash
# Quick A402 Test Script
# Tests basic facilitator endpoints

set -e

echo "🧪 A402 Quick Test Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FACILITATOR_URL=${FACILITATOR_URL:-http://localhost:3402}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Test function
test_endpoint() {
  local name=$1
  local url=$2
  local method=${3:-GET}
  local data=$4

  TOTAL=$((TOTAL + 1))
  echo -n "Testing: $name... "

  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    FAILED=$((FAILED + 1))
    echo "$body"
  fi
  echo ""
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}⚠️  Warning: jq not installed. Install for better output: brew install jq${NC}"
  echo ""
fi

# Check if facilitator is running
echo "Checking facilitator at: $FACILITATOR_URL"
echo ""

# Run tests
test_endpoint "Health Check" "$FACILITATOR_URL/health" "GET"
test_endpoint "Root Endpoint" "$FACILITATOR_URL/" "GET"
test_endpoint "List Tokens" "$FACILITATOR_URL/list" "GET"
test_endpoint "Metrics" "$FACILITATOR_URL/metrics" "GET"

# Print summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED ✓${NC}"
echo -e "Failed: ${RED}$FAILED ✗${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run full integration test: ts-node test-a402.ts"
  echo "  2. Check TESTING_GUIDE.md for more test scenarios"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Some tests failed.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Ensure facilitator is running: cd b402-facilitator && npm run dev"
  echo "  2. Check .env configuration"
  echo "  3. View logs for errors"
  exit 1
fi

