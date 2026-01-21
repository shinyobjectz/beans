---
description: Run research phase for current issue (stores in beads)
argument-hint: [issue-id]
allowed-tools: [Read, Task, Bash]
---

# /beans:research - Research Phase

Runs research and stores findings in beads issue.

**Usually called automatically by `/beans`.**

## Get Current Issue

```bash
ISSUE_ID=$(cat .beans-current 2>/dev/null)
[ -z "$ISSUE_ID" ] && echo "No current issue. Run /beans first." && exit 1
```

## Execute

<mandatory>
Delegate to research-analyst:
</mandatory>

```
Task: Research for issue $ISSUE_ID

subagent_type: research-analyst
```

Store in beads:
```bash
bd comment "$ISSUE_ID" "## Research Findings
$CONTENT"
```
