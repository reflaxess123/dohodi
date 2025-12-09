#!/bin/bash
# Session Init Hook - runs when a new Claude Code session starts
# Checks dev docs status, loads context, sets up environment

set -e

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
dev_active="$project_dir/dev/active"

# Create output for Claude context
output=""

# =============================================================================
# 1. Check for active dev docs (tasks in progress)
# =============================================================================

if [[ -d "$dev_active" ]]; then
    active_tasks=$(find "$dev_active" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)

    if [[ $active_tasks -gt 0 ]]; then
        output+="📋 ACTIVE TASKS DETECTED ($active_tasks)\n\n"

        for task_dir in "$dev_active"/*/; do
            if [[ -d "$task_dir" ]]; then
                task_name=$(basename "$task_dir")
                output+="  📁 $task_name\n"

                # Check for task files
                if [[ -f "${task_dir}${task_name}-tasks.md" ]]; then
                    # Count incomplete tasks
                    incomplete=$(grep -c "^\s*\[ \]" "${task_dir}${task_name}-tasks.md" 2>/dev/null || echo "0")
                    completed=$(grep -c "^\s*\[x\]" "${task_dir}${task_name}-tasks.md" 2>/dev/null || echo "0")
                    output+="     ☑️  Tasks: $completed completed, $incomplete remaining\n"
                fi

                # Check last updated
                if [[ -f "${task_dir}${task_name}-context.md" ]]; then
                    last_modified=$(stat -c %Y "${task_dir}${task_name}-context.md" 2>/dev/null || stat -f %m "${task_dir}${task_name}-context.md" 2>/dev/null || echo "0")
                    now=$(date +%s)
                    hours_ago=$(( (now - last_modified) / 3600 ))
                    if [[ $hours_ago -gt 24 ]]; then
                        output+="     ⚠️  Last updated: ${hours_ago}h ago (stale?)\n"
                    fi
                fi
                output+="\n"
            fi
        done

        output+="💡 Use /dev-docs-update before context reset\n"
        output+="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    fi
fi

# =============================================================================
# 2. Check git status for uncommitted changes
# =============================================================================

if [[ -d "$project_dir/.git" ]]; then
    cd "$project_dir"

    # Count modified files
    modified=$(git status --porcelain 2>/dev/null | grep -c "^ M\|^M " || echo "0")
    untracked=$(git status --porcelain 2>/dev/null | grep -c "^??" || echo "0")
    staged=$(git status --porcelain 2>/dev/null | grep -c "^A \|^M " || echo "0")

    if [[ $modified -gt 0 ]] || [[ $untracked -gt 5 ]]; then
        output+="🔧 GIT STATUS\n"
        output+="  Modified: $modified | Untracked: $untracked | Staged: $staged\n"

        if [[ $modified -gt 10 ]]; then
            output+="  ⚠️  Many uncommitted changes - consider committing\n"
        fi
        output+="\n"
    fi

    # Current branch
    branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    output+="  Branch: $branch\n\n"
fi

# =============================================================================
# 3. Project-specific reminders
# =============================================================================

output+="📌 PROJECT REMINDERS (Nareshka)\n"
output+="  • Backend: FastAPI + SQLAlchemy + DI Container\n"
output+="  • Frontend: React 19 + FSD + React Query v5\n"
output+="  • Use Skills: fastapi-backend-guidelines, react-frontend-guidelines\n"
output+="  • API Generation: npm run api:generate (after backend changes)\n"
output+="\n"

# =============================================================================
# 4. Output context for Claude
# =============================================================================

if [[ -n "$output" ]]; then
    # Format as JSON for hook output
    context=$(echo -e "$output" | sed 's/"/\\"/g' | tr '\n' '\\n' | sed 's/\\n$//')

    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚀 SESSION INITIALIZED\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${context}"
  }
}
EOF
fi

exit 0
