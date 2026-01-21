---
description: Generate implementation tasks from design
argument-hint: [spec-name] [--quick]
allowed-tools: [Read, Write, Task, Bash]
---

# /beans:tasks - Task Planning Phase

Generates implementation tasks, delegating to task-planner subagent.

<mandatory>
Delegate ALL task planning to `task-planner` subagent.
</mandatory>

## Determine Active Spec

Read `./specs/.current-spec` or use argument.

## Validate

Check `./specs/$spec/design.md` and `requirements.md` exist.

## Execute Task Planning

```
Task: Create implementation tasks for spec: $spec

Path: ./specs/$spec/
Requirements: [include requirements.md]
Design: [include design.md]

Create POC-first task breakdown:
- Phase 1: Make It Work (POC)
- Phase 2: Refactoring
- Phase 3: Testing
- Phase 4: Quality Gates

Each task MUST include:
- **Do**: Exact steps
- **Files**: Exact file paths
- **Done when**: Success criteria
- **Verify**: Command to verify
- **Commit**: Commit message

Output: ./specs/$spec/tasks.md

subagent_type: task-planner
```

## Update State

Count tasks and update:
```json
{
  "phase": "tasks",
  "totalTasks": <count>,
  "awaitingApproval": true
}
```

## Sync with Beads

Create beads tasks from tasks.md:
```bash
# Parse tasks and create sub-issues
bd list --parent $ISSUE_ID 2>/dev/null || true
```

## Output

```
Tasks complete for '$spec'.
Output: ./specs/$spec/tasks.md
Total tasks: <count>

Next: Run /beans:implement to start execution
Or: Run /beans:loop for autonomous execution
```
