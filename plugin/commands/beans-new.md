---
description: Create new spec with beads issue tracking and start research phase
argument-hint: <name> [goal] [--quick] [--skip-research]
allowed-tools: [Bash, Write, Task, AskUserQuestion]
---

# /beans:new - Create New Spec

Creates a new spec with beads issue tracking and starts the research phase.

## Parse Arguments

From `$ARGUMENTS`, extract:
- **name**: Spec name (required, kebab-case)
- **goal**: Description after name (optional)
- **--quick**: Skip interactive phases, auto-generate all artifacts
- **--skip-research**: Skip research, start with requirements

## Capture Goal

<mandatory>
If no goal provided in arguments, use AskUserQuestion:
"What is the goal for this spec? Describe what you want to build."
</mandatory>

## Initialize

1. Create beads issue:
   ```bash
   ISSUE_ID=$(bd create "$goal" -t feature --json 2>/dev/null | jq -r '.id // empty')
   if [ -z "$ISSUE_ID" ]; then
     ISSUE_ID="$name"
   fi
   ```

2. Create directory:
   ```bash
   mkdir -p ./specs/$name
   echo "$name" > ./specs/.current-spec
   ```

3. Create `.beans-state.json`:
   ```json
   {
     "name": "$name",
     "issueId": "$ISSUE_ID",
     "basePath": "./specs/$name",
     "phase": "research",
     "taskIndex": 0,
     "totalTasks": 0,
     "taskIteration": 1,
     "maxTaskIterations": 5
   }
   ```

4. Create `.progress.md`:
   ```markdown
   # Progress: $name
   
   ## Original Goal
   $goal
   
   ## Beads Issue
   $ISSUE_ID
   
   ## Completed Tasks
   _No tasks completed yet_
   
   ## Current Phase
   research
   ```

5. Update beads issue:
   ```bash
   bd update $ISSUE_ID --status in_progress 2>/dev/null || true
   ```

## Execute Research

<mandatory>
Use the Task tool with `subagent_type: research-analyst` to run research.
</mandatory>

```
Task: Research codebase and external sources for: $goal

Spec: $name
Path: ./specs/$name/

Use ast-grep and repomix for codebase analysis.
Use WebSearch for external research.
Output: ./specs/$name/research.md

subagent_type: research-analyst
```

## After Research

Update state:
```json
{
  "phase": "research",
  "awaitingApproval": true
}
```

## Output

```
Spec '$name' created at ./specs/$name/
Beads issue: $ISSUE_ID

Research phase complete.
Output: ./specs/$name/research.md

Next: Review research.md, then run /beans:requirements
```

<mandatory>
**STOP HERE** unless --quick mode.
Wait for user to run /beans:requirements.
</mandatory>
