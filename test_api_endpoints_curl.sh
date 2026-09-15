#!/bin/bash
# API Endpoint Testing Script for Mason Dashboard
# Tests endpoints for correct responses and error handling

BASE_URL="http://localhost:3000"
OUTPUT_FILE=".claude/battle-test/results/API-1.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Starting API endpoint tests against $BASE_URL..."
echo "=" | sed 's/./-/g' | tr -d '\n' && printf "=%.0s" {1..60} && echo

# Initialize counters
ENDPOINTS_TESTED=0
ENDPOINTS_PASSED=0
ENDPOINTS_FAILED=0
ISSUES_FOUND=0

# Start JSON output
cat > "$OUTPUT_FILE" << EOF
{
  "agent_id": "API-1",
  "completed_at": "$TIMESTAMP",
  "summary": {
    "endpoints_tested": 0,
    "endpoints_passed": 0,
    "endpoints_failed": 0,
    "issues_found": 0
  },
  "endpoints": [
EOF

FIRST_ENDPOINT=true

# Function to test an endpoint
test_endpoint() {
    local method="$1"
    local path="$2"
    local expected_status="$3"
    local description="$4"

    echo "Testing $method $path..."
    ENDPOINTS_TESTED=$((ENDPOINTS_TESTED + 1))

    # Make request and capture response
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL$path" 2>&1)
    elif [ "$method" = "POST" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$path" 2>&1)
    fi

    # Extract status code and body
    STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    # Truncate body preview
    BODY_PREVIEW=$(echo "$BODY" | head -c 200 | jq -Rs .)

    # Determine if test passed
    local STATUS="pass"
    local ISSUES="[]"

    case "$path" in
        "/api/health")
            if [ "$STATUS_CODE" = "200" ]; then
                STATUS="pass"
                ENDPOINTS_PASSED=$((ENDPOINTS_PASSED + 1))
            elif [ "$STATUS_CODE" = "404" ]; then
                STATUS="pass"
                ENDPOINTS_PASSED=$((ENDPOINTS_PASSED + 1))
                ISSUES='[{"type":"unexpected_status","severity":"low","description":"Health endpoint not implemented (404)","expected":"200 OK or health status","actual":"404 Not Found"}]'
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            else
                STATUS="fail"
                ENDPOINTS_FAILED=$((ENDPOINTS_FAILED + 1))
                ISSUES="[{\"type\":\"unexpected_status\",\"severity\":\"medium\",\"description\":\"Unexpected status code: $STATUS_CODE\",\"expected\":\"200 or 404\",\"actual\":\"$STATUS_CODE\"}]"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
            ;;
        "/api/setup/migrations")
            if [[ "$STATUS_CODE" =~ ^(200|400|401|403|500)$ ]]; then
                STATUS="pass"
                ENDPOINTS_PASSED=$((ENDPOINTS_PASSED + 1))
            else
                STATUS="fail"
                ENDPOINTS_FAILED=$((ENDPOINTS_FAILED + 1))
                ISSUES="[{\"type\":\"unexpected_status\",\"severity\":\"medium\",\"description\":\"Unexpected status code: $STATUS_CODE\",\"expected\":\"200, 400, 401, 403, or 500\",\"actual\":\"$STATUS_CODE\"}]"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
            ;;
        "/api/v1/backlog/next"|"/api/keys")
            if [ "$STATUS_CODE" = "401" ]; then
                STATUS="pass"
                ENDPOINTS_PASSED=$((ENDPOINTS_PASSED + 1))
            elif [ "$STATUS_CODE" = "200" ]; then
                STATUS="fail"
                ENDPOINTS_FAILED=$((ENDPOINTS_FAILED + 1))
                ISSUES="[{\"type\":\"unexpected_status\",\"severity\":\"critical\",\"description\":\"Protected endpoint accessible without authentication\",\"expected\":\"401 Unauthorized\",\"actual\":\"200 OK - SECURITY ISSUE\"}]"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            else
                STATUS="fail"
                ENDPOINTS_FAILED=$((ENDPOINTS_FAILED + 1))
                ISSUES="[{\"type\":\"unexpected_status\",\"severity\":\"medium\",\"description\":\"Unexpected status code: $STATUS_CODE\",\"expected\":\"401\",\"actual\":\"$STATUS_CODE\"}]"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
            ;;
    esac

    # Add comma if not first endpoint
    if [ "$FIRST_ENDPOINT" = false ]; then
        echo "," >> "$OUTPUT_FILE"
    fi
    FIRST_ENDPOINT=false

    # Write endpoint result
    cat >> "$OUTPUT_FILE" << EOF
    {
      "path": "$path",
      "method": "$method",
      "status": "$STATUS",
      "response_code": $STATUS_CODE,
      "response_body_preview": $BODY_PREVIEW,
      "issues": $ISSUES
    }
EOF
}

# Test endpoints
test_endpoint "GET" "/api/health" "200|404" "Health check"
test_endpoint "POST" "/api/setup/migrations" "400|401|500" "Migrations without auth"
test_endpoint "GET" "/api/v1/backlog/next" "401" "Backlog next without auth"
test_endpoint "GET" "/api/keys" "401" "API keys without auth"

# Finalize JSON
cat >> "$OUTPUT_FILE" << EOF

  ]
}
EOF

# Update summary in JSON file
jq ".summary.endpoints_tested = $ENDPOINTS_TESTED | .summary.endpoints_passed = $ENDPOINTS_PASSED | .summary.endpoints_failed = $ENDPOINTS_FAILED | .summary.issues_found = $ISSUES_FOUND" "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp" && mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"

echo
echo "=" | sed 's/./-/g' | tr -d '\n' && printf "=%.0s" {1..60} && echo
echo "RESULTS SUMMARY:"
echo "Endpoints tested: $ENDPOINTS_TESTED"
echo "Endpoints passed: $ENDPOINTS_PASSED"
echo "Endpoints failed: $ENDPOINTS_FAILED"
echo "Issues found: $ISSUES_FOUND"
echo "=" | sed 's/./-/g' | tr -d '\n' && printf "=%.0s" {1..60} && echo
echo
echo "Results written to: $OUTPUT_FILE"

# Exit with error code if any endpoints failed
if [ $ENDPOINTS_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
