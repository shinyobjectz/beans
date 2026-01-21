#!/bin/bash
#
# pre-compact.sh - Save beads context before context compression
#
# This hook runs before Claude compacts context, ensuring:
# 1. Current issue state is saved to beads
# 2. Checkpoint file is updated
# 3. Git work is committed
#

BEANS_DIR=".beans"
CURRENT_FILE="$BEANS_DIR/.current"
CHECKPOINT_FILE="$BEANS_DIR/checkpoint.json"

# Only proceed if we have a current issue
if [[ ! -f "$CURRENT_FILE" ]]; then
    exit 0
fi

ISSUE_ID=$(cat "$CURRENT_FILE")
if [[ -z "$ISSUE_ID" ]]; then
    exit 0
fi

# Get current state
TASK_INDEX=$(bd list --parent "$ISSUE_ID" --status completed --json 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
TOTAL_TASKS=$(bd list --parent "$ISSUE_ID" --json 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

# Read existing checkpoint for iteration count
ITERATION=0
if [[ -f "$CHECKPOINT_FILE" ]]; then
    ITERATION=$(jq -r '.iteration // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
fi

# Save checkpoint
mkdir -p "$BEANS_DIR"
cat > "$CHECKPOINT_FILE" << EOF
{
  "issue_id": "$ISSUE_ID",
  "iteration": $ITERATION,
  "phase": "compact",
  "task_index": $TASK_INDEX,
  "total_tasks": $TOTAL_TASKS,
  "timestamp": "$(date -Iseconds)",
  "reason": "pre-compact hook"
}
EOF

# Add comment to beads for persistence
bd comment "$ISSUE_ID" "## Pre-Compact Checkpoint

**Tasks:** $TASK_INDEX / $TOTAL_TASKS complete
**Time:** $(date)

Context being compacted. Resume will read from this issue.

---
*Auto-saved by PreCompact hook*" 2>/dev/null || true

# Commit any uncommitted work
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    git add -A 2>/dev/null || true
    git commit -m "wip($ISSUE_ID): Pre-compact checkpoint" --no-verify 2>/dev/null || true
fi

# Sync beads
bd sync 2>/dev/null || true

exit 0
