#!/bin/bash
#
# beans-loop - Autonomous development loop with context management
#
# Features:
#   - Automatic checkpoint at configurable context threshold
#   - Beads integration for state persistence across compactions
#   - Auto-resume from beads issue on context restart
#
# Usage:
#   beans-loop [issue-id | "description"] [options]
#
# Options:
#   --max-iterations N    Maximum iterations (default: 50)
#   --checkpoint-at N     Checkpoint every N iterations (default: 5)
#   --quick               Skip interactive phases
#   --resume              Resume from last checkpoint
#   -h, --help            Show help
#
# Examples:
#   beans-loop "Add OAuth login"         # New feature
#   beans-loop task-abc123               # Continue existing issue
#   beans-loop --resume                  # Resume from checkpoint
#   beans-loop task-abc123 --checkpoint-at 3  # Checkpoint more frequently

set -e

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

MAX_ITERATIONS=50
CHECKPOINT_INTERVAL=5  # Checkpoint every N iterations (~50% context per batch)
QUICK_MODE=false
RESUME_MODE=false
ISSUE_ID=""
DESCRIPTION=""
PAUSE_BETWEEN=2

BEANS_DIR=".beans"
CHECKPOINT_FILE="$BEANS_DIR/checkpoint.json"
PROGRESS_FILE="$BEANS_DIR/loop-progress.md"

# ═══════════════════════════════════════════════════════════════════════════════
# ARGUMENT PARSING
# ═══════════════════════════════════════════════════════════════════════════════

while [[ $# -gt 0 ]]; do
    case $1 in
        --max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --checkpoint-at)
            CHECKPOINT_INTERVAL="$2"
            shift 2
            ;;
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --resume)
            RESUME_MODE=true
            shift
            ;;
        --pause)
            PAUSE_BETWEEN="$2"
            shift 2
            ;;
        -h|--help)
            cat << 'EOF'
beans-loop - Autonomous development loop with context management

Usage: beans-loop [issue-id | "description"] [options]

Options:
  --max-iterations N    Maximum iterations (default: 50)
  --checkpoint-at N     Checkpoint every N iterations (default: 5)
  --quick               Skip interactive phases
  --resume              Resume from last checkpoint
  --pause N             Seconds between iterations (default: 2)
  -h, --help            Show this help

Context Management:
  The loop automatically checkpoints progress to beads every N iterations.
  When context is compacted, the next iteration reads from beads to resume.
  
  Checkpoint saves:
  - Current phase and task index
  - Iteration count and timestamp
  - Progress summary as beads comment

Examples:
  beans-loop "Add OAuth login"              # New feature
  beans-loop task-abc123                    # Continue existing issue
  beans-loop --resume                       # Resume from checkpoint
  beans-loop task-abc123 --checkpoint-at 3  # Checkpoint every 3 iterations
EOF
            exit 0
            ;;
        *)
            # Check if it looks like an issue ID (contains hyphen or starts with known prefixes)
            if [[ "$1" =~ ^[a-z]+-[a-z0-9]+$ ]] || [[ "$1" =~ ^(task|bug|feat|epic)- ]]; then
                ISSUE_ID="$1"
            else
                DESCRIPTION="$1"
            fi
            shift
            ;;
    esac
done

# ═══════════════════════════════════════════════════════════════════════════════
# PREREQUISITES
# ═══════════════════════════════════════════════════════════════════════════════

if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: claude command not found${NC}"
    echo "Install Claude Code CLI first"
    exit 1
fi

if ! command -v bd &> /dev/null; then
    echo -e "${RED}Error: bd (beads) command not found${NC}"
    echo "Install: curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash"
    exit 1
fi

mkdir -p "$BEANS_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

save_checkpoint() {
    local iteration=$1
    local phase=$2
    local task_index=$3
    local total_tasks=$4
    local summary=$5
    
    cat > "$CHECKPOINT_FILE" << EOF
{
  "issue_id": "$ISSUE_ID",
  "iteration": $iteration,
  "phase": "$phase",
  "task_index": $task_index,
  "total_tasks": $total_tasks,
  "timestamp": "$(date -Iseconds)",
  "summary": "$summary"
}
EOF
    
    # Also save to beads as comment for persistence
    if [[ -n "$ISSUE_ID" ]]; then
        bd comment "$ISSUE_ID" "## Checkpoint (Iteration $iteration)

**Phase:** $phase
**Tasks:** $task_index / $total_tasks
**Time:** $(date)

### Summary
$summary

---
*Auto-checkpoint for context continuity*" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Checkpoint saved (iteration $iteration)${NC}"
}

load_checkpoint() {
    if [[ -f "$CHECKPOINT_FILE" ]]; then
        ISSUE_ID=$(jq -r '.issue_id // ""' "$CHECKPOINT_FILE" 2>/dev/null || echo "")
        ITERATION=$(jq -r '.iteration // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
        PHASE=$(jq -r '.phase // "unknown"' "$CHECKPOINT_FILE" 2>/dev/null || echo "unknown")
        TASK_INDEX=$(jq -r '.task_index // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
        TOTAL_TASKS=$(jq -r '.total_tasks // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
        SUMMARY=$(jq -r '.summary // ""' "$CHECKPOINT_FILE" 2>/dev/null || echo "")
        return 0
    fi
    return 1
}

get_beads_context() {
    local issue_id=$1
    local context=""
    
    # Get issue details
    context+="## Issue: $issue_id\n"
    context+="$(bd show "$issue_id" 2>/dev/null || echo "Issue not found")\n\n"
    
    # Get recent comments (last 3)
    context+="## Recent Progress\n"
    context+="$(bd comments "$issue_id" --limit 3 2>/dev/null || echo "No comments")\n\n"
    
    # Get sub-tasks status
    context+="## Tasks\n"
    context+="$(bd list --parent "$issue_id" 2>/dev/null || echo "No sub-tasks")\n"
    
    echo -e "$context"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ISSUE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

create_or_get_issue() {
    # Resume mode - load from checkpoint
    if [[ "$RESUME_MODE" == "true" ]]; then
        if load_checkpoint; then
            echo -e "${CYAN}Resuming from checkpoint...${NC}"
            echo -e "  Issue: ${BOLD}$ISSUE_ID${NC}"
            echo -e "  Phase: $PHASE"
            echo -e "  Iteration: $ITERATION"
            return 0
        else
            echo -e "${RED}No checkpoint found to resume${NC}"
            exit 1
        fi
    fi
    
    # Existing issue ID provided
    if [[ -n "$ISSUE_ID" ]]; then
        if bd show "$ISSUE_ID" &>/dev/null; then
            echo -e "${GREEN}✓ Using existing issue: $ISSUE_ID${NC}"
            ITERATION=0
            PHASE="continue"
            return 0
        else
            echo -e "${RED}Issue $ISSUE_ID not found${NC}"
            exit 1
        fi
    fi
    
    # New description - create issue
    if [[ -n "$DESCRIPTION" ]]; then
        ISSUE_ID=$(bd create "$DESCRIPTION" -t feature --json 2>/dev/null | jq -r '.id' || echo "")
        if [[ -z "$ISSUE_ID" || "$ISSUE_ID" == "null" ]]; then
            echo -e "${RED}Failed to create issue${NC}"
            exit 1
        fi
        bd update "$ISSUE_ID" --status in_progress 2>/dev/null || true
        echo -e "${GREEN}✓ Created issue: $ISSUE_ID${NC}"
        ITERATION=0
        PHASE="new"
        return 0
    fi
    
    # No input - check for current work or show ready issues
    if [[ -f "$BEANS_DIR/.current" ]]; then
        ISSUE_ID=$(cat "$BEANS_DIR/.current")
        echo -e "${CYAN}Continuing current issue: $ISSUE_ID${NC}"
        ITERATION=0
        PHASE="continue"
        return 0
    fi
    
    echo -e "${YELLOW}No issue specified. Ready issues:${NC}"
    bd ready 2>/dev/null || echo "No ready issues"
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# CLAUDE INVOCATION
# ═══════════════════════════════════════════════════════════════════════════════

build_prompt() {
    local iteration=$1
    local checkpoint_due=$2
    local beads_context=$(get_beads_context "$ISSUE_ID")
    
    local quick_flag=""
    [[ "$QUICK_MODE" == "true" ]] && quick_flag=" --quick"
    
    cat << EOF
# BEANS Autonomous Loop - Iteration $iteration

## Context from Beads (Source of Truth)
$beads_context

## Current State
- Issue: $ISSUE_ID
- Phase: $PHASE
- Iteration: $iteration of $MAX_ITERATIONS
- Checkpoint due: $checkpoint_due

## Instructions

1. **Read the beads issue** to understand current state
2. **Execute the appropriate phase**:
   - If new/continue: Run \`/beans $ISSUE_ID$quick_flag\`
   - If specific phase needed: Run the phase command

3. **Progress tracking**:
   - Update beads with progress: \`bd comment $ISSUE_ID "progress..."\`
   - Close completed sub-tasks: \`bd close <task-id>\`

4. **Completion signals**:
   - If all tasks complete: Output \`<complete>All tasks done</complete>\`
   - If checkpoint needed: Output \`<checkpoint>Summary of progress</checkpoint>\`
   - If context running low: Output \`<compact>Ready for context compression</compact>\`

5. **On context compression**:
   - Save state to beads before compacting
   - The next iteration will resume from beads

Focus on making progress. Beads is your memory across context windows.
EOF
}

invoke_claude() {
    local prompt="$1"
    local output_file="$BEANS_DIR/iteration-output.txt"
    
    echo "$prompt" | claude -p \
        --dangerously-skip-permissions \
        --model opus \
        2>&1 | tee "$output_file"
    
    # Return the output for parsing
    cat "$output_file"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}${BOLD}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🫘 BEANS Loop - Autonomous Development with Context Memory   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Initialize
create_or_get_issue
echo "$ISSUE_ID" > "$BEANS_DIR/.current"

# Create branch if not exists
BRANCH_NAME="beans/$ISSUE_ID"
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME" 2>/dev/null || true
echo -e "${DIM}Branch: $BRANCH_NAME${NC}"
echo ""

# Initialize progress file
echo "# BEANS Loop Progress - $ISSUE_ID" > "$PROGRESS_FILE"
echo "Started: $(date)" >> "$PROGRESS_FILE"
echo "" >> "$PROGRESS_FILE"

# Main loop
BATCH_ITERATION=0

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    ITERATION=$((ITERATION + 1))
    BATCH_ITERATION=$((BATCH_ITERATION + 1))
    
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Iteration $ITERATION / $MAX_ITERATIONS${NC} ${DIM}(batch: $BATCH_ITERATION)${NC}"
    echo ""
    
    # Check if checkpoint is due
    CHECKPOINT_DUE="no"
    if [[ $BATCH_ITERATION -ge $CHECKPOINT_INTERVAL ]]; then
        CHECKPOINT_DUE="yes (iteration $BATCH_ITERATION of $CHECKPOINT_INTERVAL batch)"
    fi
    
    # Build and run prompt
    PROMPT=$(build_prompt $ITERATION "$CHECKPOINT_DUE")
    echo -e "${YELLOW}→ Invoking Claude...${NC}"
    OUTPUT=$(invoke_claude "$PROMPT")
    
    # Log to progress file
    echo "## Iteration $ITERATION - $(date)" >> "$PROGRESS_FILE"
    echo '```' >> "$PROGRESS_FILE"
    echo "$OUTPUT" | head -100 >> "$PROGRESS_FILE"
    echo '```' >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
    
    # Parse output for signals
    if echo "$OUTPUT" | grep -q "<complete>"; then
        echo -e "${GREEN}${BOLD}✅ ALL TASKS COMPLETE!${NC}"
        
        # Final commit and sync
        if [[ -n "$(git status --porcelain)" ]]; then
            git add -A
            git commit -m "feat($ISSUE_ID): Complete - $(echo "$DESCRIPTION" | head -c 50)" || true
        fi
        bd sync 2>/dev/null || true
        bd close "$ISSUE_ID" --reason "Completed by beans-loop" 2>/dev/null || true
        rm -f "$BEANS_DIR/.current" "$CHECKPOINT_FILE"
        
        echo ""
        echo "Issue: $ISSUE_ID"
        echo "Branch: $BRANCH_NAME"
        echo "Iterations: $ITERATION"
        echo ""
        echo "Next: gh pr create --base main"
        exit 0
    fi
    
    if echo "$OUTPUT" | grep -q "<compact>"; then
        echo -e "${CYAN}→ Context compression requested${NC}"
        
        # Extract summary from checkpoint tag if present
        SUMMARY=$(echo "$OUTPUT" | grep -oP '(?<=<checkpoint>).*(?=</checkpoint>)' || echo "Checkpoint at iteration $ITERATION")
        
        # Get current task state from beads
        TASK_INDEX=$(bd list --parent "$ISSUE_ID" --status completed --json 2>/dev/null | jq 'length' || echo "0")
        TOTAL_TASKS=$(bd list --parent "$ISSUE_ID" --json 2>/dev/null | jq 'length' || echo "0")
        
        # Save checkpoint
        save_checkpoint $ITERATION "$PHASE" "$TASK_INDEX" "$TOTAL_TASKS" "$SUMMARY"
        
        # Commit current work
        if [[ -n "$(git status --porcelain)" ]]; then
            git add -A
            git commit -m "wip($ISSUE_ID): Checkpoint at iteration $ITERATION" || true
        fi
        
        echo -e "${YELLOW}Compacting context and restarting...${NC}"
        BATCH_ITERATION=0  # Reset batch counter
        sleep $PAUSE_BETWEEN
        continue
    fi
    
    # Regular checkpoint at interval
    if [[ $BATCH_ITERATION -ge $CHECKPOINT_INTERVAL ]]; then
        echo -e "${CYAN}→ Scheduled checkpoint${NC}"
        
        SUMMARY="Iteration $ITERATION checkpoint"
        TASK_INDEX=$(bd list --parent "$ISSUE_ID" --status completed --json 2>/dev/null | jq 'length' || echo "0")
        TOTAL_TASKS=$(bd list --parent "$ISSUE_ID" --json 2>/dev/null | jq 'length' || echo "0")
        
        save_checkpoint $ITERATION "$PHASE" "$TASK_INDEX" "$TOTAL_TASKS" "$SUMMARY"
        
        # Commit checkpoint
        if [[ -n "$(git status --porcelain)" ]]; then
            git add -A
            git commit -m "wip($ISSUE_ID): Iteration $ITERATION" || true
        fi
        
        BATCH_ITERATION=0  # Reset for next batch
    fi
    
    # Brief pause
    [[ $PAUSE_BETWEEN -gt 0 ]] && sleep $PAUSE_BETWEEN
done

echo -e "${YELLOW}⚠ Max iterations ($MAX_ITERATIONS) reached${NC}"
echo ""
echo "Resume with: beans-loop --resume"
echo "Or continue: beans-loop $ISSUE_ID"
exit 1
