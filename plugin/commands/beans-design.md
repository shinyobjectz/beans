---
description: Generate technical design (stores in beads)
argument-hint: [issue-id]
allowed-tools: [Read, Task, Bash]
---

# /beans:design - Design Phase

Creates technical design and stores in beads issue.

**Usually called automatically by `/beans`.**

## Get Current Issue

```bash
ISSUE_ID=$(cat .beans-current 2>/dev/null)
```

## Execute

<mandatory>
Delegate to architect-reviewer:
</mandatory>

```
Task: Create technical design for $ISSUE_ID

subagent_type: architect-reviewer
```

Store in beads:
```bash
bd comment "$ISSUE_ID" "## Technical Design
$CONTENT"
```
