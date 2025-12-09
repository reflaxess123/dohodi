#!/bin/bash
set -e

# Build Checker Hook - runs after Claude finishes a response
# Checks TypeScript and Python errors in modified repos

# Read session ID from environment if available
session_id="${CLAUDE_SESSION_ID:-default}"
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/${session_id}"

# Exit silently if no cache directory (no files were edited)
if [[ ! -d "$cache_dir" ]]; then
    exit 0
fi

# Read affected repos
if [[ ! -f "$cache_dir/affected-repos.txt" ]]; then
    exit 0
fi

repos=$(cat "$cache_dir/affected-repos.txt" | sort -u)

# Skip if no repos affected
if [[ -z "$repos" ]]; then
    exit 0
fi

# Initialize error collection
all_errors=""
error_count=0
frontend_error_count=0
backend_error_count=0

# Function to run type checks
run_typecheck() {
    local repo="$1"
    local project_root="$CLAUDE_PROJECT_DIR"

    case "$repo" in
        front)
            if [[ -f "$project_root/front/package.json" ]]; then
                cd "$project_root/front"
                if grep -q '"type-check"' package.json 2>/dev/null; then
                    npm run type-check 2>&1 || true
                else
                    npx tsc --noEmit 2>&1 || true
                fi
            fi
            ;;
        back)
            if [[ -f "$project_root/back/.mypy.ini" ]]; then
                cd "$project_root/back"
                poetry run mypy . --config-file .mypy.ini 2>&1 || true
            fi
            ;;
    esac
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 BUILD CHECKER - Verifying TypeScript/Python"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check each repo
for repo in $repos; do
    echo "Checking $repo..."

    errors=$(run_typecheck "$repo" 2>&1 || true)

    if [[ -z "$errors" ]]; then
        echo "  ✓ No errors"
        continue
    fi

    # Count errors based on repo type
    if [[ "$repo" == "front" ]]; then
        # TypeScript errors: "error TS" or "error:"
        repo_error_count=$(echo "$errors" | grep -c "error TS\|^error:" || true)
        frontend_error_count=$((frontend_error_count + repo_error_count))
    else
        # Python errors: "error:"
        repo_error_count=$(echo "$errors" | grep -c "error:" || true)
        backend_error_count=$((backend_error_count + repo_error_count))
    fi

    if [[ $repo_error_count -gt 0 ]]; then
        error_count=$((error_count + repo_error_count))
        all_errors="${all_errors}\n\n=== $repo ($repo_error_count errors) ===\n${errors}"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Report results
if [[ $error_count -eq 0 ]]; then
    echo "✅ BUILD CHECK PASSED"
    echo "No TypeScript/Python errors found."
else
    echo "❌ BUILD CHECK FAILED - $error_count total errors"
    echo ""

    if [[ $frontend_error_count -gt 0 ]]; then
        echo "Frontend: $frontend_error_count errors"
    fi
    if [[ $backend_error_count -gt 0 ]]; then
        echo "Backend: $backend_error_count errors"
    fi
    echo ""

    if [[ $error_count -lt 5 ]]; then
        echo "📋 ERRORS FOUND (please review and fix):"
        echo -e "$all_errors"
    else
        echo "⚠️  MANY ERRORS DETECTED ($error_count total)"
        echo ""
        echo "💡 RECOMMENDATION:"
        echo "Run /build-and-fix command to auto-fix errors"
        echo ""
        echo "First 20 errors preview:"
        echo -e "$all_errors" | head -40
        echo ""
        echo "[... showing first 20 lines only ...]"
    fi

    # Save errors for debugging
    echo -e "$all_errors" > "$cache_dir/last-errors.txt"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
