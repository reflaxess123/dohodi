#!/bin/bash
# Validate and Generate Script
# Runs type checks and API generation in sequence
#
# Usage:
#   bash validate-and-generate.sh         # Full validation
#   bash validate-and-generate.sh front   # Frontend only
#   bash validate-and-generate.sh back    # Backend only
#   bash validate-and-generate.sh api     # API generation only

set -e

TARGET="${1:-all}"
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Validate and Generate"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Target: $TARGET"
echo "Project: $PROJECT_ROOT"
echo ""

frontend_errors=0
backend_errors=0
api_errors=0

# Frontend validation
if [[ "$TARGET" == "all" ]] || [[ "$TARGET" == "front" ]]; then
    echo "📦 Frontend TypeScript Check..."
    cd "$PROJECT_ROOT/front"

    if npm run type-check 2>&1; then
        echo "  ✅ Frontend types OK"
    else
        echo "  ❌ Frontend type errors"
        frontend_errors=1
    fi
    echo ""
fi

# Backend validation
if [[ "$TARGET" == "all" ]] || [[ "$TARGET" == "back" ]]; then
    echo "🐍 Backend Type Check (mypy)..."
    cd "$PROJECT_ROOT/back"

    if poetry run mypy . --config-file .mypy.ini 2>&1; then
        echo "  ✅ Backend types OK"
    else
        echo "  ❌ Backend type errors"
        backend_errors=1
    fi

    echo ""
    echo "🔍 Backend Linting (ruff)..."
    if poetry run ruff check . 2>&1; then
        echo "  ✅ Linting OK"
    else
        echo "  ⚠️  Linting issues (run: poetry run ruff check . --fix)"
    fi
    echo ""
fi

# API generation
if [[ "$TARGET" == "all" ]] || [[ "$TARGET" == "api" ]]; then
    echo "🔄 API Client Generation (Orval)..."
    cd "$PROJECT_ROOT/front"

    if npm run api:generate 2>&1; then
        echo "  ✅ API client generated"
    else
        echo "  ❌ API generation failed"
        api_errors=1
    fi
    echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

total_errors=$((frontend_errors + backend_errors + api_errors))

if [[ $total_errors -eq 0 ]]; then
    echo "✅ ALL CHECKS PASSED"
else
    echo "❌ SOME CHECKS FAILED"
    [[ $frontend_errors -gt 0 ]] && echo "  - Frontend: FAILED"
    [[ $backend_errors -gt 0 ]] && echo "  - Backend: FAILED"
    [[ $api_errors -gt 0 ]] && echo "  - API Generation: FAILED"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $total_errors
