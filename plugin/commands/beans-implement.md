---
description: Execute next open task from beads
argument-hint: [task-id]
allowed-tools: [Read, Write, Edit, Task, Bash]
---

# /beans:implement - Execute Task

Executes the next open task sub-issue.

**Usually called automatically by `/beans`.**

## Get Current Work

```bash
ISSUE_ID=$(cat .beans-current 2>/dev/null)

# Get first open task
TASK_ID=$(bd list --parent "$ISSUE_ID" --status open --json | jq -r '.[0].id')
[ -z "$TASK_ID" ] && echo "All tasks complete!" && exit 0
```

## Get Task Details

```bash
bd show "$TASK_ID"
# Parse Do, Files, Verify, Commit from task comments
```

## Execute

<mandatory>
Delegate to spec-executor:
</mandatory>

```
Task: Execute beads task $TASK_ID

Details: [from bd show]

1. Execute steps
2. Modify only listed files
3. Run verify command
4. Commit with message
5. Output TASK_COMPLETE

subagent_type: spec-executor
```

## After Completion

```bash
bd close "$TASK_ID" --reason "Implemented"
bd comment "$ISSUE_ID" "✓ $TASK_ID complete"
```

Check if more tasks:
```bash
REMAINING=$(bd list --parent "$ISSUE_ID" --status open --json | jq length)
if [ "$REMAINING" -eq 0 ]; then
  bd close "$ISSUE_ID" --reason "All tasks complete"
  rm .beans-current
  echo "🎉 All done!"
fi
```
