---
description: Create implementation tasks as beads sub-issues
argument-hint: [issue-id]
allowed-tools: [Read, Task, Bash]
---

# /beans:tasks - Task Planning Phase

Creates task sub-issues in beads.

**Usually called automatically by `/beans`.**

## Get Current Issue

```bash
ISSUE_ID=$(cat .beans-current 2>/dev/null)
```

## Execute

<mandatory>
Delegate to task-planner:
</mandatory>

```
Task: Break $ISSUE_ID into implementation tasks

Output numbered tasks with:
- Description
- Files to modify
- Verify command
- Commit message

subagent_type: task-planner
```

Create sub-issues:
```bash
for task in TASKS; do
  TASK_ID=$(bd create "Task $N: $desc" -t task --parent "$ISSUE_ID" --json | jq -r '.id')
  bd comment "$TASK_ID" "**Do:** $steps
**Files:** $files
**Verify:** $verify
**Commit:** $commit"
done
```

Update parent:
```bash
bd comment "$ISSUE_ID" "Created $COUNT tasks. Ready to execute."
```
