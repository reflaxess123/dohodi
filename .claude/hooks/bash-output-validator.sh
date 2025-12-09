#!/bin/bash
# Bash Output Validator Hook - runs after Bash tool executions
# Validates output, logs dangerous commands, detects errors

set -e

# Read input from stdin
input=$(cat)

# Extract command and result
command=$(echo "$input" | jq -r '.tool_input.command // empty')
result=$(echo "$input" | jq -r '.tool_result.output // empty' 2>/dev/null || echo "")
exit_code=$(echo "$input" | jq -r '.tool_result.exit_code // 0' 2>/dev/null || echo "0")
session_id=$(echo "$input" | jq -r '.session_id // empty')

# Skip if no command
if [[ -z "$command" ]]; then
    exit 0
fi

# Cache directory for logging
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/${session_id:-default}"
mkdir -p "$cache_dir"

# =============================================================================
# 1. Log potentially dangerous commands
# =============================================================================

dangerous_patterns=(
    "rm "
    "rmdir"
    "chmod"
    "chown"
    "sudo"
    "git reset"
    "git clean"
    "git push"
    "DROP TABLE"
    "DROP DATABASE"
    "DELETE FROM"
    "TRUNCATE"
    "npm publish"
    "pip install"
    "poetry add"
)

for pattern in "${dangerous_patterns[@]}"; do
    if [[ "$command" == *"$pattern"* ]]; then
        echo "$(date +%s):DANGEROUS:$command" >> "$cache_dir/bash-audit.log"
        break
    fi
done

# =============================================================================
# 2. Detect common error patterns in output
# =============================================================================

error_detected=false
error_message=""

# Check for common error indicators
if [[ "$result" == *"error:"* ]] || [[ "$result" == *"Error:"* ]] || [[ "$result" == *"ERROR"* ]]; then
    error_detected=true
    error_message="Error detected in command output"
fi

if [[ "$result" == *"Permission denied"* ]]; then
    error_detected=true
    error_message="Permission denied error"
fi

if [[ "$result" == *"command not found"* ]] || [[ "$result" == *"not recognized"* ]]; then
    error_detected=true
    error_message="Command not found"
fi

if [[ "$result" == *"ENOENT"* ]] || [[ "$result" == *"No such file"* ]]; then
    error_detected=true
    error_message="File not found error"
fi

if [[ "$result" == *"ECONNREFUSED"* ]] || [[ "$result" == *"Connection refused"* ]]; then
    error_detected=true
    error_message="Connection refused - service may be down"
fi

# =============================================================================
# 3. Track npm/pip installations for review
# =============================================================================

if [[ "$command" == *"npm install"* ]] || [[ "$command" == *"npm add"* ]]; then
    # Extract package name
    package=$(echo "$command" | grep -oP '(npm install|npm add)\s+\K\S+' || echo "unknown")
    echo "$(date +%s):NPM_INSTALL:$package" >> "$cache_dir/dependency-changes.log"
fi

if [[ "$command" == *"poetry add"* ]] || [[ "$command" == *"pip install"* ]]; then
    package=$(echo "$command" | grep -oP '(poetry add|pip install)\s+\K\S+' || echo "unknown")
    echo "$(date +%s):PIP_INSTALL:$package" >> "$cache_dir/dependency-changes.log"
fi

# =============================================================================
# 4. Output validation result
# =============================================================================

if [[ "$error_detected" == "true" ]]; then
    # Log the error
    echo "$(date +%s):ERROR:$command:$error_message" >> "$cache_dir/bash-errors.log"

    # Output warning to Claude (non-blocking)
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "systemMessage": "⚠️ Bash Warning: $error_message. Review the output and handle appropriately."
  }
}
EOF
fi

exit 0
