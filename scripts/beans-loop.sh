#!/bin/bash
#
# beans-loop - Autonomous development loop
#
# Repeatedly invokes Claude Code until all tasks are complete.
# This enables fully autonomous spec-driven development.
#
# Usage:
#   beans-loop [spec-name] [--max-iterations N] [--quick]
#
# Examples:
#   beans-loop                    # Continue current spec
#   beans-loop my-feature         # Work on specific spec
#   beans-loop --max-iterations 20
#   beans-loop my-feature --quick # Start fresh with quick mode
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Defaults
MAX_ITERATIONS=50
SPEC_NAME=""
QUICK_MODE=false
ITERATION=0
PAUSE_BETWEEN=2

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --pause)
            PAUSE_BETWEEN="$2"
            shift 2
            ;;
        -h|--help)
            echo "beans-loop - Autonomous development loop"
            echo ""
            echo "Usage: beans-loop [spec-name] [options]"
            echo ""
            echo "Options:"
            echo "  --max-iterations N  Maximum loop iterations (default: 50)"
            echo "  --quick             Start with quick mode (auto-generate all phases)"
            echo "  --pause N           Seconds between iterations (default: 2)"
            echo "  -h, --help          Show this help"
            echo ""
            echo "Examples:"
            echo "  beans-loop                        # Continue current spec"
            echo "  beans-loop user-auth              # Work on specific spec"
            echo "  beans-loop \"Add OAuth\" --quick   # New spec with quick mode"
            exit 0
            ;;
        *)
            SPEC_NAME="$1"
            shift
            ;;
    esac
done

# Check for Claude Code CLI
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: claude command not found${NC}"
    echo "Install Claude Code CLI or ensure it's in PATH"
    exit 1
fi

# Determine spec
if [[ -z "$SPEC_NAME" ]]; then
    if [[ -f "./specs/.current-spec" ]]; then
        SPEC_NAME=$(cat ./specs/.current-spec)
        echo -e "${CYAN}Using current spec: ${BOLD}$SPEC_NAME${NC}"
    else
        echo -e "${RED}No spec specified and no current spec found${NC}"
        echo "Usage: beans-loop <spec-name> or create one with /beans:new"
        exit 1
    fi
fi

SPEC_PATH="./specs/$SPEC_NAME"
STATE_FILE="$SPEC_PATH/.beans-state.json"

# Check if spec exists or we're creating new
if [[ ! -d "$SPEC_PATH" ]] && [[ "$QUICK_MODE" != "true" ]]; then
    echo -e "${RED}Spec '$SPEC_NAME' not found at $SPEC_PATH${NC}"
    echo "Create with: /beans:new $SPEC_NAME"
    exit 1
fi

echo -e "${BLUE}${BOLD}🫘 BEANS Loop Starting${NC}"
echo -e "Spec: ${CYAN}$SPEC_NAME${NC}"
echo -e "Max iterations: ${CYAN}$MAX_ITERATIONS${NC}"
echo ""

# Function to get current phase and task from state
get_state() {
    if [[ -f "$STATE_FILE" ]]; then
        PHASE=$(jq -r '.phase // "unknown"' "$STATE_FILE" 2>/dev/null || echo "unknown")
        TASK_INDEX=$(jq -r '.taskIndex // 0' "$STATE_FILE" 2>/dev/null || echo "0")
        TOTAL_TASKS=$(jq -r '.totalTasks // 0' "$STATE_FILE" 2>/dev/null || echo "0")
    else
        PHASE="new"
        TASK_INDEX=0
        TOTAL_TASKS=0
    fi
}

# Function to check if complete
is_complete() {
    get_state
    if [[ "$PHASE" == "complete" ]] || [[ "$TASK_INDEX" -ge "$TOTAL_TASKS" && "$TOTAL_TASKS" -gt 0 ]]; then
        return 0
    fi
    return 1
}

# Function to determine next command
get_next_command() {
    get_state
    
    case "$PHASE" in
        "new"|"")
            if [[ "$QUICK_MODE" == "true" ]]; then
                echo "/beans:new $SPEC_NAME \"$SPEC_NAME\" --quick"
            else
                echo "/beans:new $SPEC_NAME"
            fi
            ;;
        "research")
            echo "/beans:requirements"
            ;;
        "requirements")
            echo "/beans:design"
            ;;
        "design")
            echo "/beans:tasks"
            ;;
        "tasks"|"execution")
            echo "/beans:implement"
            ;;
        *)
            echo "/beans:implement"
            ;;
    esac
}

# Function to invoke Claude
invoke_claude() {
    local cmd="$1"
    local prompt="Continue working on spec '$SPEC_NAME'. Run: $cmd"
    
    echo -e "${YELLOW}Invoking Claude: ${NC}$cmd"
    
    # Invoke Claude Code with the command
    # Using --print to capture output, --dangerously-skip-permissions for automation
    claude --print --dangerously-skip-permissions "$prompt" 2>&1 || true
}

# Main loop
echo -e "${GREEN}Starting autonomous loop...${NC}"
echo ""

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    ITERATION=$((ITERATION + 1))
    
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Iteration $ITERATION / $MAX_ITERATIONS${NC}"
    
    # Check if complete
    if is_complete; then
        echo -e "${GREEN}${BOLD}✅ ALL TASKS COMPLETE!${NC}"
        echo ""
        echo -e "Spec: $SPEC_NAME"
        echo -e "Iterations: $ITERATION"
        
        # Final beads sync
        bd sync 2>/dev/null || true
        
        exit 0
    fi
    
    # Get state and next command
    get_state
    NEXT_CMD=$(get_next_command)
    
    echo -e "Phase: ${CYAN}$PHASE${NC}"
    if [[ "$TOTAL_TASKS" -gt 0 ]]; then
        echo -e "Tasks: ${CYAN}$TASK_INDEX / $TOTAL_TASKS${NC}"
    fi
    echo ""
    
    # Invoke Claude
    invoke_claude "$NEXT_CMD"
    
    # Brief pause between iterations
    if [[ $PAUSE_BETWEEN -gt 0 ]]; then
        sleep $PAUSE_BETWEEN
    fi
done

echo -e "${YELLOW}⚠ Max iterations ($MAX_ITERATIONS) reached${NC}"
echo "Resume with: beans-loop $SPEC_NAME"
exit 1
