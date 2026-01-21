---
description: Execute current task from tasks.md
argument-hint: [--max-iterations 5]
allowed-tools: [Read, Write, Edit, Task, Bash]
---

# /beans:implement - Execute Tasks

Executes the current task, delegating to spec-executor subagent.

<mandatory>
**YOU ARE A COORDINATOR.** Delegate task execution to `spec-executor` subagent.
</mandatory>

## Determine Active Spec

Read `./specs/.current-spec` to get spec name.

## Validate

1. Check `./specs/$spec/tasks.md` exists
2. Read `.beans-state.json` for current task index

## Parse Current Task

Read tasks.md and find task at `taskIndex` (0-based).

Task format:
```
- [ ] X.Y Task description
  - **Do**: Steps
  - **Files**: Files to modify
  - **Done when**: Success criteria
  - **Verify**: Verification command
  - **Commit**: Commit message
```

## Check Completion

If `taskIndex >= totalTasks`:
1. All tasks complete
2. Output: `ALL_TASKS_COMPLETE`
3. Update beads: `bd close $ISSUE_ID --reason "Implemented"`
4. STOP

## Execute Task

<mandatory>
Delegate to spec-executor:
</mandatory>

```
Task: Execute task $taskIndex for spec $spec

Path: ./specs/$spec/
Task index: $taskIndex

Current task:
[Full task block from tasks.md]

Instructions:
1. Execute Do section exactly
2. Only modify Files listed
3. Verify with Verify command
4. Commit with Commit message
5. Mark task [x] in tasks.md
6. Update .progress.md
7. Output TASK_COMPLETE when done

subagent_type: spec-executor
```

## After Task

If TASK_COMPLETE received:
1. Increment taskIndex in `.beans-state.json`
2. Reset taskIteration to 1
3. Update beads: `bd comment $ISSUE_ID "Completed task $taskIndex"`

If no completion signal:
1. Increment taskIteration
2. If > maxTaskIterations: error "Max retries reached"
3. Otherwise: retry

## Output

```
Task $taskIndex complete for '$spec'.
Progress: $completed/$total tasks

Next task: [description]
Run /beans:implement to continue
Or: Run /beans:loop for autonomous execution
```
