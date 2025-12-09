#!/bin/bash
# FSD Architecture Import Checker
# Validates that imports follow Feature-Sliced Design layer rules
#
# Layer hierarchy (top to bottom):
#   app → pages → widgets → features → entities → shared
#
# Rules:
#   - Lower layers CANNOT import from higher layers
#   - shared cannot import from ANY app layer
#   - entities cannot import from features, widgets, pages
#   - features cannot import from widgets, pages
#   - widgets cannot import from pages

set -e

FRONTEND_PATH="${1:-front/src}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  FSD Architecture Import Checker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking: $FRONTEND_PATH"
echo ""

violations=0

# Function to check imports
check_layer_imports() {
    local layer="$1"
    local forbidden_pattern="$2"
    local rule_description="$3"

    local layer_path="$FRONTEND_PATH/$layer"
    if [[ ! -d "$layer_path" ]]; then
        return
    fi

    local matches=$(grep -rn "$forbidden_pattern" "$layer_path" --include="*.ts" --include="*.tsx" 2>/dev/null || true)

    if [[ -n "$matches" ]]; then
        echo "❌ VIOLATION in $layer/:"
        echo "   Rule: $rule_description"
        echo ""
        echo "$matches" | while read -r line; do
            echo "   $line"
        done
        echo ""
        ((violations++)) || true
    fi
}

# Check shared layer (cannot import from any app layer)
echo "Checking shared layer..."
check_layer_imports "shared" "from ['\"]@\?/\?(pages\|widgets\|features\|entities)/" "shared cannot import from app layers"
check_layer_imports "shared" "from ['\"]\.\.\/\.\.\/(pages\|widgets\|features\|entities)" "shared cannot import from app layers (relative)"

# Check entities layer (cannot import from features, widgets, pages)
echo "Checking entities layer..."
check_layer_imports "entities" "from ['\"]@\?/\?(pages\|widgets\|features)/" "entities cannot import from higher layers"
check_layer_imports "entities" "from ['\"]\.\.\/\.\.\/(pages\|widgets\|features)" "entities cannot import from higher layers (relative)"

# Check features layer (cannot import from widgets, pages)
echo "Checking features layer..."
check_layer_imports "features" "from ['\"]@\?/\?(pages\|widgets)/" "features cannot import from higher layers"
check_layer_imports "features" "from ['\"]\.\.\/\.\.\/(pages\|widgets)" "features cannot import from higher layers (relative)"

# Check widgets layer (cannot import from pages)
echo "Checking widgets layer..."
check_layer_imports "widgets" "from ['\"]@\?/\?pages/" "widgets cannot import from pages"
check_layer_imports "widgets" "from ['\"]\.\.\/\.\.\/pages" "widgets cannot import from pages (relative)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $violations -eq 0 ]]; then
    echo "✅ FSD CHECK PASSED"
    echo "All imports follow layer hierarchy rules."
else
    echo "❌ FSD CHECK FAILED"
    echo "$violations violation(s) found."
    echo ""
    echo "💡 Fix suggestions:"
    echo "   - Move shared code to appropriate layer"
    echo "   - Use dependency injection"
    echo "   - Create abstractions in lower layers"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $violations
