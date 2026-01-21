---
description: BEANS - Autonomous development with beads as the single source of truth
argument-hint: ["description" | issue-id | status | --quick]
allowed-tools: [Read, Write, Edit, Task, Bash, AskUserQuestion]
---

# /beans - Autonomous Development

Single command for the entire development lifecycle. **Beads is the single source of truth for all project management.**

## Usage

```bash
/beans                              # List ready issues or continue current
/beans "Add OAuth2 login"           # Full flow - all docs stored in beads
/beans "Add OAuth2 login" --quick   # Skip reviews, auto-execute
/beans issue-abc123                 # Continue specific issue
/beans status                       # Show current progress
```

## Philosophy: Beads as Single Source of Truth

<mandatory>
ALL project artifacts are stored in beads, NOT separate files:
- **Research** → Issue comment
- **Requirements** → Issue description + sub-issues
- **Design** → Issue comment
- **Tasks** → Sub-issues with task type
- **Progress** → Issue comments + status updates

NO separate specs/ directory. Everything lives in beads.
</mandatory>

## Determine Action

Parse `$ARGUMENTS`:

1. **No args** → `bd ready` to show work, continue current if exists
2. **"status"** → Show detailed progress via `bd show`
3. **Quoted description** → Create issue, start workflow
4. **Issue ID** → Continue existing issue
5. **--quick** → Auto-generate everything, execute immediately

## New Feature (quoted description)

### Step 1: Create Beads Issue

```bash
# Create the main feature issue
ISSUE_ID=$(bd create "$description" -t feature --json | jq -r '.id')
bd update "$ISSUE_ID" --status in_progress

# Store as current work
echo "$ISSUE_ID" > .beans-current
```

### Step 2: Research Phase

<mandatory>
Delegate to research-analyst, store findings in beads:
</mandatory>

```
Task: Research for implementing: $description

1. WebSearch for best practices
2. Explore codebase for patterns
3. Assess feasibility

Store your findings - I will add them to the beads issue.

subagent_type: research-analyst
```

After research returns, add to beads:
```bash
bd comment "$ISSUE_ID" "## Research Findings

$RESEARCH_CONTENT

---
Phase: research → requirements"
```

### Step 3: Requirements Phase

<mandatory>
Delegate to product-manager, create requirement sub-issues:
</mandatory>

```
Task: Generate requirements for: $description

Research context: [from previous phase]

Output as structured list:
- FR-1: [requirement]
- FR-2: [requirement]
- NFR-1: [non-functional]

subagent_type: product-manager
```

Create sub-issues for each requirement:
```bash
# For each requirement
bd create "FR-1: $requirement_text" -t task --parent "$ISSUE_ID"
bd create "NFR-1: $nfr_text" -t task --parent "$ISSUE_ID"
```

Update main issue description:
```bash
bd edit "$ISSUE_ID" --description "## Goal
$description

## Requirements
- FR-1: ...
- FR-2: ...

## Status: requirements complete"
```

### Step 4: Design Phase

<mandatory>
Delegate to architect-reviewer, store design in beads:
</mandatory>

```
Task: Create technical design for: $description

Requirements: [from beads issue]

Output:
- Architecture overview
- Key technical decisions
- File changes needed

subagent_type: architect-reviewer
```

Add design to beads:
```bash
bd comment "$ISSUE_ID" "## Technical Design

$DESIGN_CONTENT

### Files to Change
- path/to/file.ts: Add X
- path/to/other.ts: Modify Y

---
Phase: design → tasks"
```

### Step 5: Task Planning

<mandatory>
Delegate to task-planner, create task sub-issues:
</mandatory>

```
Task: Break into implementation tasks

Design: [from beads issue]

Output numbered task list with:
- Clear description
- Files to modify
- Verification command
- Commit message

subagent_type: task-planner
```

Create sub-issues for each task:
```bash
# For each task
TASK_ID=$(bd create "Task 1: $task_description" -t task --parent "$ISSUE_ID" --json | jq -r '.id')

# Add task details as comment
bd comment "$TASK_ID" "**Do:** $steps
**Files:** $files
**Verify:** $verify_command
**Commit:** $commit_message"
```

Update parent with task count:
```bash
bd comment "$ISSUE_ID" "## Implementation Plan

Created $TASK_COUNT tasks. Starting execution.

Tasks: $(bd list --parent $ISSUE_ID --json | jq -r '.[].id' | tr '\n' ' ')"
```

### Step 6: Execution Loop

Get tasks and execute each:
```bash
# Get incomplete tasks
TASKS=$(bd list --parent "$ISSUE_ID" --status open --json | jq -r '.[].id')
```

For each task:

<mandatory>
Delegate to spec-executor:
</mandatory>

```
Task: Execute beads task $TASK_ID

Read task details from beads.
Implement exactly as specified.
Output TASK_COMPLETE when done.

subagent_type: spec-executor
```

After task complete:
```bash
bd close "$TASK_ID" --reason "Implemented"
bd comment "$ISSUE_ID" "✓ Completed: $TASK_ID"
```

Continue until all tasks closed.

### Step 7: Land (Auto-Complete)

When all tasks complete:
```bash
# Final sync
bd sync

# Close main issue
bd close "$ISSUE_ID" --reason "All tasks complete"

# Git
git add -A
git commit -m "feat($ISSUE_ID): $description"
git push

# Cleanup
rm .beans-current

echo "🎉 Complete! Issue $ISSUE_ID closed."
```

## Continue Existing Issue

```bash
# Load issue and show status
bd show "$ISSUE_ID"

# Get open tasks
OPEN_TASKS=$(bd list --parent "$ISSUE_ID" --status open)

# Continue from first open task
```

## Status Display

```bash
bd show "$ISSUE_ID"
bd list --parent "$ISSUE_ID"
```

Shows:
```
Issue: proj-a1b2c3 (in_progress)
"Add OAuth2 login"

Sub-issues:
  ✓ proj-d4e5f6: FR-1: User login endpoint
  ✓ proj-g7h8i9: Task 1: Create auth service
  ○ proj-j0k1l2: Task 2: Add middleware
  ○ proj-m3n4o5: Task 3: Write tests

Progress: 2/4 tasks
```

## Quick Mode

Skip interactive reviews:
1. Research → Requirements → Design → Tasks (no stops)
2. Create all beads sub-issues at once
3. Start execution immediately

## Data Model

```
Feature Issue (proj-abc123)
├── Description: Goal + Requirements summary
├── Comments:
│   ├── Research findings
│   ├── Technical design
│   └── Progress updates
└── Sub-issues:
    ├── FR-1: Requirement (task)
    ├── FR-2: Requirement (task)
    ├── Task 1: Implementation (task)
    ├── Task 2: Implementation (task)
    └── Task 3: Implementation (task)
```

Everything queryable via `bd list`, `bd show`, `bd search`.
