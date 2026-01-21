---
description: BEANS - Autonomous development with automatic beads issue management
argument-hint: ["description" | issue-id | status | --quick | --phase <name>]
allowed-tools: [Read, Write, Edit, Task, Bash, AskUserQuestion]
---

# /beans - Autonomous Development

Single command for the entire development lifecycle. **Automatically manages beads issues.**

## Usage

```bash
/beans                              # List ready issues or continue current
/beans "Add OAuth2 login"           # Full flow with auto beads management
/beans "Add OAuth2 login" --quick   # Skip reviews, auto-execute all
/beans issue-abc123                 # Continue specific issue
/beans status                       # Show current progress
/beans --phase research             # Jump to specific phase
```

## Automatic Beads Management

<mandatory>
ALL beads issue management happens automatically. You MUST:
1. Create issue when starting new work
2. Update status as phases progress
3. Add comments for significant milestones
4. Close issue when complete
</mandatory>

## Determine Action

Parse `$ARGUMENTS`:

1. **No args or "list"** → Show ready issues and current work
2. **"status"** → Show detailed progress
3. **Quoted description** → Start new spec (auto-create issue)
4. **Issue ID pattern** → Continue existing work
5. **--quick** → Auto-generate all phases, execute immediately
6. **--phase <name>** → Jump to specific phase

## List / Continue Current

```bash
# Show ready issues
bd ready

# Check for current work
CURRENT=$(cat ./specs/.current-spec 2>/dev/null)
if [ -n "$CURRENT" ]; then
  echo "Current: $CURRENT"
  # Auto-continue current work
fi
```

If current spec exists, automatically continue from where it left off.

## New Feature (quoted description)

### Step 1: Create Beads Issue

```bash
# Create issue and capture ID
ISSUE_ID=$(bd create "$description" -t feature --json 2>/dev/null | jq -r '.id // empty')

# Fallback if bd fails
if [ -z "$ISSUE_ID" ]; then
  ISSUE_ID=$(echo "$description" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | cut -c1-30)
fi

# Set in progress
bd update "$ISSUE_ID" --status in_progress 2>/dev/null || true

echo "Created issue: $ISSUE_ID"
```

### Step 2: Initialize Spec

```bash
mkdir -p ./specs/$ISSUE_ID
echo "$ISSUE_ID" > ./specs/.current-spec
```

Create `.beans-state.json`:
```json
{
  "issueId": "$ISSUE_ID",
  "name": "$ISSUE_ID",
  "description": "$description",
  "basePath": "./specs/$ISSUE_ID",
  "phase": "research",
  "taskIndex": 0,
  "totalTasks": 0,
  "taskIteration": 1,
  "maxTaskIterations": 5
}
```

Create `.progress.md`:
```markdown
# Progress: $ISSUE_ID

## Goal
$description

## Beads Issue
$ISSUE_ID (in_progress)

## Phase
research

## Completed
_None yet_
```

### Step 3: Research Phase

<mandatory>
Delegate to research-analyst subagent:
</mandatory>

```
Task: Research for implementing: $description

Issue: $ISSUE_ID
Path: ./specs/$ISSUE_ID/

1. WebSearch for best practices and patterns
2. Explore codebase for existing patterns
3. Assess feasibility
4. Output: ./specs/$ISSUE_ID/research.md

subagent_type: research-analyst
```

After research, update beads:
```bash
bd comment "$ISSUE_ID" "Research complete - see specs/$ISSUE_ID/research.md" 2>/dev/null || true
```

Update state: `"phase": "requirements"`

### Step 4: Requirements Phase

<mandatory>
Delegate to product-manager subagent:
</mandatory>

```
Task: Generate requirements for: $description

Issue: $ISSUE_ID
Path: ./specs/$ISSUE_ID/
Research: [include research.md]

Output: ./specs/$ISSUE_ID/requirements.md

subagent_type: product-manager
```

Update state: `"phase": "design"`

### Step 5: Design Phase

<mandatory>
Delegate to architect-reviewer subagent:
</mandatory>

```
Task: Create technical design for: $description

Issue: $ISSUE_ID
Path: ./specs/$ISSUE_ID/
Requirements: [include requirements.md]

Output: ./specs/$ISSUE_ID/design.md

subagent_type: architect-reviewer
```

Update state: `"phase": "tasks"`

### Step 6: Task Planning

<mandatory>
Delegate to task-planner subagent:
</mandatory>

```
Task: Break down into implementation tasks

Issue: $ISSUE_ID
Path: ./specs/$ISSUE_ID/
Design: [include design.md]

Output: ./specs/$ISSUE_ID/tasks.md

subagent_type: task-planner
```

Count tasks and update state:
```json
{
  "phase": "execution",
  "totalTasks": <count>,
  "taskIndex": 0
}
```

Update beads with task count:
```bash
bd comment "$ISSUE_ID" "Planning complete - $totalTasks tasks generated" 2>/dev/null || true
```

### Step 7: Execution Loop

<mandatory>
For each task, delegate to spec-executor:
</mandatory>

```
Task: Execute task $taskIndex for $ISSUE_ID

Path: ./specs/$ISSUE_ID/
Task: [current task from tasks.md]

1. Execute the Do section
2. Verify with Verify command
3. Commit with Commit message
4. Mark [x] in tasks.md
5. Output TASK_COMPLETE

subagent_type: spec-executor
```

After each task:
```bash
bd comment "$ISSUE_ID" "Completed task $taskIndex/$totalTasks" 2>/dev/null || true
```

Increment taskIndex and continue until all complete.

### Step 8: Land (Auto-Close)

When all tasks complete:

```bash
# Final sync
bd sync 2>/dev/null || true

# Close the issue
bd close "$ISSUE_ID" --reason "Implemented - all $totalTasks tasks complete" 2>/dev/null || true

# Git operations
git add -A
git commit -m "feat($ISSUE_ID): $description"
git push

echo "🎉 Complete! Issue $ISSUE_ID closed."
```

Clean up state:
```bash
rm ./specs/.current-spec
```

## Continue Existing Issue

If argument matches issue ID pattern:

```bash
# Load issue
bd show "$ISSUE_ID"

# Find spec
if [ -d "./specs/$ISSUE_ID" ]; then
  echo "$ISSUE_ID" > ./specs/.current-spec
  # Read state and resume from current phase
fi
```

Resume from whatever phase is in `.beans-state.json`.

## Quick Mode (--quick)

Skip interactive reviews between phases:
1. Research → Requirements → Design → Tasks (no stops)
2. Start execution immediately
3. Still creates and manages beads issue

## Phase Jump (--phase)

Force jump to specific phase:
```bash
/beans --phase design    # Skip to design
/beans --phase tasks     # Skip to task planning
/beans --phase execute   # Skip to execution
```

## Status Display

Show current state:
```
Issue: $ISSUE_ID (in_progress)
Phase: execution
Tasks: 3/8 complete
Current: 2.1 Add error handling

Next: Continuing task execution...
```

## Output Summary

After any action, show:
```
Issue: $ISSUE_ID
Phase: $phase
Progress: $completed/$total tasks

[If more work]: Continuing...
[If complete]: 🎉 All done! Issue closed.
```
