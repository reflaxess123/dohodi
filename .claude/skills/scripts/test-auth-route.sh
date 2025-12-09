#!/bin/bash
# Test Authenticated Route Script
# Usage: bash test-auth-route.sh <endpoint> [method] [body]
#
# Example:
#   bash test-auth-route.sh /api/v2/auth/me
#   bash test-auth-route.sh /api/v2/users POST '{"name":"test"}'

set -e

API_BASE="${API_BASE:-http://localhost:4000}"
ENDPOINT="${1:-/api/v2/auth/me}"
METHOD="${2:-GET}"
BODY="${3:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Testing Authenticated Route"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Endpoint: $METHOD $API_BASE$ENDPOINT"
echo ""

# Step 1: Get auth token (adjust based on your auth flow)
echo "Step 1: Getting auth token..."

# Check if we have a test token in environment
if [[ -n "$TEST_AUTH_TOKEN" ]]; then
    TOKEN="$TEST_AUTH_TOKEN"
    echo "  Using TEST_AUTH_TOKEN from environment"
else
    # Try to login with test credentials
    if [[ -n "$TEST_EMAIL" ]] && [[ -n "$TEST_PASSWORD" ]]; then
        echo "  Logging in with test credentials..."
        LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/v2/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
            -c /tmp/cookies.txt)

        if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
            TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
            echo "  ✓ Login successful"
        else
            echo "  ✗ Login failed: $LOGIN_RESPONSE"
            exit 1
        fi
    else
        echo "  ⚠️  No auth credentials. Set TEST_AUTH_TOKEN or TEST_EMAIL/TEST_PASSWORD"
        echo "  Testing without authentication..."
        TOKEN=""
    fi
fi

echo ""

# Step 2: Make the request
echo "Step 2: Making request..."

CURL_OPTS="-s -w '\n\nHTTP_CODE:%{http_code}'"

if [[ -n "$TOKEN" ]]; then
    CURL_OPTS="$CURL_OPTS -H 'Authorization: Bearer $TOKEN'"
fi

if [[ "$METHOD" == "POST" ]] || [[ "$METHOD" == "PUT" ]] || [[ "$METHOD" == "PATCH" ]]; then
    CURL_OPTS="$CURL_OPTS -H 'Content-Type: application/json'"
    if [[ -n "$BODY" ]]; then
        CURL_OPTS="$CURL_OPTS -d '$BODY'"
    fi
fi

# Execute request
RESPONSE=$(eval "curl $CURL_OPTS -X $METHOD '$API_BASE$ENDPOINT'" 2>&1)

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
BODY_RESPONSE=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RESPONSE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Status interpretation
case "$HTTP_CODE" in
    200) echo "Status: ✅ 200 OK" ;;
    201) echo "Status: ✅ 201 Created" ;;
    204) echo "Status: ✅ 204 No Content" ;;
    400) echo "Status: ❌ 400 Bad Request" ;;
    401) echo "Status: ❌ 401 Unauthorized - Check authentication" ;;
    403) echo "Status: ❌ 403 Forbidden - Check permissions" ;;
    404) echo "Status: ❌ 404 Not Found" ;;
    500) echo "Status: ❌ 500 Internal Server Error" ;;
    *) echo "Status: ⚠️  $HTTP_CODE" ;;
esac

echo ""
echo "Response Body:"
echo "$BODY_RESPONSE" | jq . 2>/dev/null || echo "$BODY_RESPONSE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
